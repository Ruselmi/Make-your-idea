import { GoogleGenAI, Modality } from "@google/genai";
import { AppConfig, ScriptPlan, MusicTrack, DurationStep } from './types';
import { robustJsonParse, pcmToWavBytes } from './utils';
import { secureFetch } from './network'; 

// --- GEMINI SERVICE ---
const getClient = (config?: AppConfig) => {
  // Prioritize User API Key, then Env Var
  const key = config?.userApiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API_KEY not found. Please enter it in Settings -> API.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// --- GENERIC OPENAI-COMPATIBLE FETCH (ChatGPT / DeepSeek) ---
const fetchOpenAICompatible = async (
    endpoint: string, 
    model: string, 
    apiKey: string, 
    systemPrompt: string, 
    userPrompt: string,
    temperature: number = 0.7
): Promise<string> => {
    if (!apiKey) throw new Error("API Key required for this provider.");
    
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: temperature,
            response_format: { type: "json_object" } 
        })
    });
    
    if (!res.ok) throw new Error(`Provider Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
};

// --- WIKIPEDIA SERVICE ---
export const fetchWiki = async (query: string): Promise<{title: string, extract: string} | null> => {
    try {
        const url = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        const res = await secureFetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            title: data.title,
            extract: data.extract
        };
    } catch (e) {
        return null;
    }
};

// --- BATCH VARIATION SERVICE ---
export const fetchBatchVariations = async (baseTopic: string, count: number, logFn: (msg: string) => void, config?: AppConfig): Promise<string[]> => {
    logFn(`🔄 Merancang ${count} variasi topik untuk "${baseTopic}"...`);
    try {
        // Only using Gemini for batch logic to keep it simple, or fallback to simple loop
        const ai = getClient(config);
        const prompt = `
            Topik Utama: "${baseTopic}".
            Tugas: Buat daftar ${count} sub-topik spesifik dan berbeda yang menarik untuk video pendek.
            Bahasa: Indonesia.
            Output JSON: { "topics": ["Topik 1", "Topik 2", ...] }
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                temperature: config?.aiTemperature || 0.7
            }
        });

        const json = robustJsonParse(response.text || "{}");
        if (json && Array.isArray(json.topics)) {
            return json.topics.slice(0, count);
        }
        throw new Error("Invalid Format");
    } catch (e) {
        return Array.from({length: count}, (_, i) => `${baseTopic} Bagian ${i+1}`);
    }
};

// --- NEW MUSIC SEARCH SERVICE ---
export const searchItunesLibrary = async (query: string): Promise<MusicTrack[]> => {
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`;
        const res = await secureFetch(url);
        const data = await res.json();
        return data.results.map((item: any) => ({
            info: {
                trackName: item.trackName,
                artistName: item.artistName,
                previewUrl: item.previewUrl,
                artworkUrl100: item.artworkUrl100
            }
        }));
    } catch (e) {
        console.error("iTunes Search Error", e);
        return [];
    }
}

export const fetchScript = async (
  topic: string, 
  config: AppConfig, 
  durationConfig: DurationStep, 
  logFn: (msg: string) => void,
  contextData?: string 
): Promise<ScriptPlan> => {
  
  // LOGIC DUAL SYSTEM (DURATION vs SCENE COUNT)
  let targetScenes = 5; 
  let constraintText = "";

  if (config.planningStrategy === 'total_duration') {
      targetScenes = Math.ceil(config.targetDuration * 60 / 10); 
      constraintText = `Target total duration: ${config.targetDuration} minutes. Create approx ${targetScenes} scenes.`;
      logFn(`📝 Strategy: Total Duration ${config.targetDuration}m (~${targetScenes} scenes)`);
  } else {
      targetScenes = durationConfig.scenes; 
      constraintText = `Create exactly ${targetScenes} scenes.`;
      logFn(`📝 Strategy: Fixed Scene Count (${targetScenes})`);
  }

  // PUBLIC PROVIDER (No Key)
  if (config.textProvider === 'public') {
       logFn("🌍 Using Public Provider (Simple Generator)...");
       const dummyScript = Array(targetScenes).fill(0).map((_, i) => ({
           speaker: i % 2 === 0 ? "Host" : "Expert",
           text: `Ini adalah konten otomatis untuk scene ${i+1} tentang ${topic}. Mode publik aktif.`,
           visual_keyword: `${topic} scene ${i+1}`
       }));
       return { title: `Public: ${topic}`, script: dummyScript };
  }

  const structurePrompt = config.mode === 'top10' ? "Intro -> Countdown -> Outro" : "Hook -> Body -> Conclusion";
  const speakersPrompt = config.narratorMode === 'dialogue' ? "Host & Expert conversation" : "Host monologue";

  const basePrompt = contextData 
    ? `Source Material: "${contextData.substring(0, 5000)}". Task: Adapt this material into a video script.`
    : `Topic: "${topic}". Task: Create a new video script.`;

  const systemPrompt = `Role: Scriptwriter. Style: Viral TikTok. Language: Indonesian. Output JSON ONLY: { "title": "Title", "script": [{"speaker": "Host/Expert", "text": "Sentence", "visual_keyword": "English Keyword"}] }`;
  const userPrompt = `${basePrompt} ${structurePrompt}. ${speakersPrompt}. ${constraintText}`;

  try {
    let jsonResponse: any;

    if (config.textProvider === 'chatgpt') {
        // OpenAI / ChatGPT
        logFn("🤖 Generating with ChatGPT...");
        const text = await fetchOpenAICompatible(
            'https://api.openai.com/v1/chat/completions',
            'gpt-3.5-turbo', // Or gpt-4
            config.secondaryApiKey,
            systemPrompt,
            userPrompt,
            config.aiTemperature
        );
        jsonResponse = robustJsonParse(text);

    } else if (config.textProvider === 'deepseek') {
        // DeepSeek
        logFn("🐋 Generating with DeepSeek...");
        const text = await fetchOpenAICompatible(
            'https://api.deepseek.com/chat/completions',
            'deepseek-chat', 
            config.secondaryApiKey,
            systemPrompt,
            userPrompt,
            config.aiTemperature
        );
        jsonResponse = robustJsonParse(text);

    } else {
        // Default: Gemini
        const ai = getClient(config);
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: { 
                responseMimeType: 'application/json',
                temperature: config.aiTemperature ?? 0.7 
            }
        });
        jsonResponse = robustJsonParse(response.text || "{}");
    }

    if (jsonResponse && Array.isArray(jsonResponse.script)) {
        return jsonResponse;
    }
    throw new Error("Invalid JSON from Provider");

  } catch (e: any) {
    logFn(`⚠️ Script Error (${config.textProvider}): ${e.message}`);
    console.error(e);
    return { title: topic, script: [{speaker:"Host", text: `Error: ${e.message}. Coba cek API Key.`, visual_keyword: topic}]};
  }
};

export const fetchSmartMusic = async (
  genre: string, 
  customQuery: string, 
  audioCtx: AudioContext, 
  logFn: (msg: string) => void, 
  fastMode: boolean
): Promise<MusicTrack | null> => {
  let queryToSearch = customQuery.trim() ? customQuery : genre;
  const safetySuffix = " instrumental background music no lyrics";
  const indoSuffix = " indonesia instrumental";
  let finalSearchTerm = `${queryToSearch} ${indoSuffix}`;

  // Simply use direct search if no API key or in fast mode
  const performSearch = async (term: string) => {
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=3`;
        const res = await secureFetch(url);
        const data = await res.json();
        return data.results?.[0]; 
    } catch (e) { return null; }
  };

  let track = await performSearch(finalSearchTerm);
  if (!track) track = await performSearch(`${queryToSearch} ${safetySuffix}`);
  if (!track) track = await performSearch(`${genre} instrumental`);

  if (track && track.previewUrl) {
    try {
        const audioRes = await secureFetch(track.previewUrl);
        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        return { buffer, info: track };
    } catch(e) { return null; }
  }
  return null;
};

// --- TTS & PUBLIC API FETCHERS ---
export const fetchTTS = async (text: string, provider: string, audioCtx: AudioContext, fastMode: boolean, voiceProfile: string, userKey?: string): Promise<AudioBuffer> => {
    const encodedText = encodeURIComponent(text.slice(0, 150));
    // Fallback to Google Translate TTS
    const loadGoogleTTS = async () => {
         const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=id&client=tw-ob`;
         const res = await secureFetch(url); 
         if(res.ok) return await audioCtx.decodeAudioData(await res.arrayBuffer());
         throw new Error("TTS Failed");
    };

    const apiKey = userKey || process.env.API_KEY;

    if (!fastMode && (provider === 'auto' || provider === 'gemini') && apiKey) {
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceProfile } } }
                }
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const bin = atob(base64Audio);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                const wavBytes = pcmToWavBytes(bytes);
                return await audioCtx.decodeAudioData(wavBytes.buffer);
            }
        } catch (e) {}
    }
    
    try {
        return await loadGoogleTTS();
    } catch(e) {
        const words = text.split(' ').length;
        return audioCtx.createBuffer(1, audioCtx.sampleRate * (words * 0.4), audioCtx.sampleRate);
    }
};

export const fetchVisual = async (provider: string, apiKey: string, keyword: string, stylePrompt: string, index: number, fastMode: boolean = false): Promise<string> => {
    const seed = Math.floor(Math.random() * 99999) + index;
    const safeKw = encodeURIComponent(keyword.length > 100 ? keyword.substring(0, 100) : keyword);
    const model = fastMode ? 'turbo' : 'flux';
    return `https://image.pollinations.ai/prompt/${safeKw}%20${encodeURIComponent(stylePrompt)}?width=720&height=1280&nologo=true&seed=${seed}&model=${model}`;
};
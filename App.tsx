import React, { useState, useRef, useEffect } from 'react';
import { 
  Sliders, Download, Play, Zap, Brain, 
  Image as ImageIcon, Music, Volume2, 
  RotateCcw, Wand2, Terminal, X, Check,
  Wifi, WifiOff, FileText, Globe, User,
  ChevronDown, Monitor, Palette, Clock, Speaker,
  Layers, Repeat, Search, Film, Activity,
  Edit, Save, Trash2, Plus, Key, MessageSquare,
  Thermometer, Type, Cpu, Settings, Sparkles,
  ArrowRight, LayoutGrid, List
} from 'lucide-react';

import { AppConfig, ScriptPlan, ScriptItem, DurationStep, MusicTrack, FeedItem } from './types';
import { 
  drawSearchingEffect, drawMergingEffect, drawAudioVisualizer,
  refineScriptPlan 
} from './utils';
import { 
  fetchScript, fetchSmartMusic, fetchTTS, fetchVisual, fetchWiki, fetchBatchVariations, searchItunesLibrary
} from './services';
import { ParallelEngine, ConcurrencyMode } from './taskEngine';
import { loadCorsImage } from './network';

// --- CONSTANTS ---
const TEXT_PROVIDERS = [
  { id: 'gemini', name: '✨ Gemini API (Google)' },
  { id: 'chatgpt', name: '🤖 ChatGPT (OpenAI)' },
  { id: 'deepseek', name: '🐋 DeepSeek V3/R1' },
  { id: 'public', name: '🌍 Public (Simple/Wiki)' },
];

const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fastest)' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Smartest)' },
  { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
];

const VISUAL_STYLES = [
  { id: 'cinematic', label: 'Cinematic Realistic', prompt: 'cinematic, photorealistic, 8k, dramatic lighting, movie scene' },
  { id: 'anime', label: 'Anime Style', prompt: 'anime style, studio ghibli, vibrant, highly detailed' },
  { id: '3d', label: '3D Render', prompt: '3d render, unreal engine 5, cute, plastic texture, soft lighting' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk, neon, futuristic, dark city, rain' },
  { id: 'painting', label: 'Oil Painting', prompt: 'oil painting, van gogh style, thick brushstrokes' },
];

const SETTING_TABS = [
    { id: 'api', label: 'API & Key', icon: Key },
    { id: 'brain', label: 'AI Brain', icon: Brain },
    { id: 'visual', label: 'Visual Studio', icon: Palette },
    { id: 'audio', label: 'Audio Mixer', icon: Speaker },
    { id: 'system', label: 'System', icon: Cpu },
];

export default function MycSupremeV18() {
  // --- STATE ---
  const [config, setConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem('omni_config_v2');
      const defaults: AppConfig = {
        userApiKey: '',
        secondaryApiKey: '',
        textProvider: 'gemini',
        geminiModel: 'gemini-3-flash-preview', // Default Model
        imageKey: '',
        imgProvider: 'auto_network',
        ttsProvider: 'auto',
        fastMode: false,
        genMethod: 'balanced',
        durIndex: 0,
        planningStrategy: 'scene_count',
        targetDuration: 1,
        mode: 'narrative',
        narratorMode: 'monologue',
        aspectRatio: '9:16',
        visualStyle: 'cinematic',
        subtitleColor: '#ffffff',
        subtitleSize: 40,
        motionMode: 'auto',
        transitionMode: 'cut',
        musicGenre: 'Cinematic Epic',
        musicSearch: '',
        musicVol: 0.15,
        ttsVol: 1.0,
        voiceHost: 'Fenrir',
        voiceExpert: 'Kore',
        selectedMusicTrack: null,
        aiTemperature: 0.7,
        customVisualPrompt: "",
        subOutlineColor: '#000000',
        subBox: false,
        maxThreads: 4
      };
      if (saved) { try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { return defaults; } }
      return defaults;
  });

  // Feed & History
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [viewMode, setViewMode] = useState<'studio' | 'feed'>('studio');
  const [savedScripts, setSavedScripts] = useState<ScriptPlan[]>([]);

  // Music State
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<MusicTrack[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Production State
  const [prodMode, setProdMode] = useState<'wiki' | 'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState('');
  const [sceneCount, setSceneCount] = useState(5);
  const [sceneDur, setSceneDur] = useState(7);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Batch State
  const [batchSize, setBatchSize] = useState(1);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // System State
  const [status, setStatus] = useState({ text: 'READY', color: 'bg-emerald-500' });
  const [configTab, setConfigTab] = useState<string>('api'); 
  const [showConfig, setShowConfig] = useState(false);
  const [logMsg, setLogMsg] = useState('Welcome to V18. Ready to create.');

  // Render State
  const [step, setStep] = useState(0); 
  const [plan, setPlan] = useState<ScriptPlan | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [activeThreads, setActiveThreads] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [playingSceneIdx, setPlayingSceneIdx] = useState<number | null>(null);
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ParallelEngine<any, any> | null>(null);
  const stopRenderRef = useRef(false);
  const bgVisualRef = useRef<HTMLImageElement | null>(null);
  const completedScenesRef = useRef<{[key: number]: ScriptItem}>({});
  const animFrameRef = useRef<number | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('omni_config_v2', JSON.stringify(config)); }, [config]);
  useEffect(() => {
    const saved = localStorage.getItem('omni_history');
    if (saved) { try { setSavedScripts(JSON.parse(saved)); } catch (e) {} }
  }, []);

  const saveToHistory = (plan: ScriptPlan) => {
      const newHistory = [{...plan, timestamp: Date.now()}, ...savedScripts].slice(0, 50);
      setSavedScripts(newHistory);
      localStorage.setItem('omni_history', JSON.stringify(newHistory));
  };

  const log = (msg: string) => setLogMsg(msg);

  // Animation Loop
  useEffect(() => {
    let frame = 0;
    const animate = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;

        if (step === 0 || step === 1 || step === 2) {
             drawSearchingEffect(ctx, w, h, frame, bgVisualRef.current, activeThreads);
        } else if (step === 3) {
             if (activeThreads > 0) {
                 drawSearchingEffect(ctx, w, h, frame, bgVisualRef.current, activeThreads);
             } else {
                 drawMergingEffect(ctx, w, h, renderProgress);
             }
        }
        frame++;
        animFrameRef.current = requestAnimationFrame(animate);
    };
    if (step !== 3 || activeThreads > 0) animate();
    else if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    return () => { if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [step, activeThreads, renderProgress]);

  // Music Logic
  const handleMusicSearch = async () => {
      if (!musicQuery) return;
      setIsSearchingMusic(true);
      const results = await searchItunesLibrary(musicQuery);
      setMusicResults(results);
      setIsSearchingMusic(false);
  };
  const playPreview = (url: string) => {
      if (previewAudio) {
          previewAudio.pause();
          if(previewAudio.src === url) { setPreviewAudio(null); return; }
      }
      const audio = new Audio(url);
      audio.volume = 0.3; audio.play();
      setPreviewAudio(audio);
  };

  // Engine Logic
  const addColorPickerNode = () => {
      if (!plan) return;
      const newNode: ScriptItem = {
          type: 'color_picker',
          data: { color: '#000000', customRender: 'color_picker' },
          speaker: 'System', text: 'Color Picker Node', visual_keyword: ''
      };
      setPlan({ ...plan, script: [...plan.script, newNode] });
  };

  const igniteEngine = async () => {
      if (!topic && prodMode !== 'wiki') { log("Please enter a topic."); return; }
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContext();
      }
      if(audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

      setDownloadUrl(null);
      setPlayingSceneIdx(null);
      stopRenderRef.current = false;
      setViewMode('studio');

      if (batchSize > 1 && !isBatchRunning) {
          setStep(1);
          setStatus({ text: 'BATCH MODE', color: 'bg-blue-500' });
          setIsBatchRunning(true);
          setBatchIndex(0);
          try {
             const topics = await fetchBatchVariations(topic, batchSize, log, config);
             setBatchQueue(topics);
             runProductionCycle(topics[0], 0, topics);
          } catch(e) {
             const fallbackTopics = Array(batchSize).fill(topic);
             setBatchQueue(fallbackTopics);
             runProductionCycle(topic, 0, fallbackTopics);
          }
      } else {
          setIsBatchRunning(false);
          setBatchQueue([]);
          runProductionCycle(topic, 0, []);
      }
  };

  const runProductionCycle = async (currentTopic: string, bIndex: number, queue: string[]) => {
      setStep(1);
      setPlayingSceneIdx(null);
      setStatus({ text: `PROCESSING ${bIndex + 1}/${queue.length || 1}`, color: 'bg-yellow-500' });
      log(`Thinking about "${currentTopic}"...`);

      try {
          let contextData = "";
          let finalTopic = currentTopic;

          if (prodMode === 'wiki') {
              const wikiRes = await fetchWiki(currentTopic || "");
              if (!wikiRes) finalTopic = currentTopic || "Random Fact";
              else { finalTopic = wikiRes.title; contextData = wikiRes.extract; }
          } else if (prodMode === 'manual') {
              contextData = currentTopic;
              finalTopic = "Manual Script";
          }

          log(`Writing script...`);
          const customStep: DurationStep = { label: 'Custom', val: (sceneCount * sceneDur) / 60, scenes: sceneCount, style: 'Engaging' };
          const planRes = await fetchScript(finalTopic, config, customStep, log, contextData);
          const refinedScript = refineScriptPlan(planRes.script);
          const finalScript = config.planningStrategy === 'scene_count' ? refinedScript.slice(0, sceneCount) : refinedScript;

          const finalPlan = { ...planRes, script: finalScript };
          setPlan(finalPlan);
          saveToHistory(finalPlan);
          completedScenesRef.current = {};
          
          executeRender(finalPlan, bIndex, queue);
      } catch (e: any) {
          setStatus({ text: 'ERROR', color: 'bg-red-600' });
          log(e.message);
          setStep(0);
          setIsBatchRunning(false); 
      }
  };

  const executeRender = async (currentPlan: ScriptPlan, bIndex: number, queue: string[]) => {
      setStep(3);
      setStatus({ text: 'RENDERING', color: 'bg-purple-500' });
      const actx = audioCtxRef.current!;

      try {
          let musicData: any = null;
          if (isMusicEnabled) {
              if (config.selectedMusicTrack) {
                  try {
                      const audioRes = await fetch(config.selectedMusicTrack.info.previewUrl);
                      const arrayBuffer = await audioRes.arrayBuffer();
                      const buffer = await actx.decodeAudioData(arrayBuffer);
                      musicData = { buffer, info: config.selectedMusicTrack.info };
                  } catch(e) {}
              }
              if (!musicData) {
                  const search = currentPlan.title || config.musicGenre;
                  musicData = await fetchSmartMusic(config.musicGenre, search, actx, log, config.fastMode);
              }
          }

          const styleObj = VISUAL_STYLES.find(s => s.id === config.visualStyle);
          const basePrompt = styleObj ? styleObj.prompt : "cinematic, 4k";
          const fullVisualPrompt = `${basePrompt}, ${config.customVisualPrompt}`;
          
          const scenesToRun = currentPlan.script
            .map((item, idx) => ({ item, idx }))
            .filter(task => !task.item.type || task.item.type === 'script_item');

          engineRef.current = new ParallelEngine(
              scenesToRun, 
              config.fastMode ? 'turbo' : 'balanced',
              async (task, _) => {
                  const { item, idx } = task;
                  try {
                      const voice = item.speaker.toLowerCase().includes('expert') ? config.voiceExpert : config.voiceHost;
                      const [visualUrl, audioBuf] = await Promise.all([
                          fetchVisual(config.imgProvider, config.imageKey, item.visual_keyword || topic, fullVisualPrompt, idx, config.fastMode),
                          fetchTTS(item.text, config.ttsProvider, actx, config.fastMode, voice, config.userApiKey)
                      ]);
                      const img = await loadCorsImage(visualUrl);
                      bgVisualRef.current = img; 
                      completedScenesRef.current[idx] = { ...item, visual: img, audioBuffer: audioBuf } as ScriptItem;
                      return { success: true, index: idx };
                  } catch (e) {
                      return { success: false, index: idx };
                  }
              },
              (done, total) => {
                  log(`Assets: ${done}/${total}`);
                  setActiveThreads(prev => (prev < 8 ? prev + 1 : 4));
              }
          );

          await engineRef.current.start();
          setActiveThreads(0);
          
          setStatus({ text: 'MERGING', color: 'bg-red-600 animate-pulse' });
          const finalScenes: ScriptItem[] = [];
          for(let i=0; i<currentPlan.script.length; i++) {
              if(completedScenesRef.current[i]) {
                  const s = completedScenesRef.current[i];
                  (s as any)._originalIdx = i;
                  finalScenes.push(s);
              }
          }
          
          let cursor = 0;
          const userMinDur = sceneDur; 
          const timedScenes = finalScenes.map(s => {
              const audioDur = s.audioBuffer?.duration || 0;
              const dur = Math.max(audioDur, userMinDur);
              const r = { ...s, startTime: cursor, endTime: cursor + dur, duration: dur };
              cursor += dur;
              return r;
          });

          const totalDur = cursor;
          const masterAudio = actx.createBuffer(1, Math.ceil(actx.sampleRate * (totalDur + 1)), actx.sampleRate);
          const chan = masterAudio.getChannelData(0);
          timedScenes.forEach(s => {
              if(s.audioBuffer) {
                  const startSample = Math.floor(s.startTime! * actx.sampleRate);
                  const data = s.audioBuffer.getChannelData(0);
                  for(let i=0; i<data.length; i++) {
                      if(startSample+i < chan.length) chan[startSample+i] = data[i];
                  }
              }
          });

          renderToStream(timedScenes, masterAudio, musicData?.buffer, actx, bIndex, queue, currentPlan.title);

      } catch (e: any) {
          log("Fail: " + e.message);
          setStep(0);
          setIsBatchRunning(false);
      }
  };

  const renderToStream = (
      scns: ScriptItem[], audMain: AudioBuffer, musBuf: AudioBuffer | undefined, 
      actx: AudioContext, bIndex: number, queue: string[], currentTitle: string
  ) => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const dest = actx.createMediaStreamDestination();
      const analyser = actx.createAnalyser();
      analyser.connect(dest);
      analyser.connect(actx.destination); 

      const ttsSrc = actx.createBufferSource(); ttsSrc.buffer = audMain;
      const ttsGain = actx.createGain(); ttsGain.gain.value = config.ttsVol;
      ttsSrc.connect(ttsGain); ttsGain.connect(analyser);

      let musSrc: AudioBufferSourceNode | null = null;
      if (musBuf) {
          musSrc = actx.createBufferSource(); musSrc.buffer = musBuf; musSrc.loop = true;
          const musGain = actx.createGain(); musGain.gain.value = config.musicVol;
          musSrc.connect(musGain); musGain.connect(analyser);
      }

      const stream = cvs.captureStream(30);
      if (dest.stream.getAudioTracks().length) stream.addTrack(dest.stream.getAudioTracks()[0]);

      const rec = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 2500000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      
      rec.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          const newFeedItem: FeedItem = {
              id: Date.now().toString(),
              url,
              title: currentTitle,
              date: Date.now(),
              topic: currentTitle
          };
          setFeed(prev => [newFeedItem, ...prev]);
          setViewMode('feed');

          log(`✅ Done: ${currentTitle}`);
          setPlayingSceneIdx(null);

          const nextIndex = bIndex + 1;
          if (queue.length > 0 && nextIndex < queue.length) {
              setBatchIndex(nextIndex);
              setTimeout(() => { runProductionCycle(queue[nextIndex], nextIndex, queue); }, 1000);
          } else {
              setStep(4); setStatus({ text: 'BATCH COMPLETE', color: 'bg-blue-500' }); setIsBatchRunning(false);
          }
      };

      rec.start(); ttsSrc.start(0); if (musSrc) musSrc.start(0);
      const startT = actx.currentTime;
      const totalD = scns[scns.length - 1]?.endTime || audMain.duration;
      let lastSceneIdx = -1;

      const draw = () => {
          if (stopRenderRef.current) { rec.stop(); ttsSrc.stop(); if (musSrc) musSrc.stop(); return; }
          const elapsed = actx.currentTime - startT;
          if (elapsed >= totalD + 1) { rec.stop(); ttsSrc.stop(); if (musSrc) musSrc.stop(); return; }

          setRenderProgress(elapsed / totalD);
          const cur = scns.find(s => s.startTime !== undefined && s.endTime !== undefined && elapsed >= s.startTime && elapsed < s.endTime) || scns[scns.length - 1];
          if(!cur) { requestAnimationFrame(draw); return; }

          const curOriginalIdx = (cur as any)._originalIdx;
          if (curOriginalIdx !== undefined && curOriginalIdx !== lastSceneIdx) {
              lastSceneIdx = curOriginalIdx;
              setPlayingSceneIdx(curOriginalIdx);
          }

          const curStart = cur.startTime || 0;
          const localProg = (elapsed - curStart) / (cur.duration || 1);

          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
          try {
             ctx.save();
             let scale = 1, tx = 0, ty = 0;
             let effect = config.motionMode;
             if (effect === 'auto' || effect === 'random') {
                 const seed = Math.floor(curStart);
                 const modes = ['zoom_in', 'zoom_out', 'pan', 'static'];
                 effect = modes[seed % modes.length] as any;
             }
             if (effect === 'zoom_in') scale = 1 + (localProg * 0.15);
             else if (effect === 'zoom_out') scale = 1.15 - (localProg * 0.15);
             else if (effect === 'pan') { scale = 1.1; tx = (localProg - 0.5) * 40; }
             ctx.translate(cvs.width/2 + tx, cvs.height/2 + ty); 
             ctx.scale(scale, scale); 
             ctx.translate(-cvs.width/2, -cvs.height/2);
             if(cur.visual && cur.visual.width > 0) ctx.drawImage(cur.visual, 0, 0, cvs.width, cvs.height);
             ctx.restore();
          } catch(e) {}

          const grad = ctx.createLinearGradient(0, cvs.height*0.5, 0, cvs.height);
          grad.addColorStop(0, "transparent"); grad.addColorStop(1, "rgba(0,0,0,0.9)");
          ctx.fillStyle = grad; ctx.fillRect(0, cvs.height*0.5, cvs.width, cvs.height*0.5);

          drawAudioVisualizer(ctx, cvs.width, cvs.height, analyser, config.subtitleColor);

          ctx.textAlign = "center"; 
          ctx.font = `bold ${config.subtitleSize}px Inter, sans-serif`;
          const words = cur.text.split(' ');
          let line='', lines: string[]=[], maxW=cvs.width*0.85;
          words.forEach(w=>{ if(ctx.measureText(line+w).width>maxW){lines.push(line);line=w+' ';}else line+=w+' '; });
          lines.push(line);
          let y = cvs.height * 0.85 - ((lines.length-1)*(config.subtitleSize*1.2));
          
          lines.forEach((l,i)=> {
              const ly = y+(i*(config.subtitleSize*1.2));
              if (config.subBox) {
                  const textW = ctx.measureText(l).width;
                  ctx.fillStyle = 'rgba(0,0,0,0.6)';
                  ctx.fillRect(cvs.width/2 - textW/2 - 10, ly - config.subtitleSize + 5, textW + 20, config.subtitleSize + 10);
              }
              ctx.fillStyle = config.subtitleColor;
              ctx.shadowColor = config.subOutlineColor; 
              ctx.shadowBlur = config.subBox ? 0 : 10;
              ctx.fillText(l, cvs.width/2, ly);
          });
          
          requestAnimationFrame(draw);
      };
      draw();
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col items-center justify-center overflow-hidden">
        
        {/* APP CONTAINER */}
        <div className="w-full h-full md:max-w-md md:h-[95vh] md:rounded-[3rem] bg-black relative flex flex-col shadow-2xl border border-zinc-800 overflow-hidden">
            
            {/* 1. TOP HEADER (FLOATING) */}
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="font-black text-xl tracking-tighter text-white">MYC <span className="text-emerald-500">V18</span></h1>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${status.color} shadow-[0_0_10px_currentColor]`}></div>
                        <span className="text-[9px] font-bold text-zinc-400 tracking-widest">{status.text}</span>
                    </div>
                </div>
                
                {/* SETTINGS TRIGGER */}
                <button onClick={() => setShowConfig(true)} className="pointer-events-auto w-10 h-10 rounded-full bg-zinc-900/50 backdrop-blur border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95">
                    <Settings className="w-5 h-5" />
                </button>
            </header>

            {/* 2. MODE SWITCHER (PILL) */}
            <div className="absolute top-20 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-zinc-900/80 backdrop-blur-md p-1 rounded-full border border-zinc-700/50 flex gap-1 shadow-xl">
                    <button onClick={() => setViewMode('studio')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${viewMode === 'studio' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <LayoutGrid className="w-3 h-3"/> Studio
                    </button>
                    <button onClick={() => setViewMode('feed')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${viewMode === 'feed' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Film className="w-3 h-3"/> Feed <span className="bg-zinc-800 px-1.5 rounded text-[8px]">{feed.length}</span>
                    </button>
                </div>
            </div>

            {/* 3. MAIN CONTENT AREA */}
            <div className="flex-1 relative bg-zinc-900 overflow-hidden">
                
                {/* VIEW: STUDIO CANVAS */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${viewMode === 'studio' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <canvas ref={canvasRef} width={720} height={1280} className="w-full h-full object-cover opacity-80" />
                    
                    {/* Placeholder when idle */}
                    {step === 0 && !downloadUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 pointer-events-none">
                            <Sparkles className="w-16 h-16 mb-4 opacity-20"/>
                            <p className="text-xs font-mono tracking-widest opacity-50">CANVAS READY</p>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {step === 1 && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <Brain className="w-16 h-16 text-emerald-500 animate-pulse mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            <div className="text-xs font-bold text-emerald-500 tracking-[0.2em] animate-pulse">NEURAL ENGINE ACTIVE</div>
                            {isBatchRunning && (<div className="mt-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-mono border border-blue-500/30 rounded-full">BATCH PROCESSING: {batchIndex + 1} / {batchQueue.length}</div>)}
                        </div>
                    )}
                </div>

                {/* VIEW: TIKTOK FEED */}
                <div className={`absolute inset-0 bg-black transition-opacity duration-500 snap-y snap-mandatory overflow-y-auto custom-scrollbar ${viewMode === 'feed' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                     {feed.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                            <Film className="w-12 h-12 opacity-20"/>
                            <p className="text-xs">No videos generated yet.</p>
                            <button onClick={()=>setViewMode('studio')} className="text-emerald-500 text-xs font-bold">Go to Studio</button>
                        </div>
                     ) : (
                         feed.map((item, i) => (
                             <div key={item.id} className="w-full h-full snap-center relative bg-zinc-900">
                                 <video src={item.url} controls autoPlay={i===0} loop className="w-full h-full object-cover" />
                                 <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                                     <h3 className="text-white font-bold text-lg drop-shadow-md">{item.title}</h3>
                                     <p className="text-zinc-400 text-xs mt-1 font-mono">{new Date(item.date).toLocaleTimeString()}</p>
                                 </div>
                             </div>
                         ))
                     )}
                </div>

            </div>

            {/* 4. BOTTOM ACTION SHEET (Glassmorphism) */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 transition-transform duration-500 ${viewMode === 'feed' ? 'translate-y-full' : 'translate-y-0'}`}>
                
                {/* Topic Input */}
                <div className="relative group mb-4">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl opacity-20 group-hover:opacity-40 transition blur"></div>
                    <div className="relative bg-zinc-900 rounded-xl flex items-center p-1 border border-zinc-800 group-hover:border-zinc-600 transition">
                         <div className="px-3 border-r border-zinc-800">
                             <select value={prodMode} onChange={(e) => setProdMode(e.target.value as any)} className="bg-transparent text-[10px] font-bold text-zinc-400 outline-none uppercase tracking-wide cursor-pointer hover:text-white">
                                 <option value="wiki">Wiki</option>
                                 <option value="ai">AI</option>
                                 <option value="manual">Raw</option>
                             </select>
                         </div>
                         <input 
                            value={topic} 
                            onChange={(e) => setTopic(e.target.value)} 
                            placeholder={prodMode === 'wiki' ? "Search Wikipedia..." : "What is the video about?"}
                            className="flex-1 bg-transparent p-3 text-sm text-white placeholder-zinc-600 outline-none font-medium"
                         />
                         {topic && <button onClick={() => setTopic('')} className="p-2 text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>}
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex gap-3">
                    {/* Loop Control */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 h-12 w-24 justify-between group hover:border-zinc-600 transition">
                         <button onClick={()=>setBatchSize(Math.max(1, batchSize-1))} className="w-6 h-full text-zinc-500 hover:text-white flex items-center justify-center">-</button>
                         <div className="flex flex-col items-center">
                             <span className={`text-xs font-bold ${batchSize > 1 ? 'text-blue-400' : 'text-zinc-300'}`}>{batchSize}</span>
                             <span className="text-[8px] text-zinc-600 font-bold uppercase">LOOP</span>
                         </div>
                         <button onClick={()=>setBatchSize(Math.min(5, batchSize+1))} className="w-6 h-full text-zinc-500 hover:text-white flex items-center justify-center">+</button>
                    </div>

                    {/* Main Action Button */}
                    <button 
                        onClick={step === 0 || step === 4 ? igniteEngine : () => { stopRenderRef.current = true; setStep(0); setIsBatchRunning(false); }}
                        className={`flex-1 rounded-xl h-12 flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all transform active:scale-95 shadow-lg ${
                            step === 0 || step === 4 
                            ? 'bg-white text-black hover:bg-zinc-200' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                        }`}
                    >
                        {step === 0 || step === 4 ? (
                            <>
                                <Wand2 className="w-4 h-4" /> 
                                {batchSize > 1 ? `START BATCH` : `GENERATE`}
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" /> STOP
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 5. SETTINGS SIDEBAR (SLIDE OVER) */}
            {showConfig && (
                <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
                    <div className="w-80 h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-emerald-500"/> Configuration
                            </h2>
                            <button onClick={() => setShowConfig(false)} className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition"><ArrowRight className="w-4 h-4"/></button>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Tabs */}
                            <div className="flex p-2 bg-zinc-900/50 gap-1 overflow-x-auto">
                                {SETTING_TABS.map(tab => {
                                    const Icon = tab.icon;
                                    const isActive = configTab === tab.id;
                                    return (
                                        <button key={tab.id} onClick={() => setConfigTab(tab.id)} className={`px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold whitespace-nowrap transition-all ${isActive ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                            <Icon className={`w-3 h-3 ${isActive ? 'text-emerald-500' : ''}`}/> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-6 space-y-6">
                                {configTab === 'api' && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Text Engine</label>
                                            <select value={config.textProvider} onChange={(e) => setConfig({...config, textProvider: e.target.value as any})} className="w-full bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500 transition">
                                                {TEXT_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2 flex justify-between">
                                                Gemini API Key
                                                {config.userApiKey && <Check className="w-3 h-3 text-emerald-500"/>}
                                            </label>
                                            <input type="password" value={config.userApiKey} onChange={(e) => setConfig({...config, userApiKey: e.target.value})} placeholder="sk-..." className="w-full bg-black border border-zinc-800 text-emerald-400 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500 transition font-mono" />
                                            <p className="text-[9px] text-zinc-600 mt-2">Required for AI generation.</p>
                                        </div>
                                    </div>
                                )}

                                {configTab === 'brain' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         {/* Model Selection */}
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Gemini Model Version</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {GEMINI_MODELS.map(m => (
                                                    <button key={m.id} onClick={() => setConfig({...config, geminiModel: m.id})} className={`p-3 rounded-lg border text-left transition-all ${config.geminiModel === m.id ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                                        <div className="text-[11px] font-bold">{m.label}</div>
                                                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{m.id}</div>
                                                    </button>
                                                ))}
                                            </div>
                                         </div>

                                         {/* Temperature Control */}
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <div className="flex justify-between mb-2">
                                               <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Thermometer className="w-3 h-3"/> Creativity (Temperature)</label>
                                               <span className="text-[10px] font-mono text-emerald-500">{config.aiTemperature}</span>
                                            </div>
                                            <input type="range" min="0" max="1.5" step="0.1" value={config.aiTemperature} onChange={(e) => setConfig({...config, aiTemperature: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-emerald-500"/>
                                            <p className="text-[9px] text-zinc-600 mt-2">Lower = Factual. Higher = Creative.</p>
                                         </div>

                                         {/* Planning Strategy */}
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                             <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Script Strategy</label>
                                             <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
                                                 <button onClick={() => setConfig({...config, planningStrategy: 'scene_count'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition ${config.planningStrategy === 'scene_count' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Fixed Scenes</button>
                                                 <button onClick={() => setConfig({...config, planningStrategy: 'total_duration'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition ${config.planningStrategy === 'total_duration' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Target Duration</button>
                                             </div>
                                         </div>
                                     </div>
                                )}
                                
                                {configTab === 'visual' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div>
                                             <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Art Style</label>
                                             <div className="grid grid-cols-2 gap-2">
                                                 {VISUAL_STYLES.map(s => (
                                                     <button key={s.id} onClick={() => setConfig({...config, visualStyle: s.id})} className={`p-3 rounded-xl border text-left transition-all ${config.visualStyle === s.id ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                                         <div className="text-[10px] font-bold">{s.label}</div>
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
                                         <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Subtitle Color</label>
                                            <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                                <input type="color" value={config.subtitleColor} onChange={(e)=>setConfig({...config, subtitleColor: e.target.value})} className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"/>
                                                <span className="text-xs font-mono text-zinc-400">{config.subtitleColor}</span>
                                            </div>
                                         </div>
                                     </div>
                                )}

                                {configTab === 'audio' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
                                             <div>
                                                 <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-2"><span>MUSIC VOLUME</span><span>{Math.round(config.musicVol*100)}%</span></div>
                                                 <input type="range" min="0" max="1" step="0.05" value={config.musicVol} onChange={e=>setConfig({...config, musicVol: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-emerald-500"/>
                                             </div>
                                             <div>
                                                 <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-2"><span>VOICE VOLUME</span><span>{Math.round(config.ttsVol*100)}%</span></div>
                                                 <input type="range" min="0" max="1.5" step="0.05" value={config.ttsVol} onChange={e=>setConfig({...config, ttsVol: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-blue-500"/>
                                             </div>
                                         </div>
                                         
                                         <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">iTunes Music Search</label>
                                            <div className="flex gap-2">
                                                <input value={musicQuery} onChange={e=>setMusicQuery(e.target.value)} placeholder="Search for a song..." className="flex-1 bg-zinc-900 border border-zinc-800 text-xs rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"/>
                                                <button onClick={handleMusicSearch} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-lg"><Search className="w-4 h-4"/></button>
                                            </div>
                                            {musicResults.length > 0 && (
                                                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-900">
                                                    {musicResults.map((t, i) => (
                                                        <div key={i} onClick={()=>setConfig({...config, selectedMusicTrack: t})} className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-zinc-800 ${config.selectedMusicTrack?.info.previewUrl === t.info.previewUrl ? 'bg-emerald-900/20' : ''}`}>
                                                            <img src={t.info.artworkUrl100} className="w-6 h-6 rounded bg-zinc-700"/>
                                                            <div className="flex-1 truncate text-[9px] text-zinc-300">{t.info.trackName}</div>
                                                            <button onClick={(e)=>{e.stopPropagation(); playPreview(t.info.previewUrl)}}><Play className="w-3 h-3 text-zinc-500"/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                         </div>
                                     </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                            <button onClick={() => setShowConfig(false)} className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition shadow-lg">DONE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOG OVERLAY */}
            <div className="absolute bottom-24 left-6 right-6 pointer-events-none">
                <div className={`text-[10px] font-mono transition-opacity duration-300 ${logMsg ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-emerald-500 mr-2">➜</span>
                    <span className="text-zinc-500 bg-black/50 px-2 py-1 rounded backdrop-blur">{logMsg}</span>
                </div>
            </div>

        </div>
    </div>
  );
}
export interface ScriptItem {
  type?: string;
  data?: any;
  speaker: string;
  text: string;
  visual_keyword: string;
  visual?: HTMLImageElement;
  audioBuffer?: AudioBuffer;
  duration?: number;
  startTime?: number;
  endTime?: number;
}

export interface ScriptPlan {
  title: string;
  script: ScriptItem[];
  timestamp?: number;
}

export interface FeedItem {
  id: string;
  url: string;
  title: string;
  date: number;
  topic: string;
}

export interface AppConfig {
  // API & Providers
  userApiKey: string; // Gemini Key
  secondaryApiKey: string; // OpenAI/DeepSeek Key
  textProvider: 'gemini' | 'chatgpt' | 'deepseek' | 'public';
  geminiModel: string; // NEW: Model Selection
  
  // Core
  imageKey: string;
  imgProvider: string;
  ttsProvider: string;
  fastMode: boolean;
  genMethod: string;

  // Content Strategy
  planningStrategy: 'scene_count' | 'total_duration'; 
  targetDuration: number; // in minutes

  // Content
  durIndex: number; 
  mode: string;
  narratorMode: string;

  // Visual
  aspectRatio: '9:16' | '16:9';
  visualStyle: string;
  subtitleColor: string;
  subtitleSize: number;
  
  // Animation
  motionMode: 'static' | 'zoom_in' | 'zoom_out' | 'pan' | 'auto' | 'random';
  transitionMode: 'cut' | 'fade';

  // Audio
  musicGenre: string;
  musicSearch: string;
  musicVol: number;
  ttsVol: number;
  voiceHost: string;
  voiceExpert: string;
  selectedMusicTrack?: MusicTrack | null; 

  // --- NEW ADVANCED SETTINGS ---
  aiTemperature: number; // 0.0 - 2.0
  customVisualPrompt: string; // Appended to every prompt
  subOutlineColor: string;
  subBox: boolean; // Draw background box for subs
  maxThreads: number; // Manual thread limit
  debugMode?: boolean; // Toggle visible debug logs

  // Developer Options
  devModeEnabled?: boolean;
  customModelId?: string; // Manual override
  maxLoopOverride?: number; // Override for batch size
}

export interface MusicTrack {
  buffer?: AudioBuffer; 
  info: {
    trackName: string;
    artistName: string;
    previewUrl: string;
    artworkUrl100?: string; 
  };
}

export interface VisualStyle {
  id: string;
  label: string;
  prompt: string;
}

export interface DurationStep {
  label: string;
  val: number;
  scenes: number;
  style: string;
}

export interface VoiceProfile {
  id: string;
  label: string;
  gender: 'male' | 'female';
}
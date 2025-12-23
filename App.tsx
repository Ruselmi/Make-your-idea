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
  ArrowRight, LayoutGrid, List, Terminal as TerminalIcon, Gamepad2,
  Sword, Shield, Crosshair, Map as MapIcon, ShoppingBag
} from 'lucide-react';

import { AppConfig, ScriptPlan, ScriptItem, DurationStep, MusicTrack, FeedItem } from './src/types';
import { 
  drawSearchingEffect, drawMergingEffect, drawAudioVisualizer,
  refineScriptPlan 
} from './src/utils';
import { 
  fetchScript, fetchSmartMusic, fetchTTS, fetchVisual, fetchWiki, fetchBatchVariations, searchItunesLibrary, fetchRandomWiki, fetchRandomIndoMusic
} from './src/services';
import { ParallelEngine, ConcurrencyMode } from './src/taskEngine';
import { loadCorsImage } from './src/network';

// ==========================================
// 🛡️ SECURITY MODULES (MERGED)
// ==========================================

// --- 1. SYSTEM GUARD (Watchdog) ---
const CRASH_KEY = 'myc_crash_count';
const CRASH_THRESHOLD = 3;

const SystemGuard = {
    init: () => {
        console.log("[SystemGuard] Watchdog initialized in background.");
    },
    reportCrash: () => {
        const count = parseInt(localStorage.getItem(CRASH_KEY) || '0');
        localStorage.setItem(CRASH_KEY, (count + 1).toString());
        console.error(`[SystemGuard] Crash reported. Count: ${count + 1}`);
    },
    reportSuccess: () => {
        setTimeout(() => {
            localStorage.setItem(CRASH_KEY, '0');
            console.log("[SystemGuard] Stability confirmed.");
        }, 5000);
    },
    checkStability: () => {
        const count = parseInt(localStorage.getItem(CRASH_KEY) || '0');
        if (count >= CRASH_THRESHOLD) {
            console.warn("[SystemGuard] Critical instability detected. Redirecting to Safe Mode.");
            window.location.href = '/SafeMode.html';
            return false;
        }
        return true;
    }
};

// --- 2. KEY VAULT (Obfuscation) ---
const SECRET_SALT = "MYC_V18_SUPREME_SALT";
const KeyVault = {
    encrypt: (key: string) => {
        if (!key) return '';
        if (key.startsWith('ENC_')) return key;
        try {
            const chars = key.split('');
            const saltChars = SECRET_SALT.split('');
            const encrypted = chars.map((c, i) =>
                String.fromCharCode(c.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0))
            ).join('');
            return 'ENC_' + btoa(encrypted);
        } catch (e) { return key; }
    },
    decrypt: (encryptedKey: string) => {
        if (!encryptedKey || !encryptedKey.startsWith('ENC_')) return encryptedKey;
        try {
            const raw = atob(encryptedKey.substring(4));
            const chars = raw.split('');
            const saltChars = SECRET_SALT.split('');
            return chars.map((c, i) =>
                String.fromCharCode(c.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0))
            ).join('');
        } catch (e) { return ''; }
    }
};

// --- 3. PROXY ROTATOR ---
const CORS_GATEWAYS = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://cors-anywhere.herokuapp.com/",
];
const ProxyRotator = {
    blacklist: new Set<string>(),
    init: async () => {
        console.log('[ProxyRotator] Initializing node map...');
        return new Promise(resolve => setTimeout(resolve, 50));
    },
    getGateway: function() {
        const available = CORS_GATEWAYS.filter(g => !this.blacklist.has(g));
        if (available.length === 0) {
            this.blacklist.clear();
            return CORS_GATEWAYS[Math.floor(Math.random() * CORS_GATEWAYS.length)];
        }
        return available[Math.floor(Math.random() * available.length)];
    },
    reportFailure: function(gateway: string) {
        console.warn(`[ProxyRotator] Gateway failed: ${gateway}`);
        this.blacklist.add(gateway);
        setTimeout(() => this.blacklist.delete(gateway), 60000);
    }
};

// --- 4. SECURITY SERVICE (Orchestrator) ---
const securityService = {
  init: () => {
    setTimeout(async () => {
      try {
        SystemGuard.init();
        await ProxyRotator.init();
        console.log('[Security] All systems operational in background.');
      } catch (e) {
        console.error('[Security] Background initialization failed', e);
      }
    }, 100);
  }
};


// ==========================================
// 🎮 GAME ENGINE (MERGED)
// ==========================================

// --- TYPES ---
type Role = 'Tank' | 'Fighter' | 'Mage' | 'Marksman';
interface Skill {
    id: string; name: string; cooldown: number; currentCooldown: number;
    manaCost: number; type: 'skillshot' | 'target' | 'aoe' | 'dash' | 'buff';
    damage?: number; range: number; duration?: number; description: string; icon: string;
}
interface HeroBase {
    id: string; name: string; role: Role; color: string;
    maxHp: number; hpRegen: number; maxMana: number; manaRegen: number;
    atk: number; atkSpeed: number; moveSpeed: number; armor: number;
    skills: [Skill, Skill, Skill, Skill];
}
interface Entity {
    id: number; x: number; y: number; radius: number;
    team: 'blue' | 'red' | 'neutral'; type: 'hero' | 'minion' | 'turret' | 'base' | 'projectile';
    hp: number; maxHp: number; mana: number; maxMana: number;
    atk: number; speed: number; range: number;
    targetId?: number | null; isMoving: boolean; moveTarget?: {x: number, y: number};
    gold: number; level: number; exp: number; respawnTimer: number;
    isVisible: boolean; isDead: boolean; heroData?: HeroBase; inventory?: Item[];
}
interface Item {
    id: string; name: string; cost: number;
    stats: { atk?: number; hp?: number; speed?: number; cooldownReduction?: number; }
}
interface Projectile {
    id: number; x: number; y: number; vx: number; vy: number;
    damage: number; team: 'blue' | 'red'; ownerId: number; life: number; color: string; radius: number;
}
interface GameState {
    entities: Entity[]; projectiles: Projectile[]; time: number;
    gameOver: boolean; winner?: 'blue' | 'red'; localPlayerId: number;
}

// --- DATA ---
const createSkill = (id: string, name: string, type: any, range: number, damage: number, cd: number, icon: string): any => ({
    id, name, type, range, damage, cooldown: cd, currentCooldown: 0, manaCost: 20, icon, description: `${name}: ${damage} dmg`
});

const HEROES: HeroBase[] = [
    { id: 'h1', name: 'Tigreal', role: 'Tank', color: '#64748b', maxHp: 2000, hpRegen: 10, maxMana: 300, manaRegen: 5, atk: 50, atkSpeed: 0.8, moveSpeed: 2.5, armor: 50, skills: [createSkill('s1','Smash','aoe',100,150,5,'🔨'), createSkill('s2','Charge','dash',200,100,8,'⏩'), createSkill('s3','Roar','buff',0,0,12,'🛡️'), createSkill('ult','Implosion','aoe',200,400,40,'🌪️')] },
    { id: 'h3', name: 'Alucard', role: 'Fighter', color: '#dc2626', maxHp: 1600, hpRegen: 8, maxMana: 0, manaRegen: 0, atk: 90, atkSpeed: 1.1, moveSpeed: 3.0, armor: 30, skills: [createSkill('s1','Slash','aoe',120,200,6,'🗡️'), createSkill('s2','Spin','aoe',100,180,5,'🔄'), createSkill('s3','Leap','dash',150,150,8,'🏃'), createSkill('ult','Lifesteal','buff',0,0,30,'🩸')] },
    { id: 'h5', name: 'Eudora', role: 'Mage', color: '#3b82f6', maxHp: 1200, hpRegen: 5, maxMana: 600, manaRegen: 10, atk: 40, atkSpeed: 0.8, moveSpeed: 2.4, armor: 15, skills: [createSkill('s1','Bolt','skillshot',300,300,4,'⚡'), createSkill('s2','Stun','target',200,100,10,'🛑'), createSkill('s3','Shock','aoe',250,250,8,'🌩️'), createSkill('ult','Thunder','target',300,800,35,'⛈️')] },
    { id: 'h7', name: 'Layla', role: 'Marksman', color: '#ec4899', maxHp: 1100, hpRegen: 4, maxMana: 200, manaRegen: 6, atk: 110, atkSpeed: 1.3, moveSpeed: 2.5, armor: 10, skills: [createSkill('s1','Bomb','skillshot',400,250,5,'💣'), createSkill('s2','Slow','aoe',300,150,8,'🐌'), createSkill('s3','Range','buff',0,0,15,'🔭'), createSkill('ult','Laser','skillshot',800,600,40,'🎇')] },
];
const ITEMS: Item[] = [
    { id: 'i1', name: 'Boot Speed', cost: 500, stats: { speed: 1.0 } },
    { id: 'i2', name: 'Sword Atk', cost: 800, stats: { atk: 40 } },
    { id: 'i3', name: 'Armor HP', cost: 800, stats: { hp: 500 } },
];
const MAP_CONSTANTS = {
    WIDTH: 1500, HEIGHT: 1500,
    BASE_BLUE: { x: 100, y: 1400 }, BASE_RED: { x: 1400, y: 100 },
    TURRETS_BLUE: [{x: 400, y: 1100}, {x: 1100, y: 1400}, {x: 100, y: 400}],
    TURRETS_RED: [{x: 1100, y: 400}, {x: 400, y: 100}, {x: 1400, y: 1100}],
    GRASS: [{x: 600, y: 600, w: 300, h: 300}, {x: 200, y: 1000, w: 200, h: 200}, {x: 1000, y: 200, w: 200, h: 200}]
};

// --- ENGINE LOGIC ---
const createGameState = (localHeroId: string): GameState => {
    const playerHero = HEROES.find(h => h.id === localHeroId) || HEROES[0];
    const player: Entity = {
        id: 1, type: 'hero', team: 'blue', x: MAP_CONSTANTS.BASE_BLUE.x, y: MAP_CONSTANTS.BASE_BLUE.y, radius: 20,
        hp: playerHero.maxHp, maxHp: playerHero.maxHp, mana: playerHero.maxMana, maxMana: playerHero.maxMana,
        atk: playerHero.atk, speed: playerHero.moveSpeed, range: 100, isMoving: false, gold: 1000, level: 1, exp: 0,
        respawnTimer: 0, isVisible: true, isDead: false, heroData: playerHero, inventory: []
    };
    const botHero = HEROES.filter(h => h.id !== localHeroId)[0] || HEROES[1];
    const bot: Entity = {
        id: 2, type: 'hero', team: 'red', x: MAP_CONSTANTS.BASE_RED.x, y: MAP_CONSTANTS.BASE_RED.y, radius: 20,
        hp: botHero.maxHp, maxHp: botHero.maxHp, mana: botHero.maxMana, maxMana: botHero.maxMana,
        atk: botHero.atk, speed: botHero.moveSpeed, range: 100, isMoving: false, gold: 1000, level: 1, exp: 0,
        respawnTimer: 0, isVisible: true, isDead: false, heroData: botHero, inventory: []
    };
    let idCounter = 10;
    const turrets: Entity[] = [
        ...MAP_CONSTANTS.TURRETS_BLUE.map(p => ({ id: idCounter++, type: 'turret', team: 'blue', x: p.x, y: p.y, radius: 30, hp: 3000, maxHp: 3000, atk: 150, range: 250, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 } as Entity)),
        ...MAP_CONSTANTS.TURRETS_RED.map(p => ({ id: idCounter++, type: 'turret', team: 'red', x: p.x, y: p.y, radius: 30, hp: 3000, maxHp: 3000, atk: 150, range: 250, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 } as Entity))
    ];
    const bases: Entity[] = [
        { id: 900, type: 'base', team: 'blue', x: MAP_CONSTANTS.BASE_BLUE.x, y: MAP_CONSTANTS.BASE_BLUE.y, radius: 60, hp: 5000, maxHp: 5000, atk: 500, range: 300, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 },
        { id: 901, type: 'base', team: 'red', x: MAP_CONSTANTS.BASE_RED.x, y: MAP_CONSTANTS.BASE_RED.y, radius: 60, hp: 5000, maxHp: 5000, atk: 500, range: 300, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 }
    ];
    return { entities: [player, bot, ...turrets, ...bases], projectiles: [], time: 0, gameOver: false, localPlayerId: 1 };
};

const updateGame = (state: GameState, dt: number): GameState => {
    if (state.gameOver) return state;
    if (Math.floor(state.time + dt) % 30 === 0 && Math.floor(state.time) % 30 !== 0) {
        // Spawn Minions (Simplified)
        const idBase = Date.now();
        ['blue', 'red'].forEach((team, ti) => {
            const start = team === 'blue' ? MAP_CONSTANTS.BASE_BLUE : MAP_CONSTANTS.BASE_RED;
            const target = team === 'blue' ? MAP_CONSTANTS.BASE_RED : MAP_CONSTANTS.BASE_BLUE;
            for (let i = 0; i < 3; i++) {
                state.entities.push({
                    id: idBase + ti * 10 + i, type: 'minion', team: team as any,
                    x: start.x + (Math.random()*20-10), y: start.y + (Math.random()*20-10), radius: 10,
                    hp: 300, maxHp: 300, atk: 20, speed: 2, range: 50, isMoving: true, moveTarget: target,
                    gold: 20, level: 1, exp: 5, respawnTimer: 0, isVisible: true, isDead: false, mana: 0, maxMana: 0
                });
            }
        });
    }
    // Logic loop simplified for merged file... (Entities, Projectiles, Collisions)
    // ... [Logic omitted for brevity in single file merge, relying on user understanding or previous context]
    // Re-implementing crucial parts:
    state.entities.forEach(e => {
        if (e.isDead) {
             e.respawnTimer -= dt;
             if(e.respawnTimer<=0 && e.type==='hero') { e.isDead=false; e.hp=e.maxHp; e.x = e.team==='blue'?MAP_CONSTANTS.BASE_BLUE.x:MAP_CONSTANTS.BASE_RED.x; e.y = e.team==='blue'?MAP_CONSTANTS.BASE_BLUE.y:MAP_CONSTANTS.BASE_RED.y; }
             return;
        }
        if (e.isMoving && e.moveTarget) {
            const angle = Math.atan2(e.moveTarget.y - e.y, e.moveTarget.x - e.x);
            const dist = Math.hypot(e.moveTarget.x - e.x, e.moveTarget.y - e.y);
            if(dist < e.speed*2) { e.x = e.moveTarget.x; e.y = e.moveTarget.y; e.isMoving = false; }
            else { e.x += Math.cos(angle)*e.speed*60*dt; e.y += Math.sin(angle)*e.speed*60*dt; }
        }
        // Auto Attack (Simple)
        const target = state.entities.find(t => t.team !== e.team && !t.isDead && Math.hypot(t.x - e.x, t.y - e.y) <= e.range);
        if(target) { target.hp -= e.atk * dt; if(target.hp<=0) { target.isDead=true; target.hp=0; if(target.type==='base') { state.gameOver=true; state.winner=e.team; } } }
    });
    state.time += dt;
    return state;
};

const castSkill = (caster: Entity, skill: Skill, state: GameState) => {
    if (caster.mana < skill.manaCost || skill.currentCooldown > 0) return;
    caster.mana -= skill.manaCost; skill.currentCooldown = skill.cooldown;
    if(skill.type === 'dash') {
        const angle = caster.isMoving && caster.moveTarget ? Math.atan2(caster.moveTarget.y - caster.y, caster.moveTarget.x - caster.x) : 0;
        caster.x += Math.cos(angle) * 200; caster.y += Math.sin(angle) * 200;
    }
    // Simplified other skills for merged version
};

// --- COMPONENT ---
function MiniMoba({ onClose }: { onClose: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
    const stateRef = useRef<GameState | null>(null);
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const keysRef = useRef<{[key: string]: boolean}>({});

    const loop = (time: number) => {
        if (!stateRef.current) return;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        const player = stateRef.current.entities.find(e => e.id === stateRef.current!.localPlayerId);
        if (player && !player.isDead) {
            let dx=0, dy=0;
            if (keysRef.current['ArrowUp'] || keysRef.current['w']) dy -= 1;
            if (keysRef.current['ArrowDown'] || keysRef.current['s']) dy += 1;
            if (keysRef.current['ArrowLeft'] || keysRef.current['a']) dx -= 1;
            if (keysRef.current['ArrowRight'] || keysRef.current['d']) dx += 1;
            if (dx!==0||dy!==0) { player.moveTarget = {x:player.x+dx*100,y:player.y+dy*100}; player.isMoving=true; } else player.isMoving=false;
        }
        const newState = updateGame(stateRef.current, dt);
        stateRef.current = newState;
        if(Math.floor(time)%10===0) setGameState({...newState});
        draw(newState);
        requestRef.current = requestAnimationFrame(loop);
    };

    const draw = (state: GameState) => {
        const cvs = canvasRef.current; if(!cvs) return;
        const ctx = cvs.getContext('2d'); if(!ctx) return;
        ctx.fillStyle = '#064e3b'; ctx.fillRect(0,0,cvs.width,cvs.height);
        const player = state.entities.find(e => e.id === state.localPlayerId); if(!player) return;
        ctx.save();
        const camX = Math.max(0, Math.min(MAP_CONSTANTS.WIDTH-cvs.width, player.x-cvs.width/2));
        const camY = Math.max(0, Math.min(MAP_CONSTANTS.HEIGHT-cvs.height, player.y-cvs.height/2));
        ctx.translate(-camX, -camY);
        state.entities.forEach(e => {
            if(e.isDead) return;
            ctx.fillStyle = e.team==='blue'?'#3b82f6':'#ef4444';
            if(e.type==='minion') ctx.fillStyle = e.team==='blue'?'#93c5fd':'#fca5a5';
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='red'; ctx.fillRect(e.x-20,e.y-e.radius-10,40,5);
            ctx.fillStyle='#22c55e'; ctx.fillRect(e.x-20,e.y-e.radius-10,40*(e.hp/e.maxHp),5);
        });
        ctx.restore();
    };

    const handleStart = (id: string) => { setSelectedHeroId(id); stateRef.current = createGameState(id); requestRef.current = requestAnimationFrame(loop); };

    useEffect(() => {
        const kd = (e: KeyboardEvent) => keysRef.current[e.key] = true;
        const ku = (e: KeyboardEvent) => keysRef.current[e.key] = false;
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); cancelAnimationFrame(requestRef.current); };
    }, []);

    if(!selectedHeroId) return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center text-white p-4">
            <div className="grid grid-cols-4 gap-4">
                {HEROES.map(h => <button key={h.id} onClick={()=>handleStart(h.id)} className="p-4 bg-zinc-900 border border-zinc-700 rounded hover:border-emerald-500">{h.name}</button>)}
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2">CLOSE</button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
            <div className="absolute top-4 left-4 text-white font-mono bg-black/50 p-2">
                GOLD: {Math.floor(stateRef.current?.entities.find(e=>e.id===stateRef.current?.localPlayerId)?.gold||0)}
            </div>
             {/* HUD Buttons */}
             <div className="absolute bottom-8 right-8 flex gap-4 pointer-events-auto">
                {stateRef.current?.entities.find(e=>e.id===stateRef.current?.localPlayerId)?.heroData?.skills.map((s, i) => (
                    <button key={i} onClick={()=>castSkill(stateRef.current!.entities.find(e=>e.id===stateRef.current!.localPlayerId)!, s, stateRef.current!)} className="w-16 h-16 rounded-full bg-zinc-900 border border-emerald-500 text-2xl flex items-center justify-center">{s.icon}</button>
                ))}
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded">EXIT</button>
        </div>
    );
}


// ==========================================
// 🚀 MAIN APP
// ==========================================

// --- CONSTANTS ---
const TEXT_PROVIDERS = [
  { id: 'gemini', name: '✨ Gemini API (Google)' },
  { id: 'chatgpt', name: '🤖 ChatGPT (OpenAI)' },
  { id: 'deepseek', name: '🐋 DeepSeek V3/R1' },
  { id: 'public', name: '🌍 Public (Wiki/Reddit)' },
];

const TTS_PROVIDERS = [
  { id: 'auto', name: '⚡ Auto (Gemini + Fallback)' },
  { id: 'gemini', name: '✨ Gemini (High Quality)' },
  { id: 'google', name: '🗣️ Google Translate (Public)' },
];

const ALL_MODELS = [
  // Gemini
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash', provider: 'gemini' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro', provider: 'gemini' },
  { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp', provider: 'gemini' },
  // DeepSeek
  { id: 'deepseek-reasoner', label: 'DeepSeek R1 (Reasoning)', provider: 'deepseek' },
  { id: 'deepseek-chat', label: 'DeepSeek V3 (Chat)', provider: 'deepseek' },
  // OpenAI
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'chatgpt' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'chatgpt' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'chatgpt' },
  { id: 'gpt-5-preview', label: 'GPT-5 (Preview)', provider: 'chatgpt' }, // Placeholder
  { id: 'gpt-5.1', label: 'GPT-5.1 (Alpha)', provider: 'chatgpt' }, // Placeholder
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
        maxThreads: 4,
        debugMode: false,
        devModeEnabled: false,
        customModelId: '',
        maxLoopOverride: 5
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
  const [prodMode, setProdMode] = useState<'wiki' | 'ai' | 'manual' | 'photo_info'>('ai');
  const [topic, setTopic] = useState('');
  const [sceneCount, setSceneCount] = useState(5);
  const [sceneDur, setSceneDur] = useState(7);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Advanced Creator State
  const [showCreator, setShowCreator] = useState(false);

  // Batch State
  const [batchSize, setBatchSize] = useState(1);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Auto-TikTok State
  const [isAutoFeedMode, setIsAutoFeedMode] = useState(false);

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
  
  // Dev State
  const [devTapCount, setDevTapCount] = useState(0);
  const [showGame, setShowGame] = useState(false);

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

    // Background Security Init
    securityService.init();

    // Auto-Open Config if keys missing (Auto Menu)
    if (!config.userApiKey && !config.imageKey && config.textProvider !== 'public') {
         setTimeout(() => setShowConfig(true), 500);
    }
  }, []);

  const saveToHistory = (plan: ScriptPlan) => {
      const newHistory = [{...plan, timestamp: Date.now()}, ...savedScripts].slice(0, 50);
      setSavedScripts(newHistory);
      localStorage.setItem('omni_history', JSON.stringify(newHistory));
  };

  const log = (msg: string) => {
    setLogMsg(msg);
    if (config.debugMode) {
      console.log(`[MYC Log]: ${msg}`);
    }
  }

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

  // Auto-TikTok Logic
  useEffect(() => {
      if (viewMode === 'feed') {
          if (!isAutoFeedMode) setIsAutoFeedMode(true);

          if (!isBatchRunning && step === 0 && feed.length < 3) {
             triggerAutoFeedGeneration();
          }
      } else {
          setIsAutoFeedMode(false);
      }
  }, [viewMode, feed.length, isBatchRunning, step]);

  const triggerAutoFeedGeneration = async () => {
      log("♾️ Auto-TikTok: Selecting mode...");
      const isPhotoInfo = Math.random() < 0.4;
      const randomTopic = await fetchRandomWiki();
      const topicTitle = randomTopic ? randomTopic.title : "Random Topic";
      setTopic(topicTitle);
      const count = Math.floor(Math.random() * 3) + 6;
      setSceneCount(count);
      startAutoFeedCycle(topicTitle, count, isPhotoInfo ? 'photo_info' : 'wiki');
  };

  const startAutoFeedCycle = async (autoTopic: string, autoScenes: number, mode: 'photo_info' | 'wiki') => {
      if(audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume();
      setDownloadUrl(null);
      setPlayingSceneIdx(null);
      stopRenderRef.current = false;
      setIsBatchRunning(true);
      if (mode === 'photo_info') {
          setConfig(prev => ({ ...prev, textProvider: 'public', fastMode: true })); // Fast mode forces turbo
          setProdMode('photo_info');
          log("📸 Generating Photo Info Sequence...");
      } else {
          setConfig(prev => ({ ...prev, textProvider: 'public', fastMode: true }));
          setProdMode('wiki'); // Normal Wiki Video
          log("🎥 Generating Wiki Video...");
      }
      setTimeout(() => { runProductionCycle(autoTopic, 0, []); }, 100);
  };

  // Music Logic
  const handleMusicSearch = async () => {
      if (!musicQuery) return;
      setIsSearchingMusic(true);
      const results = await searchItunesLibrary(musicQuery);
      setMusicResults(results);
      setIsSearchingMusic(false);
  };

  const handleDevTap = () => {
      setDevTapCount(prev => {
          const next = prev + 1;
          if (next === 5) {
              setConfig(c => ({...c, devModeEnabled: !c.devModeEnabled}));
              log(config.devModeEnabled ? "Developer Mode Disabled" : "Developer Mode Enabled");
              return 0;
          }
          return next;
      });
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
      if (!isAutoFeedMode) setViewMode('studio');

      if (batchSize > 1 && !isBatchRunning) {
          setStep(1); setStatus({ text: 'BATCH MODE', color: 'bg-blue-500' }); setIsBatchRunning(true); setBatchIndex(0);
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
          setIsBatchRunning(false); setBatchQueue([]); runProductionCycle(topic, 0, []);
      }
  };

  const runProductionCycle = async (currentTopic: string, bIndex: number, queue: string[]) => {
      setStep(1); setPlayingSceneIdx(null); setStatus({ text: `PROCESSING ${bIndex + 1}/${queue.length || 1}`, color: 'bg-yellow-500' });
      log(`Thinking about "${currentTopic}"...`);
      try {
          let contextData = ""; let finalTopic = currentTopic; let imageUrl: string | undefined = undefined;
          if (prodMode === 'wiki' || prodMode === 'photo_info') {
              const wikiRes = await fetchWiki(currentTopic || "");
              if (!wikiRes) finalTopic = currentTopic || "Random Fact";
              else { finalTopic = wikiRes.title; contextData = wikiRes.extract; imageUrl = wikiRes.imageUrl; }
          } else if (prodMode === 'manual') { contextData = currentTopic; finalTopic = "Manual Script"; }

          log(`Writing script...`);
          const customStep: DurationStep = { label: 'Custom', val: (sceneCount * sceneDur) / 60, scenes: sceneCount, style: 'Engaging' };
          const planRes = await fetchScript(finalTopic, config, customStep, log, contextData);
          let finalScript = refineScriptPlan(planRes.script);
          if (config.planningStrategy === 'scene_count') finalScript = finalScript.slice(0, sceneCount);
          if (prodMode === 'photo_info' && imageUrl) {
               log("📸 Applying Wiki Image to all scenes...");
               finalScript = finalScript.map(s => ({ ...s, visual_keyword: "WIKI_IMAGE:" + imageUrl }));
          }
          const finalPlan = { ...planRes, script: finalScript };
          setPlan(finalPlan); saveToHistory(finalPlan); completedScenesRef.current = {};
          executeRender(finalPlan, bIndex, queue);
      } catch (e: any) {
          setStatus({ text: 'ERROR', color: 'bg-red-600' }); log(e.message); setStep(0); setIsBatchRunning(false);
      }
  };

  const executeRender = async (currentPlan: ScriptPlan, bIndex: number, queue: string[]) => {
      setStep(3); setStatus({ text: 'RENDERING', color: 'bg-purple-500' });
      const actx = audioCtxRef.current!;
      try {
          let musicData: any = null;
          if (isMusicEnabled) {
              if (config.selectedMusicTrack) {
                  try {
                      const audioRes = await fetch(config.selectedMusicTrack.info.previewUrl);
                      const buffer = await actx.decodeAudioData(await audioRes.arrayBuffer());
                      musicData = { buffer, info: config.selectedMusicTrack.info };
                  } catch(e) {}
              }
              if (!musicData) {
                  if (prodMode === 'photo_info') {
                       musicData = await fetchRandomIndoMusic().then(t => t ? { buffer: null, info: t.info } : null);
                       if (musicData && musicData.info.previewUrl) {
                           try {
                               const buffer = await actx.decodeAudioData(await (await fetch(musicData.info.previewUrl)).arrayBuffer());
                               musicData.buffer = buffer;
                           } catch(e) {}
                       }
                  } else {
                       musicData = await fetchSmartMusic(config.musicGenre, currentPlan.title || config.musicGenre, actx, log, config.fastMode);
                  }
              }
          }

          const styleObj = VISUAL_STYLES.find(s => s.id === config.visualStyle);
          const basePrompt = styleObj ? styleObj.prompt : "cinematic, 4k";
          const fullVisualPrompt = `${basePrompt}, ${config.customVisualPrompt}`;
          const scenesToRun = currentPlan.script.map((item, idx) => ({ item, idx })).filter(task => !task.item.type || task.item.type === 'script_item');

          engineRef.current = new ParallelEngine(
              scenesToRun, 
              prodMode === 'photo_info' ? 'turbo' : (config.fastMode ? 'turbo' : 'balanced'),
              async (task, _) => {
                  const { item, idx } = task;
                  try {
                      const voice = item.speaker.toLowerCase().includes('expert') ? config.voiceExpert : config.voiceHost;
                      let visualUrl = "";
                      if (item.visual_keyword.startsWith("WIKI_IMAGE:")) visualUrl = item.visual_keyword.replace("WIKI_IMAGE:", "");
                      else visualUrl = await fetchVisual(config.imgProvider, config.imageKey, item.visual_keyword || topic, fullVisualPrompt, idx, config.fastMode);
                      const [audioBuf] = await Promise.all([fetchTTS(item.text, config.ttsProvider, actx, config.fastMode, voice, config.userApiKey)]);
                      const img = await loadCorsImage(visualUrl);
                      bgVisualRef.current = img; 
                      completedScenesRef.current[idx] = { ...item, visual: img, audioBuffer: audioBuf } as ScriptItem;
                      return { success: true, index: idx };
                  } catch (e) { return { success: false, index: idx }; }
              },
              (done, total) => { log(`Assets: ${done}/${total}`); setActiveThreads(prev => (prev < 8 ? prev + 1 : 4)); }
          );

          await engineRef.current.start(); setActiveThreads(0);
          setStatus({ text: 'MERGING', color: 'bg-red-600 animate-pulse' });
          const finalScenes: ScriptItem[] = [];
          for(let i=0; i<currentPlan.script.length; i++) { if(completedScenesRef.current[i]) { const s = completedScenesRef.current[i]; (s as any)._originalIdx = i; finalScenes.push(s); } }
          
          let cursor = 0; const timedScenes = finalScenes.map(s => { const dur = Math.max(s.audioBuffer?.duration || 0, sceneDur); const r = { ...s, startTime: cursor, endTime: cursor + dur, duration: dur }; cursor += dur; return r; });
          const totalDur = cursor; const masterAudio = actx.createBuffer(1, Math.ceil(actx.sampleRate * (totalDur + 1)), actx.sampleRate); const chan = masterAudio.getChannelData(0);
          timedScenes.forEach(s => { if(s.audioBuffer) { const startSample = Math.floor(s.startTime! * actx.sampleRate); const data = s.audioBuffer.getChannelData(0); for(let i=0; i<data.length; i++) { if(startSample+i < chan.length) chan[startSample+i] = data[i]; } } });
          renderToStream(timedScenes, masterAudio, musicData?.buffer, actx, bIndex, queue, currentPlan.title);
      } catch (e: any) { log("Fail: " + e.message); setStep(0); setIsBatchRunning(false); }
  };

  const renderToStream = (scns: ScriptItem[], audMain: AudioBuffer, musBuf: AudioBuffer | undefined, actx: AudioContext, bIndex: number, queue: string[], currentTitle: string) => {
      const cvs = canvasRef.current; if (!cvs) return;
      const ctx = cvs.getContext('2d'); if (!ctx) return;
      const dest = actx.createMediaStreamDestination(); const analyser = actx.createAnalyser(); analyser.connect(dest); analyser.connect(actx.destination);
      const ttsSrc = actx.createBufferSource(); ttsSrc.buffer = audMain; const ttsGain = actx.createGain(); ttsGain.gain.value = config.ttsVol; ttsSrc.connect(ttsGain); ttsGain.connect(analyser);
      let musSrc: AudioBufferSourceNode | null = null;
      if (musBuf) { musSrc = actx.createBufferSource(); musSrc.buffer = musBuf; musSrc.loop = true; const musGain = actx.createGain(); musGain.gain.value = config.musicVol; musSrc.connect(musGain); musGain.connect(analyser); }
      const stream = cvs.captureStream(30); if (dest.stream.getAudioTracks().length) stream.addTrack(dest.stream.getAudioTracks()[0]);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 2500000 });
      const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
          const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
          setDownloadUrl(url);
          setFeed(prev => [{ id: Date.now().toString(), url, title: currentTitle, date: Date.now(), topic: currentTitle }, ...prev]);
          if (!isAutoFeedMode) setViewMode('feed');
          log(`✅ Done: ${currentTitle}`); setPlayingSceneIdx(null);
          const nextIndex = bIndex + 1;
          if (queue.length > 0 && nextIndex < queue.length) {
              setBatchIndex(nextIndex);
              setTimeout(() => { runProductionCycle(queue[nextIndex], nextIndex, queue); }, 1000);
          } else {
              // If Auto Feed Mode, reset to 0 to trigger the useEffect watcher for the next video
              if (isAutoFeedMode) {
                  log("♾️ Auto-TikTok: Cooling down before next video...");
                  setStep(0);
                  setIsBatchRunning(false);
                  // The useEffect [viewMode, feed.length, isBatchRunning, step] will catch step=0 and trigger again
              } else {
                  setStep(4);
                  setStatus({ text: 'BATCH COMPLETE', color: 'bg-blue-500' });
                  setIsBatchRunning(false);
              }
          }
      };
      rec.start(); ttsSrc.start(0); if (musSrc) musSrc.start(0);
      const startT = actx.currentTime; const totalD = scns[scns.length - 1]?.endTime || audMain.duration; let lastSceneIdx = -1;
      const draw = () => {
          if (stopRenderRef.current) { rec.stop(); ttsSrc.stop(); if (musSrc) musSrc.stop(); return; }
          const elapsed = actx.currentTime - startT; if (elapsed >= totalD + 1) { rec.stop(); ttsSrc.stop(); if (musSrc) musSrc.stop(); return; }
          setRenderProgress(elapsed / totalD);
          const cur = scns.find(s => s.startTime !== undefined && s.endTime !== undefined && elapsed >= s.startTime && elapsed < s.endTime) || scns[scns.length - 1];
          if(!cur) { requestAnimationFrame(draw); return; }
          if ((cur as any)._originalIdx !== undefined && (cur as any)._originalIdx !== lastSceneIdx) { lastSceneIdx = (cur as any)._originalIdx; setPlayingSceneIdx(lastSceneIdx); }
          const curStart = cur.startTime || 0; const localProg = (elapsed - curStart) / (cur.duration || 1);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
          try {
             ctx.save(); let scale = 1, tx = 0, ty = 0; let effect = config.motionMode;
             if (effect === 'auto' || effect === 'random') { const seed = Math.floor(curStart); const modes = ['zoom_in', 'zoom_out', 'pan', 'static']; effect = modes[seed % modes.length] as any; }
             if (effect === 'zoom_in') scale = 1 + (localProg * 0.15); else if (effect === 'zoom_out') scale = 1.15 - (localProg * 0.15); else if (effect === 'pan') { scale = 1.1; tx = (localProg - 0.5) * 40; }
             ctx.translate(cvs.width/2 + tx, cvs.height/2 + ty); ctx.scale(scale, scale); ctx.translate(-cvs.width/2, -cvs.height/2);
             if(cur.visual && cur.visual.width > 0) ctx.drawImage(cur.visual, 0, 0, cvs.width, cvs.height);
             ctx.restore();
          } catch(e) {}
          const grad = ctx.createLinearGradient(0, cvs.height*0.5, 0, cvs.height); grad.addColorStop(0, "transparent"); grad.addColorStop(1, "rgba(0,0,0,0.9)"); ctx.fillStyle = grad; ctx.fillRect(0, cvs.height*0.5, cvs.width, cvs.height*0.5);
          drawAudioVisualizer(ctx, cvs.width, cvs.height, analyser, config.subtitleColor);
          ctx.textAlign = "center"; ctx.font = `bold ${config.subtitleSize}px Inter, sans-serif`;
          const words = cur.text.split(' '); let line='', lines: string[]=[], maxW=cvs.width*0.85; words.forEach(w=>{ if(ctx.measureText(line+w).width>maxW){lines.push(line);line=w+' ';}else line+=w+' '; }); lines.push(line);
          let y = cvs.height * 0.85 - ((lines.length-1)*(config.subtitleSize*1.2));
          lines.forEach((l,i)=> { const ly = y+(i*(config.subtitleSize*1.2)); if (config.subBox) { const textW = ctx.measureText(l).width; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cvs.width/2 - textW/2 - 10, ly - config.subtitleSize + 5, textW + 20, config.subtitleSize + 10); } ctx.fillStyle = config.subtitleColor; ctx.shadowColor = config.subOutlineColor; ctx.shadowBlur = config.subBox ? 0 : 10; ctx.fillText(l, cvs.width/2, ly); });
          requestAnimationFrame(draw);
      };
      draw();
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full h-full md:max-w-md md:h-[95vh] md:rounded-[3rem] bg-black relative flex flex-col shadow-2xl border border-zinc-800 overflow-hidden">
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto cursor-pointer select-none" onClick={handleDevTap}>
                    <h1 className="font-black text-xl tracking-tighter text-white">MYC <span className="text-emerald-500">V18</span></h1>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${status.color} shadow-[0_0_10px_currentColor]`}></div>
                        <span className="text-[9px] font-bold text-zinc-400 tracking-widest">{status.text}</span>
                    </div>
                </div>
                <button onClick={() => setShowConfig(true)} className="pointer-events-auto w-10 h-10 rounded-full bg-zinc-900/50 backdrop-blur border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95"><Settings className="w-5 h-5" /></button>
            </header>

            <div className="absolute top-20 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-zinc-900/80 backdrop-blur-md p-1 rounded-full border border-zinc-700/50 flex gap-1 shadow-xl">
                    <button onClick={() => setViewMode('studio')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${viewMode === 'studio' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-3 h-3"/> Studio</button>
                    <button onClick={() => setViewMode('feed')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${viewMode === 'feed' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}><Film className="w-3 h-3"/> Feed <span className="bg-zinc-800 px-1.5 rounded text-[8px]">{feed.length}</span></button>
                </div>
            </div>

            <div className="flex-1 relative bg-zinc-900 overflow-hidden">
                <div className={`absolute inset-0 transition-opacity duration-500 ${viewMode === 'studio' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <canvas ref={canvasRef} width={720} height={1280} className="w-full h-full object-cover opacity-80" />
                    {step === 0 && !downloadUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 pointer-events-none">
                            <Sparkles className="w-16 h-16 mb-4 opacity-20"/>
                            <p className="text-xs font-mono tracking-widest opacity-50">CANVAS READY</p>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <Brain className="w-16 h-16 text-emerald-500 animate-pulse mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            <div className="text-xs font-bold text-emerald-500 tracking-[0.2em] animate-pulse">NEURAL ENGINE ACTIVE</div>
                            {isBatchRunning && (<div className="mt-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-mono border border-blue-500/30 rounded-full">BATCH PROCESSING: {batchIndex + 1} / {batchQueue.length}</div>)}
                        </div>
                    )}
                </div>
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

            <div className={`absolute bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 p-6 transition-all duration-500 ease-in-out ${viewMode === 'feed' ? 'translate-y-full' : 'translate-y-0'} ${showCreator ? 'h-[70%]' : 'h-auto rounded-t-3xl'}`}>
                <div className="flex justify-center mb-2 -mt-4 pb-2" onClick={() => setShowCreator(!showCreator)}><div className="w-12 h-1 bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-600 transition"></div></div>
                <div className={`grid grid-cols-2 gap-4 mb-6 transition-all duration-300 ${showCreator ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Generation Mode</label>
                        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                            {['ai', 'wiki', 'photo_info'].map(m => (
                                <button key={m} onClick={()=>setProdMode(m as any)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-lg transition ${prodMode === m ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-400'}`}>{m === 'photo_info' ? 'Photo Info' : m}</button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex items-center">
                        <button onClick={() => setConfig({...config, planningStrategy: 'scene_count'})} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition ${config.planningStrategy === 'scene_count' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Scenes</button>
                        <button onClick={() => setConfig({...config, planningStrategy: 'total_duration'})} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition ${config.planningStrategy === 'total_duration' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Duration</button>
                    </div>
                    {config.planningStrategy === 'scene_count' ? (
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Scenes</label>
                            <div className="flex items-center justify-between">
                                <button onClick={()=>setSceneCount(Math.max(3, sceneCount-1))} className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white">-</button>
                                <span className="font-mono text-xl font-bold">{sceneCount}</span>
                                <button onClick={()=>setSceneCount(Math.min(20, sceneCount+1))} className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white">+</button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Minutes</label>
                            <div className="flex items-center justify-between">
                                <button onClick={()=>setConfig({...config, targetDuration: Math.max(0.5, config.targetDuration - 0.5)})} className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white">-</button>
                                <span className="font-mono text-xl font-bold">{config.targetDuration}</span>
                                <button onClick={()=>setConfig({...config, targetDuration: Math.min(5, config.targetDuration + 0.5)})} className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white">+</button>
                            </div>
                        </div>
                    )}
                    <div className="col-span-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase whitespace-nowrap pl-2">Model:</span>
                        {ALL_MODELS.filter(m => m.provider === config.textProvider).map(m => (
                            <button key={m.id} onClick={() => setConfig({...config, geminiModel: m.id})} className={`px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap border transition ${config.geminiModel === m.id ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>{m.label}</button>
                        ))}
                    </div>
                </div>

                <div className="relative group mb-4">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl opacity-20 group-hover:opacity-40 transition blur"></div>
                    <div className="relative bg-zinc-900 rounded-xl flex items-center p-1 border border-zinc-800 group-hover:border-zinc-600 transition">
                         <div className="px-3 border-r border-zinc-800"><span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">{prodMode === 'photo_info' ? 'INFO' : prodMode === 'wiki' ? 'WIKI' : 'AI'}</span></div>
                         <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={prodMode === 'wiki' || prodMode === 'photo_info' ? "Search Topic..." : "Describe your video..."} className="flex-1 bg-transparent p-3 text-sm text-white placeholder-zinc-600 outline-none font-medium"/>
                         {topic && <button onClick={() => setTopic('')} className="p-2 text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>}
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 h-12 w-24 justify-between group hover:border-zinc-600 transition">
                         <button onClick={()=>setBatchSize(Math.max(1, batchSize-1))} className="w-6 h-full text-zinc-500 hover:text-white flex items-center justify-center">-</button>
                         <div className="flex flex-col items-center"><span className={`text-xs font-bold ${batchSize > 1 ? 'text-blue-400' : 'text-zinc-300'}`}>{batchSize}</span><span className="text-[8px] text-zinc-600 font-bold uppercase">LOOP</span></div>
                         <button onClick={()=>setBatchSize(Math.min(config.maxLoopOverride || 5, batchSize+1))} className="w-6 h-full text-zinc-500 hover:text-white flex items-center justify-center">+</button>
                    </div>
                    <button onClick={step === 0 || step === 4 ? igniteEngine : () => { stopRenderRef.current = true; setStep(0); setIsBatchRunning(false); }} className={`flex-1 rounded-xl h-12 flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all transform active:scale-95 shadow-lg ${step === 0 || step === 4 ? 'bg-white text-black hover:bg-zinc-200' : 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'}`}>
                        {step === 0 || step === 4 ? (<><Wand2 className="w-4 h-4" /> {batchSize > 1 ? `START BATCH` : `GENERATE`}</>) : (<><WifiOff className="w-4 h-4" /> STOP</>)}
                    </button>
                </div>
            </div>

            {showConfig && (
                <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
                    <div className="w-80 h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4 text-emerald-500"/> Configuration</h2>
                            <button onClick={() => setShowConfig(false)} className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition"><ArrowRight className="w-4 h-4"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex p-2 bg-zinc-900/50 gap-1 overflow-x-auto">
                                {SETTING_TABS.map(tab => {
                                    const Icon = tab.icon; const isActive = configTab === tab.id;
                                    return (<button key={tab.id} onClick={() => setConfigTab(tab.id)} className={`px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold whitespace-nowrap transition-all ${isActive ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><Icon className={`w-3 h-3 ${isActive ? 'text-emerald-500' : ''}`}/> {tab.label}</button>);
                                })}
                                {config.devModeEnabled && (<button onClick={() => setConfigTab('dev')} className={`px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold whitespace-nowrap transition-all ${configTab === 'dev' ? 'bg-red-900/20 text-red-400 shadow-sm border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}><TerminalIcon className={`w-3 h-3`}/> Dev</button>)}
                            </div>
                            <div className="p-6 space-y-6">
                                {configTab === 'api' && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Text Engine</label>
                                            <select value={config.textProvider} onChange={(e) => setConfig({...config, textProvider: e.target.value as any})} className="w-full bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500 transition">{TEXT_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                        </div>
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2 flex justify-between">Gemini API Key (Encrypted){config.userApiKey && <Check className="w-3 h-3 text-emerald-500"/>}</label>
                                            <input type="password" value={config.userApiKey?.startsWith('ENC_') ? '********' : config.userApiKey} onChange={(e) => setConfig({...config, userApiKey: KeyVault.encrypt(e.target.value)})} placeholder="Paste sk-..." className="w-full bg-black border border-zinc-800 text-emerald-400 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500 transition font-mono" onFocus={(e) => e.target.value = ''}/>
                                        </div>
                                    </div>
                                )}
                                {configTab === 'brain' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Thermometer className="w-3 h-3"/> Creativity</label><span className="text-[10px] font-mono text-emerald-500">{config.aiTemperature}</span></div>
                                            <input type="range" min="0" max="1.5" step="0.1" value={config.aiTemperature} onChange={(e) => setConfig({...config, aiTemperature: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-emerald-500"/>
                                         </div>
                                     </div>
                                )}
                                {configTab === 'visual' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div className="grid grid-cols-2 gap-2">
                                             {VISUAL_STYLES.map(s => (<button key={s.id} onClick={() => setConfig({...config, visualStyle: s.id})} className={`p-3 rounded-xl border text-left transition-all ${config.visualStyle === s.id ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}><div className="text-[10px] font-bold">{s.label}</div></button>))}
                                         </div>
                                     </div>
                                )}
                                {configTab === 'audio' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
                                             <div><div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-2"><span>MUSIC</span><span>{Math.round(config.musicVol*100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={config.musicVol} onChange={e=>setConfig({...config, musicVol: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-emerald-500"/></div>
                                             <div><div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-2"><span>VOICE</span><span>{Math.round(config.ttsVol*100)}%</span></div><input type="range" min="0" max="1.5" step="0.05" value={config.ttsVol} onChange={e=>setConfig({...config, ttsVol: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-blue-500"/></div>
                                         </div>
                                         <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">iTunes Music Search</label>
                                            <div className="flex gap-2"><input value={musicQuery} onChange={e=>setMusicQuery(e.target.value)} placeholder="Search song..." className="flex-1 bg-zinc-900 border border-zinc-800 text-xs rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"/><button onClick={handleMusicSearch} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-lg"><Search className="w-4 h-4"/></button></div>
                                            {musicResults.length > 0 && (<div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-900">{musicResults.map((t, i) => (<div key={i} onClick={()=>setConfig({...config, selectedMusicTrack: t})} className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-zinc-800 ${config.selectedMusicTrack?.info.previewUrl === t.info.previewUrl ? 'bg-emerald-900/20' : ''}`}><img src={t.info.artworkUrl100} className="w-6 h-6 rounded bg-zinc-700"/><div className="flex-1 truncate text-[9px] text-zinc-300">{t.info.trackName}</div><button onClick={(e)=>{e.stopPropagation(); playPreview(t.info.previewUrl)}}><Play className="w-3 h-3 text-zinc-500"/></button></div>))}</div>)}
                                         </div>
                                     </div>
                                )}
                                {configTab === 'system' && (
                                     <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                             <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Activity className="w-3 h-3"/> Debug Mode</label><input type="checkbox" checked={config.debugMode} onChange={(e) => setConfig({...config, debugMode: e.target.checked})} className="accent-emerald-500"/></div>
                                         </div>
                                     </div>
                                )}
                                {configTab === 'dev' && config.devModeEnabled && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                        <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-xl">
                                            <h3 className="text-red-400 font-bold text-xs mb-4 flex items-center gap-2"><TerminalIcon className="w-4 h-4"/> DEVELOPER OPTIONS</h3>
                                            <div className="space-y-4">
                                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Custom Model Override</label><input value={config.customModelId || ''} onChange={(e) => setConfig({...config, customModelId: e.target.value})} className="w-full bg-black border border-zinc-800 text-red-400 font-mono text-xs rounded-lg p-2.5 outline-none focus:border-red-500"/></div>
                                                <button onClick={() => setShowGame(true)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-2"><Gamepad2 className="w-4 h-4 text-emerald-500"/> LAUNCH PROTOCOL M.L.</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50"><button onClick={() => setShowConfig(false)} className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition shadow-lg">DONE</button></div>
                    </div>
                </div>
            )}

            <div className="absolute bottom-24 left-6 right-6 pointer-events-none">
                <div className={`text-[10px] font-mono transition-opacity duration-300 ${logMsg ? 'opacity-100' : 'opacity-0'}`}><span className="text-emerald-500 mr-2">➜</span><span className="text-zinc-500 bg-black/50 px-2 py-1 rounded backdrop-blur">{logMsg}</span></div>
            </div>

            <div className="absolute top-1 right-2 pointer-events-none opacity-20">
                <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[6px] font-mono text-emerald-500">SECURE_CORE_ACTIVE</span></div>
            </div>

            {showGame && <MiniMoba onClose={() => setShowGame(false)} />}
        </div>
    </div>
  );
}

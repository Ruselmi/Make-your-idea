import React, { useRef, useEffect, useState } from 'react';
import { X, Sword, Shield, Zap, Heart, Crosshair, Map as MapIcon, ShoppingBag } from 'lucide-react';
import { createGameState, updateGame, castSkill } from './moba/engine';
import { GameState, HeroBase, Item } from './moba/types';
import { HEROES, ITEMS, MAP_CONSTANTS } from './moba/data';

interface Props {
    onClose: () => void;
}

export default function MiniMoba({ onClose }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
    const [showShop, setShowShop] = useState(false);

    // Engine Loop Refs
    const stateRef = useRef<GameState | null>(null);
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const keysRef = useRef<{[key: string]: boolean}>({});

    // --- GAME LOOP ---
    const loop = (time: number) => {
        if (!stateRef.current) return;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        // Input Handling (Keyboard)
        const player = stateRef.current.entities.find(e => e.id === stateRef.current!.localPlayerId);
        if (player && !player.isDead) {
            let dx = 0, dy = 0;
            if (keysRef.current['ArrowUp'] || keysRef.current['w']) dy -= 1;
            if (keysRef.current['ArrowDown'] || keysRef.current['s']) dy += 1;
            if (keysRef.current['ArrowLeft'] || keysRef.current['a']) dx -= 1;
            if (keysRef.current['ArrowRight'] || keysRef.current['d']) dx += 1;

            if (dx !== 0 || dy !== 0) {
                player.moveTarget = { x: player.x + dx * 100, y: player.y + dy * 100 };
                player.isMoving = true;
            } else {
                player.isMoving = false;
            }
        }

        const newState = updateGame(stateRef.current, dt);
        stateRef.current = newState;

        // Force re-render for UI updates every 500ms or on events?
        // Actually, we should pull stats from stateRef directly in render loop for canvas,
        // but for React UI (Health, Gold), we need state.
        // Let's set state every frame? Too heavy. Every 100ms.
        if (Math.floor(time) % 10 === 0) setGameState({...newState});

        draw(newState);
        requestRef.current = requestAnimationFrame(loop);
    };

    const draw = (state: GameState) => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#064e3b'; // Dark Grass
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Camera Follow Player
        const player = state.entities.find(e => e.id === state.localPlayerId);
        if (!player) return;

        ctx.save();
        const camX = Math.max(0, Math.min(MAP_CONSTANTS.WIDTH - cvs.width, player.x - cvs.width/2));
        const camY = Math.max(0, Math.min(MAP_CONSTANTS.HEIGHT - cvs.height, player.y - cvs.height/2));
        ctx.translate(-camX, -camY);

        // Draw Map Elements
        // Lanes
        ctx.fillStyle = '#78350f'; // Dirt path
        ctx.beginPath();
        ctx.moveTo(MAP_CONSTANTS.BASE_BLUE.x, MAP_CONSTANTS.BASE_BLUE.y);
        ctx.lineTo(MAP_CONSTANTS.BASE_RED.x, MAP_CONSTANTS.BASE_RED.y); // Mid
        ctx.stroke(); // Simplified drawing for now

        // Grass
        ctx.fillStyle = '#065f46';
        MAP_CONSTANTS.GRASS.forEach(g => ctx.fillRect(g.x, g.y, g.w, g.h));

        // Draw Entities
        state.entities.forEach(e => {
            if (!e.isVisible && e.team !== player.team) return; // Stealth
            if (e.isDead) return;

            ctx.fillStyle = e.team === 'blue' ? '#3b82f6' : '#ef4444';
            if (e.type === 'turret') ctx.fillStyle = e.team === 'blue' ? '#1e40af' : '#991b1b';
            if (e.type === 'minion') ctx.fillStyle = e.team === 'blue' ? '#93c5fd' : '#fca5a5';

            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
            ctx.fill();

            // HP Bar
            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 20, e.y - e.radius - 10, 40, 5);
            ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - 20, e.y - e.radius - 10, 40 * (e.hp/e.maxHp), 5);

            // Name
            if (e.type === 'hero' && e.heroData) {
                ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
                ctx.fillText(e.heroData.name, e.x, e.y - e.radius - 15);
            }
        });

        // Projectiles
        state.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        });

        ctx.restore();

        // Minimap
        const mmScale = 0.1;
        const mmSize = MAP_CONSTANTS.WIDTH * mmScale;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cvs.width - mmSize - 10, 10, mmSize, mmSize);
        state.entities.forEach(e => {
            if (e.isDead) return;
            ctx.fillStyle = e.team === 'blue' ? '#3b82f6' : '#ef4444';
            ctx.beginPath(); ctx.arc(cvs.width - mmSize - 10 + e.x * mmScale, 10 + e.y * mmScale, 2, 0, Math.PI*2); ctx.fill();
        });
    };

    // --- CONTROLS ---
    const handleSkill = (index: number) => {
        if (!stateRef.current) return;
        const player = stateRef.current.entities.find(e => e.id === stateRef.current!.localPlayerId);
        if (player && player.heroData) {
            castSkill(player, player.heroData.skills[index], stateRef.current);
        }
    };

    const handleBuy = (item: Item) => {
        if (!stateRef.current) return;
        const player = stateRef.current.entities.find(e => e.id === stateRef.current!.localPlayerId);
        if (player && player.gold >= item.cost) {
            player.gold -= item.cost;
            player.inventory?.push(item);
            // Apply stats
            if (item.stats.atk) player.atk += item.stats.atk;
            if (item.stats.hp) { player.maxHp += item.stats.hp; player.hp += item.stats.hp; }
            if (item.stats.speed) player.speed += item.stats.speed;
        }
    };

    const handleStart = (heroId: string) => {
        setSelectedHeroId(heroId);
        const newState = createGameState(heroId);
        stateRef.current = newState;
        requestRef.current = requestAnimationFrame(loop);
    };

    // Cleanup
    useEffect(() => {
        const kd = (e: KeyboardEvent) => keysRef.current[e.key] = true;
        const ku = (e: KeyboardEvent) => keysRef.current[e.key] = false;
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // --- RENDER ---
    if (!selectedHeroId) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center font-mono text-white p-4">
                <div className="w-full max-w-4xl">
                    <h1 className="text-3xl font-bold text-center mb-8 text-emerald-500">CHOOSE YOUR HERO</h1>
                    <div className="grid grid-cols-5 gap-4">
                        {HEROES.map(h => (
                            <button key={h.id} onClick={() => handleStart(h.id)} className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl hover:border-emerald-500 transition flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full" style={{backgroundColor: h.color}}></div>
                                <div className="font-bold">{h.name}</div>
                                <div className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">{h.role}</div>
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="mt-8 mx-auto block text-zinc-500 hover:text-white">Cancel</button>
                </div>
            </div>
        );
    }

    const player = stateRef.current?.entities.find(e => e.id === stateRef.current?.localPlayerId);

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block" />

            {/* HUD */}
            <div className="absolute top-4 left-4 flex gap-4 text-white font-mono pointer-events-none">
                <div className="bg-black/50 p-2 rounded border border-zinc-700">
                    <div className="text-xs text-zinc-400">GOLD</div>
                    <div className="text-yellow-400 font-bold">{Math.floor(player?.gold || 0)}</div>
                </div>
                <div className="bg-black/50 p-2 rounded border border-zinc-700">
                    <div className="text-xs text-zinc-400">K/D</div>
                    <div className="font-bold">0/0</div>
                </div>
                <div className="bg-black/50 p-2 rounded border border-zinc-700">
                    <div className="text-xs text-zinc-400">TIME</div>
                    <div className="font-bold">{Math.floor(stateRef.current?.time || 0)}</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 pointer-events-auto">
                <button onClick={() => setShowShop(!showShop)} className="p-3 bg-yellow-600 rounded-full border-2 border-yellow-400 hover:scale-110 transition shadow-xl">
                    <ShoppingBag className="w-6 h-6 text-white"/>
                </button>
            </div>

            {/* Shop Overlay */}
            {showShop && (
                <div className="absolute top-20 right-4 w-64 bg-zinc-900/90 border border-zinc-700 rounded-xl p-4 text-white font-mono pointer-events-auto">
                    <h3 className="font-bold mb-4 flex justify-between">SHOP <X className="w-4 h-4 cursor-pointer" onClick={()=>setShowShop(false)}/></h3>
                    <div className="space-y-2">
                        {ITEMS.map(item => (
                            <button key={item.id} onClick={()=>handleBuy(item)} className="w-full flex justify-between items-center p-2 bg-black/50 rounded hover:bg-emerald-900/30">
                                <span className="text-xs">{item.name}</span>
                                <span className="text-xs text-yellow-400">{item.cost}g</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Skills */}
            <div className="absolute bottom-8 right-8 flex gap-4 pointer-events-auto">
                {player?.heroData?.skills.map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <button
                            onClick={() => handleSkill(i)}
                            disabled={s.currentCooldown > 0 || player.mana < s.manaCost}
                            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl shadow-xl transition active:scale-95 relative overflow-hidden ${s.currentCooldown > 0 ? 'bg-zinc-800 border-zinc-600 grayscale' : 'bg-zinc-900 border-emerald-500 hover:brightness-125'}`}
                        >
                            {s.icon}
                            {s.currentCooldown > 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">
                                    {Math.ceil(s.currentCooldown)}
                                </div>
                            )}
                        </button>
                        <span className="text-[10px] bg-black/50 text-white px-1 rounded mt-1">{i === 3 ? 'ULT' : `S${i+1}`}</span>
                    </div>
                ))}
            </div>

            {/* Stats / Bars */}
            <div className="absolute bottom-8 left-8 w-64 pointer-events-none">
                <div className="flex gap-2 mb-2 items-end">
                    <div className="w-16 h-16 rounded border-2 border-white bg-zinc-800" style={{backgroundColor: player?.heroData?.color}}></div>
                    <div>
                        <div className="text-white font-bold text-lg">{player?.heroData?.name}</div>
                        <div className="text-zinc-400 text-xs">Lvl {player?.level}</div>
                    </div>
                </div>
                {/* HP */}
                <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600 mb-1">
                    <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${((player?.hp || 0)/(player?.maxHp || 1))*100}%`}}></div>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${((player?.mana || 0)/(player?.maxMana || 1))*100}%`}}></div>
                </div>
            </div>

            {/* Game Over */}
            {stateRef.current?.gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto">
                    <h1 className={`text-6xl font-black mb-8 ${stateRef.current.winner === 'blue' ? 'text-blue-500' : 'text-red-500'}`}>
                        {stateRef.current.winner === 'blue' ? 'VICTORY' : 'DEFEAT'}
                    </h1>
                    <button onClick={onClose} className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">EXIT GAME</button>
                </div>
            )}

            <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-red-600 text-white rounded pointer-events-auto hover:bg-red-700 z-50">EXIT</button>
        </div>
    );
}

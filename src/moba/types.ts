
export type Role = 'Tank' | 'Fighter' | 'Mage' | 'Marksman';

export interface Skill {
    id: string;
    name: string;
    cooldown: number; // seconds
    currentCooldown: number;
    manaCost: number;
    type: 'skillshot' | 'target' | 'aoe' | 'dash' | 'buff';
    damage?: number;
    range: number;
    duration?: number; // for buffs/cc
    description: string;
    icon: string; // emoji or char
}

export interface HeroBase {
    id: string;
    name: string;
    role: Role;
    maxHp: number;
    hpRegen: number;
    maxMana: number;
    manaRegen: number;
    atk: number;
    atkSpeed: number; // attacks per second
    moveSpeed: number;
    armor: number;
    color: string;
    skills: [Skill, Skill, Skill, Skill]; // 1, 2, 3, Ult
}

export interface Entity {
    id: number;
    x: number;
    y: number;
    radius: number;
    team: 'blue' | 'red' | 'neutral';
    type: 'hero' | 'minion' | 'turret' | 'base' | 'projectile';

    // Stats
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    atk: number;
    speed: number;
    range: number;

    // State
    targetId?: number | null;
    isMoving: boolean;
    moveTarget?: {x: number, y: number};
    gold: number;
    level: number;
    exp: number;
    respawnTimer: number;

    // Buffs/Debuffs
    isVisible: boolean; // Grass logic
    isDead: boolean;

    // Hero Specific
    heroData?: HeroBase;
    inventory?: Item[];
}

export interface Item {
    id: string;
    name: string;
    cost: number;
    stats: {
        atk?: number;
        hp?: number;
        speed?: number;
        cooldownReduction?: number;
    }
}

export interface Projectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    team: 'blue' | 'red';
    ownerId: number;
    life: number;
    color: string;
    radius: number;
}

export interface GameState {
    entities: Entity[];
    projectiles: Projectile[];
    time: number; // seconds
    gameOver: boolean;
    winner?: 'blue' | 'red';
    localPlayerId: number;
}

import { HeroBase, Item, Role } from './types';

// Helper to create skills
const createSkill = (id: string, name: string, type: any, range: number, damage: number, cd: number, icon: string): any => ({
    id, name, type, range, damage, cooldown: cd, currentCooldown: 0, manaCost: 20, icon, description: `${name}: Deals ${damage} dmg.`
});

export const HEROES: HeroBase[] = [
    // TANKS
    {
        id: 'h1', name: 'Tigreal', role: 'Tank', color: '#64748b',
        maxHp: 2000, hpRegen: 10, maxMana: 300, manaRegen: 5, atk: 50, atkSpeed: 0.8, moveSpeed: 2.5, armor: 50,
        skills: [
            createSkill('s1', 'Smash', 'aoe', 100, 150, 5, '🔨'),
            createSkill('s2', 'Charge', 'dash', 200, 100, 8, '⏩'),
            createSkill('s3', 'Roar', 'buff', 0, 0, 12, '🛡️'),
            createSkill('ult', 'Implosion', 'aoe', 200, 400, 40, '🌪️')
        ]
    },
    {
        id: 'h2', name: 'Gatot', role: 'Tank', color: '#b45309',
        maxHp: 1900, hpRegen: 12, maxMana: 300, manaRegen: 5, atk: 60, atkSpeed: 0.9, moveSpeed: 2.6, armor: 45,
        skills: [
            createSkill('s1', 'Punch', 'target', 50, 100, 4, '🥊'),
            createSkill('s2', 'Taunt', 'aoe', 100, 50, 10, '🤬'),
            createSkill('s3', 'Steel', 'buff', 0, 0, 15, '🦾'),
            createSkill('ult', 'Jump', 'dash', 400, 500, 50, '💥')
        ]
    },
    // FIGHTERS
    {
        id: 'h3', name: 'Alucard', role: 'Fighter', color: '#dc2626',
        maxHp: 1600, hpRegen: 8, maxMana: 0, manaRegen: 0, atk: 90, atkSpeed: 1.1, moveSpeed: 3.0, armor: 30,
        skills: [
            createSkill('s1', 'Slash', 'aoe', 120, 200, 6, '🗡️'),
            createSkill('s2', 'Spin', 'aoe', 100, 180, 5, '🔄'),
            createSkill('s3', 'Leap', 'dash', 150, 150, 8, '🏃'),
            createSkill('ult', 'Lifesteal', 'buff', 0, 0, 30, '🩸')
        ]
    },
    {
        id: 'h4', name: 'Zilong', role: 'Fighter', color: '#ca8a04',
        maxHp: 1500, hpRegen: 7, maxMana: 250, manaRegen: 4, atk: 95, atkSpeed: 1.2, moveSpeed: 3.2, armor: 25,
        skills: [
            createSkill('s1', 'Flip', 'target', 60, 150, 8, '🤸'),
            createSkill('s2', 'Spear', 'dash', 180, 120, 7, '🔱'),
            createSkill('s3', 'Fury', 'buff', 0, 0, 12, '🔥'),
            createSkill('ult', 'Run', 'buff', 0, 0, 35, '⚡')
        ]
    },
    // MAGES
    {
        id: 'h5', name: 'Eudora', role: 'Mage', color: '#3b82f6',
        maxHp: 1200, hpRegen: 5, maxMana: 600, manaRegen: 10, atk: 40, atkSpeed: 0.8, moveSpeed: 2.4, armor: 15,
        skills: [
            createSkill('s1', 'Bolt', 'skillshot', 300, 300, 4, '⚡'),
            createSkill('s2', 'Stun', 'target', 200, 100, 10, '🛑'),
            createSkill('s3', 'Shock', 'aoe', 250, 250, 8, '🌩️'),
            createSkill('ult', 'Thunder', 'target', 300, 800, 35, '⛈️')
        ]
    },
    {
        id: 'h6', name: 'Gord', role: 'Mage', color: '#8b5cf6',
        maxHp: 1250, hpRegen: 5, maxMana: 650, manaRegen: 12, atk: 35, atkSpeed: 0.7, moveSpeed: 2.3, armor: 15,
        skills: [
            createSkill('s1', 'Ball', 'skillshot', 400, 200, 6, '🔮'),
            createSkill('s2', 'Zone', 'aoe', 300, 100, 8, '🌌'),
            createSkill('s3', 'Float', 'buff', 0, 0, 15, '🛹'),
            createSkill('ult', 'Beam', 'skillshot', 600, 1000, 40, '🔦')
        ]
    },
    // MARKSMEN
    {
        id: 'h7', name: 'Layla', role: 'Marksman', color: '#ec4899',
        maxHp: 1100, hpRegen: 4, maxMana: 200, manaRegen: 6, atk: 110, atkSpeed: 1.3, moveSpeed: 2.5, armor: 10,
        skills: [
            createSkill('s1', 'Bomb', 'skillshot', 400, 250, 5, '💣'),
            createSkill('s2', 'Slow', 'aoe', 300, 150, 8, '🐌'),
            createSkill('s3', 'Range', 'buff', 0, 0, 15, '🔭'),
            createSkill('ult', 'Laser', 'skillshot', 800, 600, 40, '🎇')
        ]
    },
    {
        id: 'h8', name: 'Miya', role: 'Marksman', color: '#c084fc',
        maxHp: 1150, hpRegen: 5, maxMana: 250, manaRegen: 6, atk: 105, atkSpeed: 1.4, moveSpeed: 2.6, armor: 12,
        skills: [
            createSkill('s1', 'Split', 'buff', 0, 0, 10, '🏹'),
            createSkill('s2', 'Rain', 'aoe', 350, 100, 8, '🌧️'),
            createSkill('s3', 'Hop', 'dash', 100, 0, 12, '🐇'),
            createSkill('ult', 'Invisible', 'buff', 0, 0, 45, '👻')
        ]
    },
    {
        id: 'h9', name: 'Clint', role: 'Marksman', color: '#f59e0b',
        maxHp: 1200, hpRegen: 5, maxMana: 300, manaRegen: 7, atk: 115, atkSpeed: 1.1, moveSpeed: 2.5, armor: 15,
        skills: [
            createSkill('s1', 'Smoke', 'aoe', 250, 200, 8, '💨'),
            createSkill('s2', 'Net', 'dash', 200, 100, 10, '🕸️'),
            createSkill('s3', 'Reload', 'buff', 0, 0, 5, '🔫'),
            createSkill('ult', 'Barrage', 'skillshot', 500, 400, 20, '🧨')
        ]
    },
    {
        id: 'h10', name: 'Balmond', role: 'Fighter', color: '#b91c1c',
        maxHp: 1800, hpRegen: 20, maxMana: 0, manaRegen: 0, atk: 70, atkSpeed: 0.9, moveSpeed: 2.7, armor: 40,
        skills: [
            createSkill('s1', 'Charge', 'dash', 200, 150, 8, '🐗'),
            createSkill('s2', 'Spin', 'aoe', 150, 50, 5, '🌪️'),
            createSkill('s3', 'Shout', 'buff', 0, 0, 12, '🗣️'),
            createSkill('ult', 'Smash', 'aoe', 250, 600, 35, '💥')
        ]
    }
];

export const ITEMS: Item[] = [
    { id: 'i1', name: 'Boot Speed', cost: 500, stats: { speed: 1.0 } },
    { id: 'i2', name: 'Sword Atk', cost: 800, stats: { atk: 40 } },
    { id: 'i3', name: 'Armor HP', cost: 800, stats: { hp: 500 } },
    { id: 'i4', name: 'Cd Ring', cost: 1000, stats: { cooldownReduction: 0.2 } },
    { id: 'i5', name: 'Big Blade', cost: 2000, stats: { atk: 100 } },
    { id: 'i6', name: 'Heart HP', cost: 2500, stats: { hp: 1500 } },
];

export const MAP_CONSTANTS = {
    WIDTH: 1500,
    HEIGHT: 1500,
    LANE_WIDTH: 200,
    BASE_BLUE: { x: 100, y: 1400 },
    BASE_RED: { x: 1400, y: 100 },
    TURRETS_BLUE: [{x: 400, y: 1100}, {x: 1100, y: 1400}, {x: 100, y: 400}],
    TURRETS_RED: [{x: 1100, y: 400}, {x: 400, y: 100}, {x: 1400, y: 1100}],
    GRASS: [
        {x: 600, y: 600, w: 300, h: 300}, // Mid grass
        {x: 200, y: 1000, w: 200, h: 200}, // Bot jungle
        {x: 1000, y: 200, w: 200, h: 200}, // Top jungle
    ]
};

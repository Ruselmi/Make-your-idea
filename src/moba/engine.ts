import { Entity, GameState, HeroBase, Item, Projectile, Skill } from './types';
import { HEROES, ITEMS, MAP_CONSTANTS } from './data';

export const createGameState = (localHeroId: string): GameState => {
    // Player
    const playerHero = HEROES.find(h => h.id === localHeroId) || HEROES[0];
    const player: Entity = {
        id: 1, type: 'hero', team: 'blue', x: MAP_CONSTANTS.BASE_BLUE.x, y: MAP_CONSTANTS.BASE_BLUE.y, radius: 20,
        hp: playerHero.maxHp, maxHp: playerHero.maxHp, mana: playerHero.maxMana, maxMana: playerHero.maxMana,
        atk: playerHero.atk, speed: playerHero.moveSpeed, range: 100, isMoving: false, gold: 1000, level: 1, exp: 0,
        respawnTimer: 0, isVisible: true, isDead: false, heroData: playerHero, inventory: []
    };

    // Bots (Enemy Team) - 1 random bot
    const botHero = HEROES.filter(h => h.id !== localHeroId)[Math.floor(Math.random() * 9)];
    const bot: Entity = {
        id: 2, type: 'hero', team: 'red', x: MAP_CONSTANTS.BASE_RED.x, y: MAP_CONSTANTS.BASE_RED.y, radius: 20,
        hp: botHero.maxHp, maxHp: botHero.maxHp, mana: botHero.maxMana, maxMana: botHero.maxMana,
        atk: botHero.atk, speed: botHero.moveSpeed, range: 100, isMoving: false, gold: 1000, level: 1, exp: 0,
        respawnTimer: 0, isVisible: true, isDead: false, heroData: botHero, inventory: []
    };

    // Turrets
    let idCounter = 10;
    const turrets: Entity[] = [
        ...MAP_CONSTANTS.TURRETS_BLUE.map(p => ({ id: idCounter++, type: 'turret', team: 'blue', x: p.x, y: p.y, radius: 30, hp: 3000, maxHp: 3000, atk: 150, range: 250, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 } as Entity)),
        ...MAP_CONSTANTS.TURRETS_RED.map(p => ({ id: idCounter++, type: 'turret', team: 'red', x: p.x, y: p.y, radius: 30, hp: 3000, maxHp: 3000, atk: 150, range: 250, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 } as Entity))
    ];

    // Bases
    const baseBlue: Entity = { id: 900, type: 'base', team: 'blue', x: MAP_CONSTANTS.BASE_BLUE.x, y: MAP_CONSTANTS.BASE_BLUE.y, radius: 60, hp: 5000, maxHp: 5000, atk: 500, range: 300, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 };
    const baseRed: Entity = { id: 901, type: 'base', team: 'red', x: MAP_CONSTANTS.BASE_RED.x, y: MAP_CONSTANTS.BASE_RED.y, radius: 60, hp: 5000, maxHp: 5000, atk: 500, range: 300, speed: 0, isMoving: false, gold: 0, level: 1, exp: 0, respawnTimer: 0, isVisible: true, isDead: false, mana:0, maxMana:0 };

    return {
        entities: [player, bot, ...turrets, baseBlue, baseRed],
        projectiles: [],
        time: 0,
        gameOver: false,
        localPlayerId: 1
    };
};

export const updateGame = (state: GameState, dt: number): GameState => {
    if (state.gameOver) return state;

    // Spawn Minions every 30s
    if (Math.floor(state.time + dt) % 30 === 0 && Math.floor(state.time) % 30 !== 0) {
        spawnMinions(state);
    }

    // Update Entities
    state.entities.forEach(e => {
        if (e.isDead) {
            e.respawnTimer -= dt;
            if (e.respawnTimer <= 0 && e.type === 'hero') {
                e.isDead = false;
                e.hp = e.maxHp;
                e.mana = e.maxMana;
                e.x = e.team === 'blue' ? MAP_CONSTANTS.BASE_BLUE.x : MAP_CONSTANTS.BASE_RED.x;
                e.y = e.team === 'blue' ? MAP_CONSTANTS.BASE_BLUE.y : MAP_CONSTANTS.BASE_RED.y;
            }
            return;
        }

        // Regen
        if (e.type === 'hero' && e.heroData) {
            e.hp = Math.min(e.maxHp, e.hp + e.heroData.hpRegen * dt);
            e.mana = Math.min(e.maxMana, e.mana + e.heroData.manaRegen * dt);
        }

        // AI Logic (Simple)
        if (e.id !== state.localPlayerId && e.type !== 'turret' && e.type !== 'base') {
            runAI(e, state, dt);
        }

        // Movement
        if (e.isMoving && e.moveTarget) {
            const angle = Math.atan2(e.moveTarget.y - e.y, e.moveTarget.x - e.x);
            const dist = Math.hypot(e.moveTarget.x - e.x, e.moveTarget.y - e.y);
            if (dist < e.speed * 2) {
                e.x = e.moveTarget.x;
                e.y = e.moveTarget.y;
                e.isMoving = false;
            } else {
                e.x += Math.cos(angle) * e.speed * 60 * dt; // speed px/frame approx
                e.y += Math.sin(angle) * e.speed * 60 * dt;
            }
        }

        // Grass Check
        e.isVisible = true;
        if (e.type === 'hero') {
            for (const grass of MAP_CONSTANTS.GRASS) {
                if (e.x > grass.x && e.x < grass.x + grass.w && e.y > grass.y && e.y < grass.y + grass.h) {
                    // Inside grass
                    // Simplified: Only invisible if enemy isn't in same grass (omitted for now)
                    // Just basic stealth:
                    e.isVisible = false;
                }
            }
        }

        // Auto Attack
        const target = findTarget(e, state);
        if (target) {
            // Very simple attack tick (assumes melee/instant for simplicity in engine, proj handled separately)
            // Ideally we spawn projectiles or deal damage on cooldown
            // Doing continuous DPS for simplicity in "Easter Egg"
            if (Math.hypot(target.x - e.x, target.y - e.y) <= e.range + target.radius) {
                e.isMoving = false; // Stop to attack
                target.hp -= e.atk * dt;
                if (target.hp <= 0) handleDeath(target, e, state);
            }
        }
    });

    // Update Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.life -= dt;

        // Collision
        const hit = state.entities.find(e => e.team !== p.team && !e.isDead && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius);
        if (hit) {
            hit.hp -= p.damage;
            if (hit.hp <= 0) handleDeath(hit, state.entities.find(o => o.id === p.ownerId), state);
            p.life = 0; // kill proj
        }

        if (p.life <= 0) state.projectiles.splice(i, 1);
    }

    state.time += dt;
    return state;
};

const spawnMinions = (state: GameState) => {
    // Spawn 3 minions per lane for each team
    // Simplified: Just spawn at base and move to enemy base
    const idBase = Date.now();
    ['blue', 'red'].forEach((team, ti) => {
        for (let i = 0; i < 3; i++) {
            const start = team === 'blue' ? MAP_CONSTANTS.BASE_BLUE : MAP_CONSTANTS.BASE_RED;
            const target = team === 'blue' ? MAP_CONSTANTS.BASE_RED : MAP_CONSTANTS.BASE_BLUE;
            state.entities.push({
                id: idBase + ti * 10 + i, type: 'minion', team: team as any,
                x: start.x + (Math.random()*20-10), y: start.y + (Math.random()*20-10), radius: 10,
                hp: 300, maxHp: 300, atk: 20, speed: 2, range: 50, isMoving: true, moveTarget: target,
                gold: 20, level: 1, exp: 5, respawnTimer: 0, isVisible: true, isDead: false, mana: 0, maxMana: 0
            });
        }
    });
};

const runAI = (e: Entity, state: GameState, dt: number) => {
    // Simple Minion AI: Move to enemy base, stop if enemy nearby
    const enemyBase = state.entities.find(b => b.type === 'base' && b.team !== e.team);
    if (!enemyBase) return;

    const nearbyEnemy = state.entities.find(t => t.team !== e.team && !t.isDead && Math.hypot(t.x - e.x, t.y - e.y) < 300);

    if (nearbyEnemy) {
        if (Math.hypot(nearbyEnemy.x - e.x, nearbyEnemy.y - e.y) > e.range) {
            e.moveTarget = {x: nearbyEnemy.x, y: nearbyEnemy.y};
            e.isMoving = true;
        } else {
            e.isMoving = false; // Attack
        }
    } else {
        e.moveTarget = {x: enemyBase.x, y: enemyBase.y};
        e.isMoving = true;
    }
};

const findTarget = (e: Entity, state: GameState): Entity | undefined => {
    return state.entities.find(t => t.team !== e.team && !t.isDead && Math.hypot(t.x - e.x, t.y - e.y) <= e.range);
};

const handleDeath = (victim: Entity, killer: Entity | undefined, state: GameState) => {
    victim.isDead = true;
    victim.hp = 0;
    victim.isMoving = false;

    if (victim.type === 'base') {
        state.gameOver = true;
        state.winner = killer?.team;
    } else if (victim.type === 'minion') {
        // Remove minion or set dead? remove to save memory
        const idx = state.entities.indexOf(victim);
        if (idx > -1) state.entities.splice(idx, 1);
    } else {
        victim.respawnTimer = 10 + (victim.level * 2);
    }

    if (killer) {
        killer.gold += victim.gold;
        killer.exp += victim.exp;
        // Level up logic
        if (killer.exp > killer.level * 100) {
            killer.level++;
            killer.exp = 0;
            killer.maxHp += 200;
            killer.hp += 200;
            killer.atk += 10;
        }
    }
};

export const castSkill = (caster: Entity, skill: Skill, state: GameState) => {
    if (caster.mana < skill.manaCost || skill.currentCooldown > 0) return;

    caster.mana -= skill.manaCost;
    skill.currentCooldown = skill.cooldown;

    // Skill Logic
    if (skill.type === 'skillshot') {
        // Find closest enemy to aim
        const target = state.entities.find(t => t.team !== caster.team && !t.isDead && Math.hypot(t.x - caster.x, t.y - caster.y) < 600);
        const angle = target ? Math.atan2(target.y - caster.y, target.x - caster.x) : 0; // Default right if no target

        state.projectiles.push({
            id: Date.now(), x: caster.x, y: caster.y,
            vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10,
            damage: (skill.damage || 100) + caster.atk,
            team: caster.team, ownerId: caster.id, life: 2, color: 'cyan', radius: 15
        });
    } else if (skill.type === 'dash') {
        const angle = caster.isMoving && caster.moveTarget ? Math.atan2(caster.moveTarget.y - caster.y, caster.moveTarget.x - caster.x) : 0;
        caster.x += Math.cos(angle) * (skill.range || 200);
        caster.y += Math.sin(angle) * (skill.range || 200);
    } else if (skill.type === 'aoe') {
        state.entities.forEach(t => {
            if (t.team !== caster.team && !t.isDead && Math.hypot(t.x - caster.x, t.y - caster.y) < (skill.range || 200)) {
                t.hp -= (skill.damage || 100) + caster.atk;
                if (t.hp <= 0) handleDeath(t, caster, state);
            }
        });
    } else if (skill.type === 'buff') {
        caster.hp = Math.min(caster.maxHp, caster.hp + 200); // Simple heal
        caster.speed += 1;
        setTimeout(() => caster.speed -= 1, (skill.duration || 5) * 1000);
    } else if (skill.type === 'target') {
        const target = state.entities.find(t => t.team !== caster.team && !t.isDead && Math.hypot(t.x - caster.x, t.y - caster.y) < skill.range);
        if (target) {
            target.hp -= (skill.damage || 100) + caster.atk;
            if (target.hp <= 0) handleDeath(target, caster, state);
        }
    }
};


const BotAI = {
    // --- UNO BOT LOGIC ---
    Uno: {
        getMove: (hand, topCard, currentColor, currentSide = 'light') => {
            // 1. Analyze Hand
            const validMoves = [];
            const curCol = currentColor || topCard.color;
            const curVal = topCard.val;

            hand.forEach(cid => {
                // Access global cards state
                const cardRef = window.state.game.cards[cid];
                const card = currentSide === 'light' ? cardRef.l : cardRef.d;

                // Check validity
                let isValid = false;
                if (card.color === 'black') isValid = true;
                else if (card.color === curCol) isValid = true;
                else if (card.val === curVal) isValid = true;

                if (isValid) validMoves.push({cid, card});
            });

            // 2. Decision Making
            if (validMoves.length === 0) {
                return { act: 'DRAW' };
            }

            // Simple Strategy: Prioritize Action cards, then matching color
            // Sort: Wild > Draw/Skip/Rev > Number
            validMoves.sort((a, b) => {
                const typeA = a.card.type;
                const typeB = b.card.type;
                const score = (t) => {
                    if (t.includes('wild')) return 3;
                    if (t === 'draw2' || t === 'skip' || t === 'reverse' || t === 'flip' || t === 'skip_all' || t === 'draw5') return 2;
                    return 1;
                };
                return score(typeB) - score(typeA);
            });

            const selected = validMoves[0];
            let col = null;
            if (selected.card.color === 'black') {
                // Pick most abundant color in hand
                const counts = { red:0, blue:0, green:0, yellow:0, orange:0, teal:0, purple:0, pink:0 };
                hand.forEach(cid => {
                    const c = currentSide === 'light' ? window.state.game.cards[cid].l : window.state.game.cards[cid].d;
                    if (c.color !== 'black' && counts[c.color] !== undefined) counts[c.color]++;
                });
                // Find max
                const colors = currentSide === 'light' ? ['red','blue','green','yellow'] : ['orange','teal','purple','pink'];
                col = colors.reduce((a, b) => counts[a] > counts[b] ? a : b);
            }

            return { act: 'PLAY', cid: selected.cid, col: col };
        }
    },

    // --- CHESS BOT LOGIC ---
    Chess: {
        getMove: () => {
            // catur.html exposes: window.game = state; state.game = new Chess();
            // So we access the chess instance via window.game.game
            if (!window.game || !window.game.game) return null;

            const chess = window.game.game;
            const moves = chess.moves({ verbose: true });

            if (moves.length === 0) return null;

            // Heuristic: Capture > Promotion > Check > Random
            // Score moves
            const scoredMoves = moves.map(m => {
                let score = 0;
                if (m.flags.includes('c')) score += 10; // Capture
                if (m.flags.includes('p')) score += 8;  // Promotion
                if (m.san.includes('+')) score += 5;    // Check
                // Center control (d4, d5, e4, e5)
                if (['d4','d5','e4','e5'].includes(m.to)) score += 2;

                return { move: m, score: score };
            });

            // Sort desc
            scoredMoves.sort((a, b) => b.score - a.score);

            // Pick one of the best moves (add slight randomness)
            const bestScore = scoredMoves[0].score;
            const bestMoves = scoredMoves.filter(m => m.score === bestScore);
            return bestMoves[Math.floor(Math.random() * bestMoves.length)].move;
        }
    },

    // --- LUDO BOT LOGIC ---
    Ludo: {
        decide: (pIdx, diceVal) => {
            // Ludo exposes window.state and window.game
            if (!window.state || !window.game) return null;

            const player = window.state.game.players[pIdx];
            const tokens = player.tokens; // Array of positions

            // Find movable tokens
            const movableIndices = [];
            tokens.forEach((pos, i) => {
                if (window.game.canMove(pIdx, i, diceVal)) {
                    movableIndices.push(i);
                }
            });

            if (movableIndices.length === 0) return null;

            // Strategy:
            // 1. Kill opponent (best) - simplified check (if land on < 52 and occupied)
            // 2. Move token out of base (if 6)
            // 3. Move token closest to home (but not finished)

            const scoredMoves = movableIndices.map(tIdx => {
                let score = 0;
                const currentPos = tokens[tIdx];

                let nextPos = currentPos;
                if (nextPos === -1) nextPos = 0; // Just entered
                else nextPos += diceVal;

                // Prioritize getting out of base
                if (currentPos === -1 && diceVal === 6) score += 50;

                // Prioritize progress
                score += nextPos;

                // Prioritize finishing
                if (nextPos === 56 || nextPos === 99) score += 100;

                return { tIdx, score };
            });

            scoredMoves.sort((a, b) => b.score - a.score);
            return scoredMoves[0].tIdx;
        }
    }
};

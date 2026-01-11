
const BotAI = {
    // --- UNO BOT LOGIC ---
    Uno: {
        getMove: (hand, topCard, currentColor, currentSide = 'light') => {
            // 1. Analyze Hand
            const validMoves = [];
            const curCol = currentColor || topCard.color;
            const curVal = topCard.val;

            hand.forEach(cid => {
                // Determine card properties based on side
                // Access global cards state? We need the card data.
                // Assuming 'window.state.game.cards' is available or passed.
                // We'll assume the caller passes the full card objects or we access global.
                // Ideally, pass the card objects.
                // Let's use global for simplicity in this browser-based setup: window.state.game.cards
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
        getMove: (boardObj, color) => {
            // boardObj has .b (array 64)
            // Need to find all valid moves for 'color'
            const validMoves = [];
            const myPrefix = color === 'white' ? 'w' : 'b';

            boardObj.b.forEach((piece, idx) => {
                if (piece && piece.startsWith(myPrefix)) {
                    // Get potential moves
                    const moves = window.game.chess.getMoves(boardObj.b, idx, piece, color);
                    moves.forEach(to => {
                        // Very basic evaluation: Capture > Random
                        let score = 0;
                        const target = boardObj.b[to];
                        if (target) {
                            if (target.includes('q')) score = 9;
                            else if (target.includes('r')) score = 5;
                            else if (target.includes('b') || target.includes('n')) score = 3;
                            else score = 1;
                        }
                        validMoves.push({ from: idx, to: to, score: score });
                    });
                }
            });

            if (validMoves.length === 0) return null;

            // Sort by score
            validMoves.sort((a, b) => b.score - a.score);

            // Add some randomness to equal scores
            const bestScore = validMoves[0].score;
            const topMoves = validMoves.filter(m => m.score === bestScore);
            const selected = topMoves[Math.floor(Math.random() * topMoves.length)];

            return { from: selected.from, to: selected.to };
        }
    },

    // --- LUDO BOT LOGIC ---
    Ludo: {
        decide: (pIdx, diceVal) => {
            // Access state directly
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
            // 1. Kill opponent (best)
            // 2. Move token out of base (if 6)
            // 3. Move token closest to home (but not finished)
            // 4. Move random

            // Evaluate each move
            const scoredMoves = movableIndices.map(tIdx => {
                let score = 0;
                const currentPos = tokens[tIdx];

                // Calc new pos
                let nextPos = currentPos;
                if (nextPos === -1) nextPos = 0;
                else nextPos += diceVal;

                // Check Kill
                // Need to convert to global coords to check collisions
                // This mimics the game logic...
                // Simplified: Just prefer getting out of base or moving furthest

                if (currentPos === -1 && diceVal === 6) score += 100; // Open base
                else if (nextPos === 56) score += 200; // Finish!
                else score += nextPos; // Progress

                return { tIdx, score };
            });

            scoredMoves.sort((a, b) => b.score - a.score);
            return scoredMoves[0].tIdx;
        }
    }
};

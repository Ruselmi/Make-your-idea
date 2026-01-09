// LUDO LOGIC

const PEER_PREFIX = "IND_LUDO_";

// UTILS
const ui = {
    screen: (id) => {
        document.getElementById('screen-home').classList.add('hidden');
        document.getElementById('screen-game').classList.add('hidden');
        document.getElementById(id).classList.remove('hidden');
    },
    showWin: (name) => {
        document.getElementById('winner-name').innerText = name;
        document.getElementById('modal-win').classList.remove('hidden');
        window.audio.playSfx('win');
    },
    updateNames: (players) => {
        players.forEach((p, i) => {
            if(p && p.name) document.getElementById(`p${i}-name`).innerText = p.name + (i === state.myIndex ? " (Me)" : "");
        });
    },
    renderDice: (val) => {
        const d = document.getElementById('dice-cube');
        const v = document.getElementById('dice-val');
        d.classList.add('rolling');
        window.audio.playSfx('dice');
        setTimeout(() => {
            d.classList.remove('rolling');
            const rot = { 1: [0, 0], 2: [0, -90], 3: [0, -180], 4: [0, 90], 5: [-90, 0], 6: [90, 0] }[val] || [0,0];
            d.style.transform = `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)`;
            v.innerText = val;
        }, 800);
    },
    renderBoard: () => {
        const board = document.querySelector('.ludo-board');
        document.querySelectorAll('.cell').forEach(e => e.remove());
        const createCell = (r, c, type, id) => { const el = document.createElement('div'); el.className = `cell ${type}`; el.style.gridRow = r; el.style.gridColumn = c; el.dataset.id = id; board.appendChild(el); return el; };
        for(let i=0; i<6; i++) createCell(7, i+1, i===1?'path-green safe':'', `g-${i}`); for(let i=0; i<6; i++) createCell(8, i+1, i>0?'path-green':'', `gh-${i}`); for(let i=0; i<6; i++) createCell(9, i+1, i===2?'safe':'', `g-${12-i}`);
        for(let i=0; i<6; i++) createCell(i+1, 9, i===1?'path-yellow safe':'', `y-${i}`); for(let i=0; i<6; i++) createCell(i+1, 8, i>0?'path-yellow':'', `yh-${i}`); for(let i=0; i<6; i++) createCell(i+1, 7, i===2?'safe':'', `y-${12-i}`);
        for(let i=0; i<6; i++) createCell(9, 15-i, i===1?'path-blue safe':'', `b-${i}`); for(let i=0; i<6; i++) createCell(8, 15-i, i>0?'path-blue':'', `bh-${i}`); for(let i=0; i<6; i++) createCell(7, 15-i, i===2?'safe':'', `b-${12-i}`);
        for(let i=0; i<6; i++) createCell(15-i, 7, i===1?'path-red safe':'', `r-${i}`); for(let i=0; i<6; i++) createCell(15-i, 8, i>0?'path-red':'', `rh-${i}`); for(let i=0; i<6; i++) createCell(15-i, 9, i===2?'safe':'', `r-${12-i}`);
    },
    renderTokens: () => {
        document.querySelectorAll('.token').forEach(t => t.remove());
        const tokenClasses = ['token-green', 'token-yellow', 'token-blue', 'token-red'];
        state.game.players.forEach((p, pIdx) => {
            p.tokens.forEach((pos, tIdx) => {
                const el = document.createElement('div');
                el.className = `token ${tokenClasses[pIdx]}`;
                el.innerHTML = '<i class="fa-solid fa-chess-knight"></i>';
                el.onclick = () => game.moveToken(tIdx);
                if(state.game.turn === pIdx && state.game.phase === 'move' && state.myIndex === pIdx) {
                    if(game.canMove(pIdx, tIdx, state.game.diceVal)) el.classList.add('active');
                }
                if(pos === -1) { const base = document.getElementById(`base-${pIdx}`); if(base) { const spot = document.createElement('div'); spot.className = 'base-spot w-full h-full relative'; spot.appendChild(el); base.appendChild(spot); } }
                else if (pos === 99) { const center = document.getElementById('center-goal'); el.style.width='20px'; el.style.height='20px'; el.style.position='relative'; center.appendChild(el); }
                else { let cell = getCellForPos(pIdx, pos); if(cell) { if(cell.children.length > 0) { const offset = cell.children.length * 5; el.style.left = (12.5 + offset) + '%'; el.style.top = (12.5 + offset) + '%'; } cell.appendChild(el); } }
            });
        });
    },
    showSignalModal: (data, step) => {
        document.getElementById('modal-signal').classList.remove('hidden');
        if(step === 1) {
            document.getElementById('signal-step-1').classList.remove('hidden');
            document.getElementById('signal-step-2').classList.add('hidden');
            document.getElementById('my-signal-data').value = data;
        } else if(step === 2) {
            document.getElementById('signal-step-1').classList.add('hidden');
            document.getElementById('signal-step-2').classList.remove('hidden');
        }
    }
};

const loopCoords = [ [7,2], [7,3], [7,4], [7,5], [7,6], [6,7], [5,7], [4,7], [3,7], [2,7], [1,7], [1,8], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9], [7,10], [7,11], [7,12], [7,13], [7,14], [7,15], [8,15], [9,15], [9,14], [9,13], [9,12], [9,11], [9,10], [10,9], [11,9], [12,9], [13,9], [14,9], [15,9], [15,8], [15,7], [14,7], [13,7], [12,7], [11,7], [10,7], [9,6], [9,5], [9,4], [9,3], [9,2], [9,1], [8,1], [7,1] ];
const homeRunCoords = [ [[8,2], [8,3], [8,4], [8,5], [8,6], [8,7]], [[2,8], [3,8], [4,8], [5,8], [6,8], [7,8]], [[8,14], [8,13], [8,12], [8,11], [8,10], [8,9]], [[14,8], [13,8], [12,8], [11,8], [10,8], [9,8]] ];
function getCellForPos(pIdx, localPos) { if(localPos < 52) { const offset = pIdx * 13; const globalPos = (localPos + offset) % 52; const c = loopCoords[globalPos]; return document.querySelector(`.cell[style*="grid-row: ${c[0]}"][style*="grid-column: ${c[1]}"]`); } else { const hrIdx = localPos - 52; if(hrIdx < 6) { const c = homeRunCoords[pIdx][hrIdx]; return document.querySelector(`.cell[style*="grid-row: ${c[0]}"][style*="grid-column: ${c[1]}"]`); } return null; } }

// FIXED GAME STATE STRUCTURE
const state = {
    myIndex: -1,
    roomCode: '',
    networkMode: 'peerjs',
    game: {
        turn: 0,
        players: [
            { name: 'P1', tokens: [-1,-1,-1,-1], baseColor: 'green' },
            { name: 'P2', tokens: [-1,-1,-1,-1], baseColor: 'yellow' },
            { name: 'P3', tokens: [-1,-1,-1,-1], baseColor: 'blue' },
            { name: 'P4', tokens: [-1,-1,-1,-1], baseColor: 'red' }
        ],
        board: [], // Placeholder if needed, logic is mostly coordinate based
        diceVal: 0,
        phase: 'roll',
        winners: []
    }
};

const game = {
    init: () => { ui.renderBoard(); ui.renderTokens(); },
    rollDice: () => { if(state.game.turn !== state.myIndex) return; if(state.game.phase !== 'roll') return; const val = Math.floor(Math.random() * 6) + 1; app.send({ type: 'ROLL', val }); },
    handleRoll: (val) => { state.game.diceVal = val; ui.renderDice(val); if(game.hasValidMoves(state.game.turn, val)) { state.game.phase = 'move'; } else { setTimeout(game.nextTurn, 1500); } ui.renderTokens(); app.updateStatus(); },
    hasValidMoves: (pIdx, roll) => { return state.game.players[pIdx].tokens.some((t, i) => game.canMove(pIdx, i, roll)); },
    canMove: (pIdx, tIdx, roll) => { const pos = state.game.players[pIdx].tokens[tIdx]; if(pos === 99) return false; if(pos === -1) return roll === 6; if(pos + roll > 57) return false; return true; },
    moveToken: (tIdx) => { if(state.game.turn !== state.myIndex) return; if(state.game.phase !== 'move') return; if(!game.canMove(state.game.turn, tIdx, state.game.diceVal)) return; app.send({ type: 'MOVE', tIdx }); },
    handleMove: (pIdx, tIdx) => {
        const p = state.game.players[pIdx]; const roll = state.game.diceVal; let cur = p.tokens[tIdx];
        if(cur === -1) { p.tokens[tIdx] = 0; } else { p.tokens[tIdx] += roll; if(p.tokens[tIdx] === 57) p.tokens[tIdx] = 99; }
        if(p.tokens[tIdx] < 52 && p.tokens[tIdx] !== -1) { const myGlobal = (p.tokens[tIdx] + pIdx * 13) % 52; const isSafe = [0,8,13,21,26,34,39,47].includes(myGlobal); if(!isSafe) { state.game.players.forEach((opp, oIdx) => { if(pIdx !== oIdx) { opp.tokens.forEach((ot, otIdx) => { if(ot !== -1 && ot < 52) { const oppGlobal = (ot + oIdx * 13) % 52; if(myGlobal === oppGlobal) { opp.tokens[otIdx] = -1; window.audio.playSfx('win'); } } }); } }); } }
        window.audio.playSfx('move'); ui.renderTokens(); if(p.tokens.every(t => t === 99)) { state.game.winners.push(p.name); ui.showWin(p.name); }
        if(roll === 6) { state.game.phase = 'roll'; app.updateStatus("Main Lagi!"); } else { game.nextTurn(); }
    },
    nextTurn: () => { state.game.turn = (state.game.turn + 1) % 4; state.game.phase = 'roll'; state.game.diceVal = 0; ui.renderTokens(); app.updateStatus(); }
};

// --- NETWORK MANAGER ---
let peerInstance = null;
let connections = {}; // For PeerJS Host
let simplePeer = null;

const app = {
    init: () => {
        const url = new URL(window.location.href);
        const name = url.searchParams.get('name');
        if(name) document.getElementById('input-name').value = name;
    },
    setNetworkMode: (mode) => {
        state.networkMode = mode;
        document.getElementById('mode-simple').classList.toggle('active', mode === 'simple');
        document.getElementById('mode-peerjs').classList.toggle('active', mode === 'peerjs');
        if(mode === 'peerjs') {
            document.getElementById('join-peerjs-input').classList.remove('hidden');
            document.getElementById('join-simple-input').classList.add('hidden');
        } else {
            document.getElementById('join-peerjs-input').classList.add('hidden');
            document.getElementById('join-simple-input').classList.remove('hidden');
        }
    },
    createRoom: () => {
        const name = document.getElementById('input-name').value || "Host";
        state.myIndex = 0;
        state.game.players[0].name = name;
        if(state.networkMode === 'peerjs') {
            initPeerJS(PEER_PREFIX + utils.randId());
        } else {
            initSimplePeerHost();
        }
    },
    joinRoomPrompt: () => { document.getElementById('join-input-area').classList.remove('hidden'); app.setNetworkMode(state.networkMode); },
    joinRoom: () => {
        const name = document.getElementById('input-name').value || "Guest";
        if(state.networkMode === 'peerjs') {
            const code = document.getElementById('input-room').value.toUpperCase();
            initPeerJS(null, code);
        } else {
            initSimplePeerGuest();
        }
    },
    send: (data) => {
        if(state.myIndex === 0) {
            app.handleData(data, {peer: 'me'}); // Host process
            if(state.networkMode === 'peerjs') { Object.values(connections).forEach(c => c.send(data)); }
            else if(simplePeer && simplePeer.connected) { simplePeer.send(JSON.stringify(data)); }
        } else {
            app.sendHost(data);
        }
    },
    sendHost: (data) => {
        if(state.networkMode === 'peerjs') { if(connections['host']) connections['host'].send(data); }
        else if(simplePeer && simplePeer.connected) { simplePeer.send(JSON.stringify(data)); }
    },
    handleData: (d, conn) => {
        // Host Logic
        if(state.myIndex === 0) {
            if(d.type === 'JOIN') {
                let idx = state.game.players.findIndex((p, i) => i>0 && (p.name === 'P'+(i+1) || p.peerId === undefined));
                if(idx !== -1) {
                    state.game.players[idx].name = d.name;
                    state.game.players[idx].peerId = conn.peer || 'guest';
                    const update = { type: 'STATE', game: state.game, myIdx: idx };
                    if(state.networkMode === 'peerjs') conn.send(update);
                    else if(simplePeer) simplePeer.send(JSON.stringify(update));
                    const broadcastUpdate = { type: 'STATE', game: state.game };
                    if(state.networkMode === 'peerjs') Object.values(connections).forEach(c => { if(c.peer !== conn.peer) c.send(broadcastUpdate); });
                    ui.updateNames(state.game.players);
                }
            } else if (d.type === 'ROLL') { game.handleRoll(d.val); app.broadcastGame(); }
            else if (d.type === 'MOVE') { game.handleMove(state.game.turn, d.tIdx); app.broadcastGame(); }
            else if (d.type === 'REQ_MUSIC') { app.send({type: 'MUSIC_SYNC', url: d.url, title: d.title, artist: d.artist}); window.audio.playMusic(d.url, d.title, d.artist); }
        }
        // Client Logic
        else {
            if(d.type === 'STATE') { state.game = d.game; if(d.myIdx !== undefined) state.myIndex = d.myIdx; ui.screen('screen-game'); game.init(); ui.updateNames(state.game.players); }
            else if (d.type === 'UPDATE_GAME') { const oldDice = state.game.diceVal; state.game = d.game; if(state.game.diceVal !== oldDice && state.game.diceVal > 0) ui.renderDice(state.game.diceVal); ui.renderTokens(); ui.updateNames(state.game.players); app.updateStatus(); }
            else if (d.type === 'MUSIC_SYNC') { window.audio.playMusic(d.url, d.title, d.artist); }
        }
    },
    broadcastGame: () => {
        const d = { type: 'UPDATE_GAME', game: state.game };
        if(state.networkMode === 'peerjs') Object.values(connections).forEach(c => c.send(d));
        else if(simplePeer && simplePeer.connected) simplePeer.send(JSON.stringify(d));
    },
    copySignal: () => { const el = document.getElementById('my-signal-data'); el.select(); document.execCommand('copy'); alert("Kode disalin!"); },
    connectSignal: () => {
        const data = document.getElementById('other-signal-data').value;
        if(!data) return;
        try { const signal = JSON.parse(data); simplePeer.signal(signal); document.getElementById('modal-signal').classList.add('hidden'); } catch(e) { alert("Kode tidak valid."); }
    },
    toggleVoice: async () => {
        const btn = document.getElementById('btn-mic');
        const isAct = btn.classList.contains('text-red-500');
        if(isAct) {
            if(window.myStream) window.myStream.getTracks().forEach(t => t.stop());
            window.myStream = null;
            btn.classList.remove('text-red-500', 'border-red-500');
            btn.classList.add('text-slate-400');
            btn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({audio: true});
                window.myStream = stream;
                btn.classList.add('text-red-500', 'border-red-500');
                btn.classList.remove('text-slate-400');
                btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                if(state.networkMode === 'peerjs' && peerInstance) {
                        if(state.myIndex === 0) {
                            Object.values(connections).forEach(c => peerInstance.call(c.peer, stream));
                        } else if(peerInstance.conn) {
                            peerInstance.call(peerInstance.conn.peer, stream);
                        }
                }
            } catch(e) { alert("Gagal akses mic: " + e); }
        }
    },
    addAudioStream: (stream) => {
        const a = document.createElement('audio');
        a.srcObject = stream;
        a.play().catch(e=>console.log(e));
        document.getElementById('voice-streams').appendChild(a);
    }
};

// --- NETWORK IMPL ---
const initPeerJS = (id, targetId) => {
    const peer = new Peer(id, { config: SHARED_CONFIG });
    peerInstance = peer;

    peer.on('call', (call) => {
        call.answer();
        call.on('stream', (remoteStream) => {
            app.addAudioStream(remoteStream);
        });
    });

    peer.on('open', (pid) => {
        if(state.myIndex === 0) { // Host
            state.roomCode = pid.replace(PEER_PREFIX, '');
            document.getElementById('room-code').innerText = state.roomCode;
            document.getElementById('btn-mic').classList.remove('hidden');
            state.game.players[0].peerId = pid; // Sync Host ID
            ui.screen('screen-game');
            ui.updateNames(state.game.players);
            game.init();
        } else { // Join
            const conn = peer.connect(PEER_PREFIX + targetId);
            peer.conn = conn;
            conn.on('open', () => {
                document.getElementById('btn-mic').classList.remove('hidden');
                conn.send({ type: 'JOIN', name: document.getElementById('input-name').value });
                state.roomCode = targetId;
                document.getElementById('room-code').innerText = targetId;
            });
            conn.on('data', (d) => app.handleData(d, conn));
            connections['host'] = conn;
        }
    });
    peer.on('connection', (c) => {
        c.on('data', (d) => app.handleData(d, c));
        c.on('open', () => {
            connections[c.peer] = c;
            if(window.myStream) peer.call(c.peer, window.myStream);
        });
    });
};

const initSimplePeerHost = () => {
    simplePeer = new SimplePeer({ initiator: true, trickle: false });
    setupSimplePeerEvents(simplePeer, true);
};
const initSimplePeerGuest = () => {
    simplePeer = new SimplePeer({ initiator: false, trickle: false });
    setupSimplePeerEvents(simplePeer, false);
    ui.showSignalModal("", 2);
};
const setupSimplePeerEvents = (p, isHost) => {
    p.on('error', err => alert("P2P Error: " + err));
    p.on('signal', data => { ui.showSignalModal(JSON.stringify(data), 1); });
    p.on('connect', () => {
        document.getElementById('modal-signal').classList.add('hidden');
        if(isHost) {
            ui.screen('screen-game');
            ui.updateNames(state.game.players);
            game.init();
        } else {
            p.send(JSON.stringify({ type: 'JOIN', name: document.getElementById('input-name').value }));
        }
    });
    p.on('data', data => {
        const d = JSON.parse(data.toString());
        if(isHost) app.handleData(d, {});
        else app.handleData(d, {});
    });
};

window.audio = new AudioManager();
app.init();
game.init();

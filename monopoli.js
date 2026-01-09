// MONOPOLY LOGIC

const PEER_PREFIX = "IND_MONOPOLI_";

// UTILS
const ui = {
    initBoard: () => {
        const b = document.getElementById('board');
        SPACES.forEach((s, i) => {
            const el = document.createElement('div');
            el.className = 'space';
            if(i===0) { el.style.gridArea = '11 / 11 / 12 / 12'; el.classList.add('corner'); }
            else if(i<10) { el.style.gridArea = `11 / ${11-i} / 12 / ${12-i}`; }
            else if(i===10) { el.style.gridArea = '11 / 1 / 12 / 2'; el.classList.add('corner'); }
            else if(i<20) { el.style.gridArea = `${21-i} / 1 / ${22-i} / 2`; }
            else if(i===20) { el.style.gridArea = '1 / 1 / 2 / 2'; el.classList.add('corner'); }
            else if(i<30) { el.style.gridArea = `1 / ${i-19} / 2 / ${i-18}`; }
            else if(i===30) { el.style.gridArea = '1 / 11 / 2 / 12'; el.classList.add('corner'); }
            else { el.style.gridArea = `${i-29} / 11 / ${i-28} / 12`; }

            el.innerHTML = `<div class="space-name" style="font-size:${s.name.length>8?'6px':'8px'}">${s.name}</div>`;
            if(s.type === 'prop' || s.type === 'station' || s.type === 'util') {
                const col = document.createElement('div');
                col.className = 'space-color';
                if(s.color) col.style.backgroundColor = COLORS[s.color];
                else col.style.backgroundColor = '#64748b'; // Station/Util color

                if(i<10 || i>30) el.prepend(col); else el.appendChild(col);
                el.innerHTML += `<div class="space-price">$${s.price}</div>`;
            }
            el.id = `space-${i}`;
            b.appendChild(el);
        });
    },
    renderPlayers: () => {
        document.querySelectorAll('.token').forEach(t => t.remove());
        const pColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];

        state.game.players.forEach((p, idx) => {
            const t = document.createElement('div');
            t.className = `token token-${idx % 4}`;
            const space = document.getElementById(`space-${p.pos}`);
            if(space) {
                const rect = space.getBoundingClientRect();
                const bRect = document.getElementById('board').getBoundingClientRect();
                const offX = (idx % 2) * 6; // Increased offset slightly
                const offY = (idx > 1) * 6;
                t.style.left = (rect.left - bRect.left + 4 + offX) + 'px';
                t.style.top = (rect.top - bRect.top + 4 + offY) + 'px';
                document.getElementById('board').appendChild(t);
            }

            const st = document.getElementById(`pstat-${idx}`);
            if(st) {
                st.innerHTML = `<div class="w-2 h-2 rounded-full inline-block" style="background:${pColors[idx%4]}"></div> <b>${p.name}</b><br>$${p.money}`;
                st.className = `bg-slate-800 p-2 rounded text-[10px] border flex-shrink-0 ${state.game.turn === idx ? 'active-turn' : 'border-white/10'}`;
            }
        });
    },
    updateTurn: () => {
        const turnName = state.game.players[state.game.turn].name;
        const isMe = state.game.turn === state.myIndex;
        document.getElementById('turn-indicator').innerText = isMe ? "GILIRAN KAMU" : `Giliran ${turnName}`;
        document.getElementById('btn-roll').disabled = !isMe;
        document.getElementById('btn-roll').classList.toggle('opacity-50', !isMe);
    },
    showModal: (title, desc, actions) => {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-desc').innerText = desc;
        const c = document.getElementById('modal-btns'); c.innerHTML = '';
        actions.forEach(a => {
            const b = document.createElement('button');
            b.className = `py-2 rounded font-bold ${a.cls}`;
            b.innerText = a.text;
            b.onclick = () => { document.getElementById('modal-action').classList.add('hidden'); a.cb(); };
            c.appendChild(b);
        });
        document.getElementById('modal-action').classList.remove('hidden');
    },
    log: (msg) => {
        const l = document.getElementById('game-log');
        const d = document.createElement('div'); d.className='log-entry'; d.innerText = msg;
        l.prepend(d);
        if(l.children.length > 20) l.lastChild.remove();
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

const game = {
    init: () => {
        ui.initBoard();
        document.getElementById('player-stats').innerHTML = '';
        state.game.players.forEach((p,i) => {
            const d = document.createElement('div'); d.id=`pstat-${i}`;
            document.getElementById('player-stats').appendChild(d);
        });
        ui.renderPlayers();
        ui.updateTurn();
    },
    roll: () => {
        if(state.game.turn !== state.myIndex) return;
        const d1 = Math.floor(Math.random()*6)+1;
        const d2 = Math.floor(Math.random()*6)+1;
        app.send({type:'ROLL', d1, d2});
    },
    handleRoll: (d1, d2) => {
        document.getElementById('d1').innerText = d1;
        document.getElementById('d2').innerText = d2;
        const p = state.game.players[state.game.turn];

        const oldPos = p.pos;
        p.pos = (p.pos + d1 + d2) % 40;

        // PASS GO LOGIC
        if(p.pos < oldPos) {
            p.money += 200;
            ui.log(`${p.name} lewat GO (+200)`);
        }

        ui.renderPlayers();
        if(state.game.turn === state.myIndex) setTimeout(() => game.land(p), 1000);
    },
    land: (p) => {
        const s = SPACES[p.pos];
        ui.log(`${p.name} mendarat di ${s.name}`);

        if(s.type === 'prop' || s.type === 'station' || s.type === 'util') {
            if(s.owner === undefined) {
                if(p.money >= s.price) {
                    ui.showModal(s.name, `Harga: $${s.price}. Saldo: $${p.money}. Beli?`, [
                        {text: "BELI", cls: "bg-green-600 text-white", cb: () => app.send({type:'BUY', idx: p.pos})},
                        {text: "LEWATI", cls: "bg-slate-600 text-white", cb: () => app.send({type:'END_TURN'})}
                    ]);
                } else {
                    ui.log(`${p.name} tidak cukup uang untuk beli.`);
                    app.send({type:'END_TURN'}); // Auto skip if no money
                }
            } else if (s.owner !== state.myIndex) {
                const rent = s.rent || 20;
                ui.showModal("BAYAR SEWA", `Milik ${state.game.players[s.owner].name}. Biaya: $${rent}`, [
                     {text: "BAYAR", cls: "bg-red-600 text-white", cb: () => app.send({type:'PAY', amount: rent, to: s.owner})}
                ]);
            } else {
                app.send({type:'END_TURN'});
            }
        } else if (s.type === 'tax') {
            ui.showModal("PAJAK", `Bayar Pajak: $${s.cost}`, [
                {text: "BAYAR", cls: "bg-red-600 text-white", cb: () => app.send({type:'PAY', amount: s.cost, to: 'bank'})}
            ]);
        } else if (s.type === 'goto_jail') {
            ui.log(`${p.name} Masuk Penjara!`);
            app.send({type:'JAIL'});
        } else {
            app.send({type:'END_TURN'});
        }
    },
    buy: (pid, idx) => {
        const p = state.game.players[pid]; const s = SPACES[idx];
        if(p.money >= s.price && !s.owner) {
            p.money -= s.price; s.owner = pid; p.props.push(idx);
            document.getElementById(`space-${idx}`).style.borderColor = ['#ef4444','#3b82f6','#22c55e','#eab308'][pid%4];
            document.getElementById(`space-${idx}`).style.borderWidth = '3px';
            ui.log(`${p.name} membeli ${s.name}`);
        }
        if(pid === state.game.turn) game.nextTurn();
    },
    pay: (fromPid, amount, toPid) => {
        const p = state.game.players[fromPid]; p.money -= amount;
        if(toPid !== 'bank') {
            state.game.players[toPid].money += amount;
            ui.log(`${p.name} bayar $${amount} ke ${state.game.players[toPid].name}`);
        } else {
            ui.log(`${p.name} bayar $${amount} ke Bank`);
        }
        if(fromPid === state.game.turn) game.nextTurn();
    },
    nextTurn: () => {
        state.game.turn = (state.game.turn + 1) % state.game.players.length;
        ui.updateTurn(); ui.renderPlayers();
    }
};

// NETWORK MANAGER
let peerInstance = null; let connections = {}; let simplePeer = null;
const app = {
    init: () => { const u = new URL(window.location.href); const n = u.searchParams.get('name'); if(n) document.getElementById('input-name').value = n; },
    setNetworkMode: (mode) => {
        state.networkMode = mode;
        document.getElementById('mode-simple').classList.toggle('active', mode === 'simple');
        document.getElementById('mode-peerjs').classList.toggle('active', mode === 'peerjs');
        if(mode === 'peerjs') { document.getElementById('join-peerjs-input').classList.remove('hidden'); document.getElementById('join-simple-input').classList.add('hidden'); }
        else { document.getElementById('join-peerjs-input').classList.add('hidden'); document.getElementById('join-simple-input').classList.remove('hidden'); }
    },
    createRoom: () => {
        const name = document.getElementById('input-name').value || "Host";
        state.myIndex = 0; state.game.players = [{name, money:1500, pos:0, props:[], peerId: 'host'}];
        if(state.networkMode === 'peerjs') initPeerJS(PEER_PREFIX + utils.randId()); else initSimplePeerHost();
    },
    joinRoomPrompt: () => { document.getElementById('join-input-area').classList.remove('hidden'); app.setNetworkMode(state.networkMode); },
    joinRoom: () => {
        const name = document.getElementById('input-name').value || "Guest";
        if(state.networkMode === 'peerjs') { const c = document.getElementById('input-room').value.toUpperCase(); initPeerJS(null, c); }
        else initSimplePeerGuest();
    },
    send: (data) => {
        if(state.myIndex === 0) { app.handleData(data, {peer:'me'}); if(state.networkMode==='peerjs') Object.values(connections).forEach(c=>c.send(data)); else if(simplePeer) simplePeer.send(JSON.stringify(data)); }
        else app.sendHost(data);
    },
    sendHost: (data) => { if(state.networkMode==='peerjs') { if(connections['host']) connections['host'].send(data); } else if(simplePeer) simplePeer.send(JSON.stringify(data)); },
    handleData: (d, conn) => {
        if(state.myIndex === 0) { // HOST
            if(d.type === 'JOIN') {
                state.game.players.push({name: d.name, money:1500, pos:0, props:[], peerId: conn.peer||'guest'});
                const update = {type:'STATE', game: state.game, myIdx: state.game.players.length-1};
                if(state.networkMode==='peerjs') conn.send(update); else if(simplePeer) simplePeer.send(JSON.stringify(update));
                const bc = {type:'STATE', game: state.game};
                if(state.networkMode==='peerjs') Object.values(connections).forEach(c=>{if(c.peer!==conn.peer)c.send(bc)});
                game.init();
            }
            else if(d.type === 'ROLL') { game.handleRoll(d.d1, d.d2); app.broadcastGame(); }
            else if(d.type === 'BUY') { game.buy(state.game.turn, d.idx); app.broadcastGame(); }
            else if(d.type === 'PAY') { game.pay(state.game.turn, d.amount, d.to); app.broadcastGame(); }
            else if(d.type === 'END_TURN') { game.nextTurn(); app.broadcastGame(); }
            else if(d.type === 'JAIL') { state.game.players[state.game.turn].pos=10; game.nextTurn(); app.broadcastGame(); }
            else if(d.type === 'REQ_MUSIC') { app.send({type: 'MUSIC_SYNC', url: d.url, title: d.title, artist: d.artist}); window.audio.playMusic(d.url, d.title, d.artist); }
        } else { // GUEST
            if(d.type === 'STATE') { state.game = d.game; if(d.myIdx!==undefined) state.myIndex=d.myIdx; document.getElementById('screen-home').classList.add('hidden'); document.getElementById('screen-game').classList.remove('hidden'); document.getElementById('room-code').innerText="Playing"; game.init(); }
            else if(d.type === 'UPDATE_GAME') { state.game = d.game; ui.renderPlayers(); ui.updateTurn(); }
            else if(d.type === 'MUSIC_SYNC') window.audio.playMusic(d.url, d.title, d.artist);
        }
    },
    broadcastGame: () => {
        const d = {type:'UPDATE_GAME', game: state.game};
        if(state.networkMode==='peerjs') Object.values(connections).forEach(c=>c.send(d)); else if(simplePeer) simplePeer.send(JSON.stringify(d));
    },
    copySignal: () => { document.getElementById('my-signal-data').select(); document.execCommand('copy'); alert("Copied!"); },
    connectSignal: () => { try { simplePeer.signal(JSON.parse(document.getElementById('other-signal-data').value)); document.getElementById('modal-signal').classList.add('hidden'); } catch(e){ alert("Invalid"); } },
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
    addAudioStream: (s) => { const a=document.createElement('audio'); a.srcObject=s; a.play(); document.getElementById('voice-streams').appendChild(a); }
};

// NETWORK IMPL
const initPeerJS = (id, targetId) => {
    const peer = new Peer(id, { config: SHARED_CONFIG });
    peerInstance = peer;
    peer.on('call', c => { c.answer(); c.on('stream', s => app.addAudioStream(s)); });
    peer.on('open', pid => {
        if(state.myIndex===0) { state.roomCode = pid.replace(PEER_PREFIX,''); document.getElementById('room-code').innerText="ID: "+state.roomCode; document.getElementById('screen-home').classList.add('hidden'); document.getElementById('screen-game').classList.remove('hidden'); state.game.players[0].peerId=pid; game.init(); }
        else { const conn = peer.connect(PEER_PREFIX+targetId); peer.conn=conn; conn.on('open', ()=>conn.send({type:'JOIN', name:document.getElementById('input-name').value})); conn.on('data', d=>app.handleData(d,conn)); connections['host']=conn; }
    });
    peer.on('connection', c => { c.on('data', d=>app.handleData(d,c)); c.on('open', ()=>{connections[c.peer]=c; if(window.myStream) peer.call(c.peer, window.myStream);}); });
};
const initSimplePeerHost = () => { simplePeer = new SimplePeer({initiator:true, trickle:false}); setupSimplePeerEvents(simplePeer, true); };
const initSimplePeerGuest = () => { simplePeer = new SimplePeer({initiator:false, trickle:false}); setupSimplePeerEvents(simplePeer, false); ui.showSignalModal("", 2); };
const setupSimplePeerEvents = (p, isHost) => {
    p.on('signal', d => ui.showSignalModal(JSON.stringify(d), 1));
    p.on('connect', () => { document.getElementById('modal-signal').classList.add('hidden'); if(isHost) { document.getElementById('screen-home').classList.add('hidden'); document.getElementById('screen-game').classList.remove('hidden'); game.init(); } else p.send(JSON.stringify({type:'JOIN', name:document.getElementById('input-name').value})); });
    p.on('data', d => app.handleData(JSON.parse(d.toString()), {}));
};

window.audio = new AudioManager();
app.init();

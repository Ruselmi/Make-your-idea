// UNO GAME LOGIC

const PEER_PREFIX = "IND_UNO_";

// UNO specific implementation of Game Logic
const unoGame = {
    init: (mode, opts) => {
        const s = window.state.game;
        s.active=true;
        s.turn=0; s.direction=1; s.currentSide='light'; s.stackCount=0; s.unoCalled={}; s.currentColor=null;

        unoGame.initDeck(mode);
        s.hands={};
        window.state.players.forEach(p => {
            s.hands[p.id]=[];
            for(let i=0; i<opts.cc; i++) if(s.drawPile.length>0) s.hands[p.id].push(s.drawPile.pop());
        });

        let top = s.drawPile.pop();
        if (mode !== 'UNO_WAR' && mode !== 'UNO_CHAOS') {
            while(s.cards[top].l.type !== 'num' && s.drawPile.length > 0) {
                s.drawPile.unshift(top);
                top = s.drawPile.pop();
            }
        }
        if (top === undefined && s.drawPile.length === 0) top = 0;
        s.discardPile = [top];
    },
    getTop: () => { const s = window.state.game; return (s.discardPile && s.discardPile.length>0) ? (s.currentSide==='light'?s.cards[s.discardPile[s.discardPile.length-1]].l:s.cards[s.discardPile[s.discardPile.length-1]].d) : null; },
    initDeck: (m) => {
        let cards = [];
        const cols = ['red','blue','green','yellow']; const dCols = ['orange','teal','purple','pink'];
        const addPair = (lType, lVal, lCol, dType, dVal, dCol) => { cards.push({ l: {type:lType, val:lVal, color:lCol}, d: {type:dType, val:dVal, color:dCol} }); };
        if(m === 'UNO_FLIP') { cols.forEach((c, i) => { addPair('flip', 'FLIP', c, 'flip', 'FLIP', dCols[i]); addPair('flip', 'FLIP', c, 'flip', 'FLIP', dCols[i]); }); }
        if(m === 'UNO_CHAOS') { for(let i=0;i<108;i++) addPair('wild', 'WILD', 'black', 'wild', 'WILD', 'black'); const finalCards = window.utils.shuffle(cards).map((c, i) => ({id:i, l:c.l, d:c.d})); window.state.game.cards = finalCards; window.state.game.drawPile = finalCards.map(c => c.id); return; }
        if(m !== 'UNO_WAR') { cols.forEach((c, i) => { addPair('num', '0', c, 'num', '0', dCols[i]); for(let n=1; n<=9; n++) { addPair('num', n+'', c, 'num', n+'', dCols[i]); addPair('num', n+'', c, 'num', n+'', dCols[i]); } }); }
        if(m !== 'UNO_ZEN') { cols.forEach((c, i) => { addPair('draw2', '+2', c, 'draw5', '+5', dCols[i]); addPair('draw2', '+2', c, 'draw5', '+5', dCols[i]); addPair('skip', 'SKIP', c, 'skip_all', 'SKIP ALL', dCols[i]); addPair('skip', 'SKIP', c, 'skip_all', 'SKIP ALL', dCols[i]); addPair('reverse', 'REV', c, 'reverse', 'REV', dCols[i]); addPair('reverse', 'REV', c, 'reverse', 'REV', dCols[i]); }); for(let j=0; j<4; j++) { addPair('wild', 'WILD', 'black', 'wild', 'WILD', 'black'); addPair('wild_draw', '+4', 'black', 'wild_draw', '+6', 'black'); } if(m === 'UNO_NO_MERCY') { for(let k=0; k<4; k++) { addPair('draw10', '+10', 'black', 'draw10', '+10', 'black'); } } }
        const finalCards = window.utils.shuffle(cards).map((c, i) => ({id:i, l:c.l, d:c.d})); window.state.game.cards = finalCards; window.state.game.drawPile = finalCards.map(c => c.id);
    },
    handle: (pid, act, pay) => {
        const s=window.state.game, pList=window.state.players;
        if(pList[s.turn].id!==pid && act!=='SAY_UNO') return {up:false};
        if(act==='SAY_UNO') { if(s.hands[pid].length<=2) { s.unoCalled[pid]=true; return {up:true, msg:`${pList.find(p=>p.id===pid).name} teriak UNO!`}; } return {up:false}; }
        if(act==='DRAW') { window.audio.playSfx('card'); if(s.stackCount>0) { for(let i=0;i<s.stackCount;i++) if(s.drawPile.length) s.hands[pid].push(s.drawPile.pop()); const m=`Kena +${s.stackCount}!`; s.stackCount=0; unoGame.next(); return {up:true, msg:m}; } if(!s.drawPile.length) { if(s.discardPile.length>1) { const t=s.discardPile.pop(); s.drawPile=window.utils.shuffle(s.discardPile); s.discardPile=[t]; } else return {up:true, msg:"Deck Habis!"}; } if(s.drawPile.length) s.hands[pid].push(s.drawPile.pop()); s.unoCalled[pid]=false; unoGame.next(); return {up:true}; }
        if(act==='PLAY') {
            const top=unoGame.getTop(), c=s.currentSide==='light'?s.cards[pay.cid].l:s.cards[pay.cid].d;
            let ok=(c.color==='black'||c.color===(s.currentColor||top.color)||c.val===top.val);
            if(s.stackCount>0) ok=(c.val.includes('+')&&parseInt(c.val.replace('+',''))>=parseInt(top.val.replace('+','')));
            if(ok) {
                window.audio.playSfx('card');
                s.hands[pid]=s.hands[pid].filter(x=>x!==pay.cid);
                if(s.hands[pid].length===1&&!s.unoCalled[pid]) { for(let i=0;i<2;i++) if(s.drawPile.length) s.hands[pid].push(s.drawPile.pop()); window.utils.alert("LUPA UNO!", "Kena hukuman +2 kartu"); }
                s.discardPile.push(pay.cid); s.currentColor=(c.color==='black')?pay.col:null; s.unoCalled[pid]=false;
                if(c.type.includes('draw') || c.val.includes('+')) { const val = parseInt(c.val.replace('+','')); if(!isNaN(val)) s.stackCount += val; }
                if(c.type==='flip') { s.currentSide=s.currentSide==='light'?'dark':'light'; }
                let sk=0; if(c.type==='skip') sk=1; if(c.type==='skip_all') sk = pList.length - 1; if(c.type==='reverse') { if(pList.length===2) sk=1; else s.direction*=-1; }
                if(s.hands[pid].length===0) return {up:true, msg:`${pList.find(p=>p.id===pid).name} MENANG!`};
                unoGame.next(sk); return {up:true};
            }
        } return {up:false};
    },
    next: (sk=0) => { const s=window.state.game, len=window.state.players.length; s.turn=(s.turn+(s.direction*(1+sk)))%len; if(s.turn<0) s.turn+=len; },
    draw: () => window.app.process(window.state.myId,'DRAW'),
    play: (cid,c) => c.color==='black'?window.ui.pkClr(cid):window.app.process(window.state.myId,'PLAY',{cid}),
    sayUno: () => window.app.process(window.state.myId,'SAY_UNO')
};

// UI IMPL FOR UNO
const unoUI = {
    render: () => {
        const s = window.state.game, me = window.state.myId; const turnP = window.state.players[s.turn]; const isMyTurn = turnP.id === me;
        document.getElementById('turn-indicator').innerText = isMyTurn ? "GILIRANMU!" : `Giliran ${turnP.name}`; document.getElementById('turn-indicator').className = `text-[10px] font-bold px-4 py-1 rounded-full border border-white/10 backdrop-blur-md transition-all duration-300 ${isMyTurn ? 'bg-gradient-to-r from-green-500 to-emerald-600 scale-110 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-black/50'}`; document.getElementById('bg-color-indicator').className = `absolute inset-0 opacity-40 transition-colors duration-1000 ${s.currentSide==='dark'?'bg-purple-900':'bg-blue-900'}`;
        const top = unoGame.getTop(); if(!top) return; const colMap = {'red':'c-red','blue':'c-blue','green':'c-green','yellow':'c-yellow','orange':'c-orange','teal':'c-teal','purple':'c-purple','pink':'c-pink','black':'c-black'}; const ac = s.currentColor || top.color; const disc = document.getElementById('uno-discard');
        const mode = window.state.gameMode; let skinClass = ''; if(mode==='UNO_WAR') skinClass = 'skin-war'; else if(mode==='UNO_ZEN') skinClass = 'skin-zen'; else if(mode==='UNO_CHAOS') skinClass = 'skin-chaos'; else if(mode==='UNO_GOLDEN') skinClass = 'skin-gold';
        if(disc.dataset.val !== top.val + top.color) { disc.classList.remove('flip-transition'); void disc.offsetWidth; disc.classList.add(s.currentSide === 'dark' || s.cards[0].d.color ? 'flip-transition' : 'animate-pop'); disc.dataset.val = top.val + top.color; window.audio.playSfx('card'); }
        disc.className = `uno-card transform rotate-6 shadow-2xl ${colMap[ac]||'c-black'} ${skinClass}`; disc.innerHTML = window.ui.createCardHTML(top.val, ac); disc.style.borderColor = s.currentSide==='dark' ? '#e040fb' : 'white'; document.getElementById('uno-deck').className = `uno-card hover:scale-105 shadow-2xl ${s.currentSide==='dark'?'c-back-dark':'c-back-light'} ${skinClass}`;
        const hc = document.getElementById('my-hand-container'); hc.innerHTML=''; const myCards = s.hands[me]||[]; myCards.forEach(cid => { const c = s.currentSide==='light' ? s.cards[cid].l : s.cards[cid].d; const el = document.createElement('div'); el.className = `uno-card ${colMap[c.color]||'c-black'} ${skinClass}`; el.innerHTML = window.ui.createCardHTML(c.val, c.color); el.onclick = () => unoGame.play(cid, c); hc.appendChild(el); });
        const btnUno = document.getElementById('btn-say-uno'); if(myCards.length === 2 && !s.unoCalled[me]) btnUno.classList.remove('hidden'); else btnUno.classList.add('hidden');
        const ops = document.getElementById('uno-opponents'); ops.innerHTML=''; window.state.players.forEach((p,i) => { if(p.id!==me) { const act = s.turn===i ? 'border-yellow-400 bg-yellow-400/10 scale-110 shadow-lg shadow-yellow-400/20' : 'border-white/10 opacity-60'; let cardDisplay = `${s.hands[p.id]?.length||0} Cards`; if(mode === 'UNO_OPEN') { cardDisplay = `<div class="flex -space-x-1 overflow-hidden h-3 w-10 justify-center">${(s.hands[p.id]||[]).map(()=>`<div class="w-1.5 h-3 bg-white border border-black"></div>`).join('')}</div>`; } ops.innerHTML += `<div class="flex flex-col items-center p-2 rounded-xl border transition-all duration-300 ${act} glass shrink-0"><div class="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/20 mb-1 shadow-lg">${p.name.substring(0,2)}</div><div class="text-[9px] font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/5">${cardDisplay}</div>${s.unoCalled[p.id] ? '<div class="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full mt-1 font-bold animate-pulse shadow-lg">UNO!</div>' : ''}</div>`; } }); document.getElementById('stack-indicator').innerText = `+${s.stackCount}`; document.getElementById('stack-indicator').classList.toggle('hidden', s.stackCount===0);
    },
    createCardHTML: (val, color, isSmall=false) => { const displayVal = val.replace('WILD','W').replace('FLIP','F'); let icon = displayVal; if(val==='skip') icon = '<i class="fa-solid fa-ban"></i>'; else if(val==='skip_all') icon = '<i class="fa-solid fa-ban text-red-500"></i>'; else if(val==='reverse') icon = '<i class="fa-solid fa-rotate"></i>'; return `<div class="card-oval ${isSmall?'opacity-50':''}"><span class="big-symbol" style="color:${color==='black'?'white':'inherit'}">${icon}</span></div><div class="corner-val tl">${displayVal}</div><div class="corner-val br">${displayVal}</div>`; },
    pkClr: (cid) => { const g=document.getElementById('color-grid'); g.innerHTML=''; const s = window.state.game; const colors = s.currentSide === 'dark' ? ['orange', 'teal', 'purple', 'pink'] : ['red', 'blue', 'green', 'yellow']; colors.forEach(c=>{ const b=document.createElement('button'); b.className=`h-14 rounded-2xl bg-${c}-500 hover:scale-105 transition shadow-lg capitalize font-black text-sm border-2 border-white/20`; b.innerText = c; b.onclick=()=>{document.getElementById('modal-color').classList.add('hidden'); window.app.process(window.state.myId,'PLAY',{cid, col:c});}; g.appendChild(b); }); document.getElementById('modal-color').classList.remove('hidden'); }
};

window.game = unoGame;
window.ui = { ...window.ui, ...unoUI }; // Merge shared UI and Uno UI

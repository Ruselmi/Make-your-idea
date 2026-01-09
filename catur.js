// CHESS LOGIC

const PEER_PREFIX = "IND_CATUR_";

const chessGame = {
    init: (mode, opts) => {
        const s = window.state.game;
        s.active=true;
        s.turn=0; // Added turn counter
        const ps = [...window.state.players];
        s.chessBoards=[]; s.playerAssignments={};
        let p1Color = 'white';
        if(opts.chessCol === 'black') p1Color = 'black';
        else if(opts.chessCol === 'random') p1Color = Math.random()>0.5 ? 'white' : 'black';
        const p1 = ps[0], p2 = ps[1];
        const p1C = p1Color, p2C = p1Color==='white'?'black':'white';
        s.chessBoards.push(chessGame.createBoard(mode, p1Color==='white'?p1.name:p2.name, p1Color==='black'?p1.name:p2.name));
        s.playerAssignments[p1.id] = {b:0, c:p1C};
        s.playerAssignments[p2.id] = {b:0, c:p2C};
        for(let i=2; i<ps.length; i++) s.playerAssignments[ps[i].id] = {role:'spec'};
    },
    createBoard: (mode, wn, bn) => { const brd = Array(64).fill(null); const p = ['r','n','b','q','k','b','n','r']; if(mode === 'CHESS_REVOLT') { brd[4]='w_k'; for(let i=8;i<16;i++) brd[i]='w_p'; brd[60]='b_k'; brd[57]='b_n'; brd[62]='b_n'; brd[58]='b_n'; brd[61]='b_n'; } else if (mode === 'CHESS_UPSIDE') { for(let i=0;i<8;i++) { brd[i]='b_'+p[i]; brd[i+8]='b_p'; brd[i+48]='w_p'; brd[i+56]='w_'+p[i]; } [brd[3],brd[4]]=[brd[4],brd[3]]; [brd[59],brd[60]]=[brd[60],brd[59]]; } else { for(let i=0;i<8;i++) { brd[i]='b_'+p[i]; brd[i+8]='b_p'; brd[i+48]='w_p'; brd[i+56]='w_'+p[i]; } } return { b:brd, tc:'white', win:null, wn:wn, bn:bn, checks:{w:0, b:0}, mode:mode }; },
    getMoves: (brd, idx, type, color) => { const moves = []; const r=Math.floor(idx/8), c=idx%8; const add = (tr, tc) => { if(tr>=0 && tr<8 && tc>=0 && tc<8) { const ti=tr*8+tc; const occ=brd[ti]; if(!occ) { moves.push(ti); return true; } else if(occ[0] !== color[0]) { moves.push(ti); return false; } else return false; } return false; }; if(type.endsWith('p')) { const dir = color==='white' ? -1 : 1; if(!brd[(r+dir)*8+c]) { moves.push((r+dir)*8+c); if((color==='white' && r===6) || (color==='black' && r===1)) if(!brd[(r+dir*2)*8+c]) moves.push((r+dir*2)*8+c); } if(c>0 && brd[(r+dir)*8+(c-1)] && brd[(r+dir)*8+(c-1)][0]!==color[0]) moves.push((r+dir)*8+(c-1)); if(c<7 && brd[(r+dir)*8+(c+1)] && brd[(r+dir)*8+(c+1)][0]!==color[0]) moves.push((r+dir)*8+(c+1)); } else if(type.endsWith('n')) { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(o => add(r+o[0], c+o[1])); } else if(type.endsWith('k')) { for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) if(i||j) add(r+i, c+j); } else { const dirs = []; if(type.endsWith('r') || type.endsWith('q')) dirs.push([-1,0],[1,0],[0,-1],[0,1]); if(type.endsWith('b') || type.endsWith('q')) dirs.push([-1,-1],[-1,1],[1,-1],[1,1]); dirs.forEach(d => { let k=1; while(add(r+d[0]*k, c+d[1]*k)) k++; }); } return moves; },
    handle: (pid, act, pay) => { const as = window.state.game.playerAssignments[pid]; if(!as || as.role==='spec') return {up:false}; const brdObj = window.state.game.chessBoards[as.b]; if(brdObj.win || as.c!==brdObj.tc) return {up:false}; if(act==='MOVE') { const p = brdObj.b[pay.from]; const validGeo = chessGame.getMoves(brdObj.b, pay.from, p, as.c); if(!validGeo.includes(pay.to)) return {up:false}; const target = brdObj.b[pay.to]; let msg = null; if(brdObj.mode === 'CHESS_ATOMIC' && target) { brdObj.b[pay.from] = null; brdObj.b[pay.to] = null; const tr=Math.floor(pay.to/8), tc=pay.to%8; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) { const idx=(tr+i)*8+(tc+j); if(tr+i>=0 && tr+i<8 && tc+j>=0 && tc+j<8) { const victim=brdObj.b[idx]; if(victim && !victim.endsWith('p')) { if(victim.endsWith('k')) { brdObj.win=(victim[0]==='w'?brdObj.bn:brdObj.wn); msg="ATOMIC WIN!"; } brdObj.b[idx]=null; } } } } else { brdObj.b[pay.to] = p; brdObj.b[pay.from] = null; } if(brdObj.b[pay.to] && brdObj.b[pay.to].endsWith('p') && (pay.to<8 || pay.to>55)) brdObj.b[pay.to] = as.c==='white'?'w_q':'b_q'; if(!brdObj.win) { if(target && target.endsWith('k')) { brdObj.win = window.state.players.find(x=>x.id===pid).name; msg='CHECKMATE!'; } else if(brdObj.mode === 'CHESS_KOTH' && p.endsWith('k') && [27,28,35,36].includes(pay.to)) { brdObj.win = window.state.players.find(x=>x.id===pid).name; msg='KING OF THE HILL!'; } } brdObj.tc = brdObj.tc==='white'?'black':'white'; window.audio.playSfx('click'); return {up:true, msg: msg}; } return {up:false}; },
    prevBoard: () => { window.state.game.refereeViewIdx--; window.ui.render(); },
    nextBoard: () => { window.state.game.refereeViewIdx++; window.ui.render(); }
};

// UI
const chessUI = {
    render: () => {
        const s = window.state.game, me = window.state.myId; const as = s.playerAssignments[me]; let bi = as.role==='spec' ? Math.abs(s.refereeViewIdx % s.chessBoards.length) : as.b; const brd = s.chessBoards[bi]; if(!brd) return;
        document.getElementById('chess-board-label').innerText = `MEJA ${bi+1}`; document.getElementById('chess-p1').innerHTML = `<div class="w-2 h-2 bg-white rounded-full"></div> ${brd.wn}`; document.getElementById('chess-p2').innerHTML = `<div class="w-2 h-2 bg-black border border-slate-500 rounded-full"></div> ${brd.bn}`;
        const isMyTurn = as.c === brd.tc && !brd.win; document.getElementById('chess-status').innerText = brd.win ? `PEMENANG: ${brd.win}` : (isMyTurn ? "GILIRAN ANDA" : `Giliran: ${brd.tc==='white'?'PUTIH':'HITAM'}`); if(isMyTurn) document.getElementById('chess-status').className = "mt-6 text-white font-bold text-xs bg-green-600 px-6 py-2 rounded-full border border-white/10 shadow-lg tracking-wide animate-pulse text-center"; else document.getElementById('chess-status').className = "mt-6 text-white font-bold text-xs bg-slate-900 px-6 py-2 rounded-full border border-white/10 shadow-lg tracking-wide text-center";
        if(as.role==='spec') document.getElementById('spectator-controls').classList.remove('hidden'); const el = document.getElementById('chess-board'); el.innerHTML=''; const rot = (as.c==='black'); el.className = `w-full h-full bg-slate-700 grid grid-cols-8 grid-rows-8 ${rot?'rotate-180':''}`; let validMoves = []; if(window.ui.sel !== null) { const p = brd.b[window.ui.sel]; if(p) validMoves = chessGame.getMoves(brd.b, window.ui.sel, p, as.c); }
        brd.b.forEach((p, i) => { const c = document.createElement('div'); const r=Math.floor(i/8), cl=i%8; let k = `chess-sq ${(r+cl)%2===0?'chess-white':'chess-black'} ${rot?'rotate-180':''}`; if(window.ui.sel===i) k+=' chess-selected'; if(validMoves.includes(i)) k+= (p ? ' valid-capture' : ' valid-move'); c.className = k; if(p) { c.innerText = {'w_p':'♙','w_r':'♖','w_n':'♘','w_b':'♗','w_q':'♕','w_k':'♔','b_p':'♟','b_r':'♜','b_n':'♞','b_b':'♝','b_q':'♛','b_k':'♚'}[p]; c.style.color = p[0]==='w'?'white':'black'; if(p[0]==='w') c.style.textShadow = "0 0 2px black"; } c.onclick = () => { if(brd.win || as.role==='spec' || brd.tc!==as.c) return; if(window.ui.sel===null) { if(p && p.startsWith(as.c[0])) { window.ui.sel=i; window.ui.render(); } } else { if(window.ui.sel === i) { window.ui.sel=null; window.ui.render(); } else if (validMoves.includes(i)) { window.app.process(me, 'MOVE', {from:window.ui.sel, to:i, cap:p}); window.ui.sel=null; window.ui.render(); } else if (p && p.startsWith(as.c[0])) { window.ui.sel=i; window.ui.render(); } } }; el.appendChild(c); });
    },
    sel: null
};

window.game = chessGame;
window.ui = { ...window.ui, ...chessUI };

// SHARED UTILS AND AUDIO MANAGER

const SHARED_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

class AudioManager {
    constructor() {
        this.bgm = new Audio(); this.bgm.volume = 0.3; this.bgm.onended = () => this.handleTrackEnd();
        this.isMuted = false; this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.history = []; this.histIdx = -1;
        this.timer = null;
        this.playRandomIndo();
    }
    startTimer() { clearTimeout(this.timer); this.timer = setTimeout(() => document.getElementById('music-widget').classList.add('minimized'), 5000); }
    resetTimer() { clearTimeout(this.timer); document.getElementById('music-widget').classList.remove('minimized'); }

    playSfx(type) {
        if(this.isMuted) return; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination);
        if(type === 'click') { o.type = 'sine'; o.frequency.value = 800; g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.1); o.start(); o.stop(this.ctx.currentTime + 0.1); }
        else if (type === 'card') { o.type = 'triangle'; o.frequency.value = 600; g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.15); o.start(); o.stop(this.ctx.currentTime + 0.15); }
        else if (type === 'dice') { o.type = 'square'; o.frequency.value = 400; g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.2); o.start(); o.stop(this.ctx.currentTime + 0.2); }
        else if (type === 'move') { o.type = 'triangle'; o.frequency.value = 600; g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.15); o.start(); o.stop(this.ctx.currentTime + 0.15); }
        else if (type === 'win') { o.type = 'square'; o.frequency.setValueAtTime(400, this.ctx.currentTime); o.frequency.setValueAtTime(800, this.ctx.currentTime + 0.2); g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5); o.start(); o.stop(this.ctx.currentTime + 0.5); }
    }
    playMusic(url, title, artist, addToHist=true) {
        this.bgm.src = url; this.bgm.play().catch(e => console.log("Autoplay blocked"));
        this.updateUI(title, artist); this.startTimer();
        if(addToHist) {
            if(this.history.length === 0 || this.history[this.history.length-1].url !== url) {
                 this.history.push({url, title, artist});
                 this.histIdx = this.history.length - 1;
            }
        }
    }
    toggleMute() { this.isMuted = !this.isMuted; this.bgm.muted = this.isMuted; document.getElementById('btn-mute').innerHTML = this.isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'; document.querySelector('.visualizer').style.opacity = this.isMuted ? 0 : 1; }
    async playRandomIndo() { const terms = ['Indonesia Pop', 'Lagu Indonesia', 'Indo Hits', 'Dangdut']; const term = terms[Math.floor(Math.random()*terms.length)]; this.fetchAndPlay(term, true); }
    async fetchAndPlay(term, random=false) { try { const offset = random ? Math.floor(Math.random() * 50) : 0; const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&limit=1&offset=${offset}&media=music&country=ID`); const data = await res.json(); if(data.results && data.results.length > 0) { const track = data.results[0]; this.syncAndPlay(track.previewUrl, track.trackName, track.artistName); } } catch(e) {} }
    syncAndPlay(url, title, artist) {
        if(window.state && window.state.isHost && window.app) window.app.broadcast({type: 'MUSIC_SYNC', url, title, artist});
        this.playMusic(url, title, artist);
    }
    handleTrackEnd() { if(window.state && window.state.isHost) this.next(); }
    next() { if(!window.state || !window.state.isHost) return; if(this.histIdx < this.history.length - 1) { this.histIdx++; const t = this.history[this.histIdx]; this.syncAndPlay(t.url, t.title, t.artist); } else { this.playRandomIndo(); } }
    prev() { if(!window.state || !window.state.isHost) return; if(this.histIdx > 0) { this.histIdx--; const t = this.history[this.histIdx]; this.syncAndPlay(t.url, t.title, t.artist); } }
    openSearch() { document.getElementById('modal-music').classList.remove('hidden'); }
    async search() { const q = document.getElementById('music-search-input').value; if(!q) return; const list = document.getElementById('music-results'); list.innerHTML = '<div class="text-center animate-pulse">Mencari...</div>'; try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=10&media=music&country=ID`); const data = await res.json(); list.innerHTML = ''; data.results.forEach(t => { const div = document.createElement('div'); div.className = "flex justify-between items-center bg-white/5 p-2 rounded hover:bg-white/10 cursor-pointer"; div.innerHTML = `<div class="truncate w-48"><div class="font-bold text-yellow-400">${t.trackName}</div><div class="text-[10px] text-slate-400">${t.artistName}</div></div><button class="text-xs bg-blue-600 px-2 py-1 rounded"><i class="fa-solid fa-play"></i></button>`; div.onclick = () => { if(window.state.isHost) { this.syncAndPlay(t.previewUrl, t.trackName, t.artistName); } else { window.app.sendHost({type: 'REQ_MUSIC', url: t.previewUrl, title: t.trackName, artist: t.artistName}); window.utils.alert("Request", "Lagu direquest ke Host"); } document.getElementById('modal-music').classList.add('hidden'); }; list.appendChild(div); }); } catch(e) { list.innerHTML = 'Error.'; } }
    updateUI(t, a) { document.getElementById('music-title').innerText = t; document.getElementById('music-artist').innerText = a; }
}

const utils = {
    randId: () => Math.floor(1000 + Math.random() * 9000).toString(),
    randomName: () => document.getElementById('input-name').value = "Player" + Math.floor(Math.random()*100),
    shuffle: (array) => { for(let i=array.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } return array; },
    alert: (t, m, i='⚠️') => {
        if(document.getElementById('modal-alert')) {
            document.getElementById('alert-title').innerText=t;
            document.getElementById('alert-msg').innerText=m;
            document.getElementById('alert-icon').innerText=i;
            document.getElementById('modal-alert').classList.remove('hidden');
        } else {
            alert(t + ": " + m);
        }
    },
    showLoading: (cb) => {
        const l = document.getElementById('loading-overlay');
        if(l) {
            l.classList.remove('hidden');
            setTimeout(() => { l.classList.add('hidden'); if(cb) cb(); }, 1500);
        } else if(cb) cb();
    }
};

window.utils = utils;

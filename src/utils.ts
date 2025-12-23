import { ScriptItem } from './types';

// --- AUDIO UTILS ---

export const concatAudioBuffers = (audioCtx: AudioContext, buffers: (AudioBuffer | undefined | null)[]): AudioBuffer => {
  const validBuffers = buffers.filter((b): b is AudioBuffer => !!b);
  if (validBuffers.length === 0) {
    return audioCtx.createBuffer(1, audioCtx.sampleRate * 1, audioCtx.sampleRate);
  }
  const totalLen = validBuffers.reduce((acc, b) => acc + b.length, 0);
  const result = audioCtx.createBuffer(1, totalLen || audioCtx.sampleRate, audioCtx.sampleRate);
  const data = result.getChannelData(0);
  let offset = 0;
  for (const buf of validBuffers) {
    data.set(buf.getChannelData(0), offset);
    offset += buf.length;
  }
  return result;
};

export const pcmToWavBytes = (pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array => {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  
  const writeString = (v: DataView, o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);
  new Uint8Array(buffer, 44).set(pcmData);

  return new Uint8Array(buffer);
};

// --- PARSING & LOGIC ---

export const robustJsonParse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/[\n\r\t]/g, ' '));
      } catch (e2) { }
    }
    return null;
  }
};

export const refineScriptPlan = (rawScript: ScriptItem[]): ScriptItem[] => {
    let refined: ScriptItem[] = [];
    rawScript.forEach((scene) => {
        // Check text length. If > 80 characters, split into 2 visual scenes
        if (scene.text.length > 80) { 
            const midPoint = Math.floor(scene.text.length / 2);
            // Find closest space to middle to avoid cutting words
            let splitIdx = scene.text.indexOf(' ', midPoint);
            if (splitIdx === -1) splitIdx = midPoint;

            const part1 = scene.text.substring(0, splitIdx).trim();
            const part2 = scene.text.substring(splitIdx).trim();

            refined.push({
                speaker: scene.speaker,
                text: part1,
                visual_keyword: scene.visual_keyword
            });
            refined.push({
                speaker: scene.speaker,
                text: part2,
                visual_keyword: `${scene.visual_keyword} close up detail` // Visual variation
            });
        } else {
            // Short paragraph, keep as is
            refined.push(scene);
        }
    });
    return refined;
};

// --- CANVAS ANIMATION ---

export const drawSearchingEffect = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, bgImage: HTMLImageElement | null, activeThreads: number) => {
  // 1. BG Image Handling with darkening
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.save();
      const scale = Math.max(width / bgImage.width, height / bgImage.height);
      const x = (width / 2) - (bgImage.width / 2) * scale;
      const y = (height / 2) - (bgImage.height / 2) * scale;
      ctx.filter = 'blur(15px) brightness(0.2)'; // Darker blur for better contrast
      ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
      ctx.restore();
  } else {
      ctx.fillStyle = '#020617'; ctx.fillRect(0,0,width,height);
  }

  // 2. Central Morphing HUD
  const cx = width/2; 
  const cy = height/2;
  
  // Outer Ring (Rotating)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(frame * 0.02);
  ctx.strokeStyle = `rgba(16, 185, 129, 0.2)`; 
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 10]);
  ctx.beginPath(); 
  ctx.arc(0, 0, 80, 0, Math.PI*2); 
  ctx.stroke();
  ctx.restore();

  // Morphing Shape Logic (Logo yang ganti-ganti)
  // Cycle every 120 frames (~2 seconds)
  const cycle = 180;
  const phase = frame % cycle;
  const type = Math.floor(phase / (cycle / 3)); // 0: Circle, 1: Hexagon, 2: Diamond
  const morphProgress = (phase % (cycle / 3)) / (cycle / 3);
  
  ctx.save();
  ctx.translate(cx, cy);
  
  // Pulse Scale
  const pulse = 1 + Math.sin(frame * 0.1) * 0.05;
  ctx.scale(pulse, pulse);

  ctx.fillStyle = `rgba(52, 211, 153, 0.8)`;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 20;

  ctx.beginPath();
  
  const size = 35;

  if (type === 0) {
      // Circle -> Hexagon
      const radius = size;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else if (type === 1) {
      // Hexagon -> Diamond
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
  } else {
      // Diamond -> Circle
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(size * 1.2, 0);
      ctx.lineTo(0, size * 1.2);
      ctx.lineTo(-size * 1.2, 0);
      ctx.closePath();
  }

  ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.restore();

  // Active Threads Dots (Orbiting)
  const count = Math.min(activeThreads, 12);
  for(let i=0; i<count; i++) {
      const angle = (frame * 0.05) + (i * (Math.PI*2/count));
      const orbitRad = 100 + (Math.sin(frame * 0.05 + i) * 10);
      const tx = cx + Math.cos(angle) * orbitRad;
      const ty = cy + Math.sin(angle) * orbitRad;
      
      // Connection line
      ctx.strokeStyle = `rgba(52, 211, 153, 0.1)`; 
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      
      // Dot
      ctx.fillStyle = '#34d399'; 
      ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fill();
  }

  // Text Info
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
  const loadingTexts = ["GENERATING VISUALS", "SYNTHESIZING AUDIO", "COMPOSING SCENE"];
  const textIdx = Math.floor(frame / 60) % loadingTexts.length;
  
  ctx.fillText(loadingTexts[textIdx], cx, cy + 140);
  
  ctx.font = '10px "JetBrains Mono", monospace'; ctx.fillStyle = '#64748b';
  ctx.fillText(`ACTIVE THREADS: ${activeThreads}`, cx, cy + 160);
};


export const drawMergingEffect = (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  // Progress
  const w = 300; 
  const h = 6;
  
  // Track
  ctx.fillStyle = '#1e293b'; 
  ctx.beginPath(); ctx.roundRect(width/2 - w/2, height/2, w, h, 3); ctx.fill();

  // Bar
  ctx.fillStyle = '#10b981'; 
  ctx.shadowColor = '#10b981'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.roundRect(width/2 - w/2, height/2, w * progress, h, 3); ctx.fill();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = '#fff'; 
  ctx.font = 'bold 30px monospace'; 
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(progress * 100)}%`, width / 2, height / 2 - 20);
  
  ctx.font = '12px monospace'; 
  ctx.fillStyle = '#94a3b8';
  ctx.fillText("ENCODING VIDEO STREAM", width / 2, height / 2 + 40);
};

export const drawAudioVisualizer = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    analyser: AnalyserNode,
    color: string
) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    // Draw at the bottom
    const bottomY = height - 80; // Above some padding

    // Symmetrical visualizer (Center out)
    // We only use the lower half of frequencies (more bass/mid) for better visuals
    const effectiveLen = Math.floor(bufferLength / 2);
    const centerX = width / 2;
    const step = width / effectiveLen / 2;

    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'black';

    for (let i = 0; i < effectiveLen; i++) {
        // Boost high frequencies slightly for visibility
        barHeight = dataArray[i] * (height * 0.0008) * (1 + i/effectiveLen);
        
        // Make it smooth
        if (barHeight < 2) barHeight = 2;

        // Left side
        ctx.globalAlpha = 0.6 + (i/effectiveLen) * 0.4;
        ctx.fillRect(centerX - (i * step) - step, bottomY - barHeight, step - 2, barHeight);
        
        // Right side (Mirror)
        ctx.fillRect(centerX + (i * step), bottomY - barHeight, step - 2, barHeight);
    }
    
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
};
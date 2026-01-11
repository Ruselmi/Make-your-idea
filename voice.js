
class VoiceManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.destination = this.ctx.createMediaStreamDestination();
        this.source = null;
        this.stream = null;
        this.effects = {
            robot: false,
            room: false,
            echo: false
        };
        this.nodes = {};
    }

    async getStream() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.stream = stream;
            this.source = this.ctx.createMediaStreamSource(stream);
            this.buildChain();
            return this.destination.stream;
        } catch (e) {
            console.error("Mic Access Error:", e);
            alert("Gagal akses mikrofon. Pastikan izin diberikan.");
            return null;
        }
    }

    buildChain() {
        // Disconnect old
        if (this.source) this.source.disconnect();

        let current = this.source;

        // 1. ROBOT EFFECT (Ring Modulator)
        if (this.effects.robot) {
            const osc = this.ctx.createOscillator();
            osc.frequency.value = 50; // Low freq for robotic growl
            osc.type = 'sawtooth';
            osc.start();

            const gain = this.ctx.createGain();
            gain.gain.value = 0.8;

            const ring = this.ctx.createGain();
            ring.gain.value = 0.0; // Controlled by OSC

            // Connect Osc to Gain of Ring
            osc.connect(ring.gain);

            // Signal flow
            current.connect(ring);
            current = ring;
        }

        // 2. ROOM EFFECT (Reverb via Convolver)
        if (this.effects.room) {
            const convolver = this.ctx.createConvolver();
            convolver.buffer = this.impulseResponse(2.0, 2.0); // 2 seconds duration

            const dry = this.ctx.createGain();
            const wet = this.ctx.createGain();
            dry.gain.value = 0.6;
            wet.gain.value = 0.4;

            current.connect(dry);
            current.connect(convolver);
            convolver.connect(wet);

            const merger = this.ctx.createChannelMerger(1); // Merge back
            // Simplify: just connect both to next
            // We need a merge node if we split.
            // Let's just use a Gain node as a mixer
            const mixer = this.ctx.createGain();
            dry.connect(mixer);
            wet.connect(mixer);

            current = mixer;
        }

        // 3. ECHO (Dengung)
        if (this.effects.echo) {
            const delay = this.ctx.createDelay();
            delay.delayTime.value = 0.4;

            const feedback = this.ctx.createGain();
            feedback.gain.value = 0.4;

            const filter = this.ctx.createBiquadFilter();
            filter.frequency.value = 1000;

            delay.connect(feedback);
            feedback.connect(filter);
            filter.connect(delay);

            current.connect(delay);
            current.connect(this.destination); // Dry signal
            delay.connect(this.destination);   // Wet signal
            return; // Connected to dest
        }

        // Connect to destination
        if (current) current.connect(this.destination);
    }

    setEffect(type, active) {
        this.effects[type] = active;
        if(this.stream) this.buildChain();
    }

    impulseResponse(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = i;
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
        return impulse;
    }

    stop() {
        if(this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.ctx.close();
    }
}

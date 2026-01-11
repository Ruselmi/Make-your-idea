
const Game = {
    // STATE
    ready: false,
    role: null, // 'physical' or 'observer'
    peer: null,
    conn: null,
    isHost: false,
    fear: 0,

    // THREE.JS
    scene: null,
    camera: null,
    renderer: null,
    clock: new THREE.Clock(),
    flashlight: null,

    // OBJECTS
    player: { mesh: null, velocity: new THREE.Vector3(), input: { x: 0, y: 0 } },
    otherPlayer: { mesh: null },
    ghost: null,

    // INPUT
    joystick: { active: false, origin: {x:0, y:0}, current: {x:0, y:0} },

    init: () => {
        // Setup Three.js
        const canvas = document.getElementById('game-canvas');
        Game.scene = new THREE.Scene();
        Game.scene.background = new THREE.Color(0x000000);

        Game.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
        Game.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        Game.renderer.setSize(window.innerWidth, window.innerHeight);

        // RTX Setup
        ThreeHelper.setupRTX(Game.renderer, Game.scene, Game.camera);

        // Map
        MapGen.init(Game.scene);

        // Ghost
        Game.ghost = new HantuAI(Game.scene);

        // Player Setup
        Game.player.mesh = new THREE.Group();
        Game.player.mesh.add(Game.camera);
        Game.player.mesh.position.set(0, 1.7, 0); // Eye height
        Game.scene.add(Game.player.mesh);

        // Flashlight
        Game.flashlight = new THREE.SpotLight(0xffffff, 1, 20, Math.PI/4, 0.5, 1);
        Game.flashlight.position.set(0.2, -0.2, 0);
        Game.flashlight.target.position.set(0, 0, -1);
        Game.camera.add(Game.flashlight);
        Game.camera.add(Game.flashlight.target);

        // Other Player Mesh
        const opGeo = new THREE.CapsuleGeometry(0.4, 1.8);
        const opMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        Game.otherPlayer.mesh = new THREE.Mesh(opGeo, opMat);
        Game.scene.add(Game.otherPlayer.mesh);

        // Events
        window.addEventListener('resize', Game.onResize);
        Game.setupInput();

        // Loop
        requestAnimationFrame(Game.loop);

        // Show Menu
        document.getElementById('menu-modal').classList.remove('hidden');
    },

    setupInput: () => {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');

        const touchHandler = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if(e.type === 'touchstart') {
                Game.joystick.active = true;
                Game.joystick.origin = { x: touch.clientX, y: touch.clientY };
                knob.style.transition = 'none';
            } else if (e.type === 'touchmove' && Game.joystick.active) {
                const dx = touch.clientX - Game.joystick.origin.x;
                const dy = touch.clientY - Game.joystick.origin.y;
                const dist = Math.min(50, Math.sqrt(dx*dx + dy*dy));
                const angle = Math.atan2(dy, dx);

                const nx = Math.cos(angle) * dist;
                const ny = Math.sin(angle) * dist;

                knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

                // Update Input Vector (normalized)
                Game.player.input.x = nx / 50;
                Game.player.input.y = ny / 50;
            }
        };

        const endHandler = () => {
            Game.joystick.active = false;
            Game.player.input.x = 0;
            Game.player.input.y = 0;
            knob.style.transform = 'translate(-50%, -50%)';
            knob.style.transition = 'transform 0.2s';
        };

        zone.addEventListener('touchstart', touchHandler);
        zone.addEventListener('touchmove', touchHandler);
        zone.addEventListener('touchend', endHandler);

        // Camera Look (Touch Drag on right side)
        let lookStart = {x:0, y:0};
        document.addEventListener('touchstart', e => {
            if(e.touches[0].clientX > window.innerWidth/2 && !e.target.closest('button')) {
                lookStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
            }
        });
        document.addEventListener('touchmove', e => {
            if(e.touches[0].clientX > window.innerWidth/2 && !e.target.closest('button')) {
                 const dx = e.touches[0].clientX - lookStart.x;
                 // Rotate Player Y
                 Game.player.mesh.rotation.y -= dx * 0.005;
                 lookStart.x = e.touches[0].clientX;
            }
        });

        // Buttons
        document.getElementById('btn-flashlight').onclick = () => {
            Game.flashlight.visible = !Game.flashlight.visible;
            // Sync
            if(Game.conn) Game.conn.send({type: 'FX', flashlight: Game.flashlight.visible});
        };

        // Radio
        document.getElementById('btn-radio').onclick = () => {
             const btn = document.getElementById('btn-radio');
             btn.classList.toggle('active');
             if(btn.classList.contains('active')) {
                 // Start Voice
                 if(window.voice) window.voice.getStream().then(s => {
                     if(Game.peer && Game.conn) { // Send call
                         Game.peer.call(Game.conn.peer, s);
                     }
                 });
             } else {
                 if(window.voice) window.voice.stop();
             }
        };
    },

    loop: () => {
        const dt = Game.clock.getDelta();

        // Movement
        if(Game.player.input.y !== 0 || Game.player.input.x !== 0) {
            const speed = 3.0 * dt;
            const dir = new THREE.Vector3(Game.player.input.x, 0, Game.player.input.y);
            dir.applyAxisAngle(new THREE.Vector3(0,1,0), Game.player.mesh.rotation.y);
            Game.player.mesh.position.add(dir.multiplyScalar(speed));

            // Sync
            if(Game.conn && Game.ready) {
                Game.conn.send({
                    type: 'MOVE',
                    pos: Game.player.mesh.position,
                    rot: Game.player.mesh.rotation
                });
            }
        }

        // Ghost Update
        if(Game.ghost) Game.ghost.update(dt, Game.player.mesh.position, Game.fear);

        // Fear Logic
        Game.updateFear(dt);

        Game.renderer.render(Game.scene, Game.camera);
        requestAnimationFrame(Game.loop);
    },

    updateFear: (dt) => {
        // Darkness increases fear
        if(!Game.flashlight.visible) Game.fear += dt * 1;
        else Game.fear -= dt * 0.5;

        // Clamp
        Game.fear = Math.max(0, Math.min(100, Game.fear));

        // UI
        document.getElementById('fear-bar').style.width = Game.fear + '%';
        document.getElementById('vignette').style.opacity = 0.5 + (Game.fear/200);

        if(Game.fear > 80) {
            // Shake camera
            Game.camera.position.x = (Math.random()-0.5) * 0.1;
            Game.camera.position.y = (Math.random()-0.5) * 0.1;
        } else {
            Game.camera.position.set(0,0,0);
        }
    },

    onResize: () => {
        Game.camera.aspect = window.innerWidth / window.innerHeight;
        Game.camera.updateProjectionMatrix();
        Game.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    // NETWORK
    createRoom: () => {
        const id = Math.floor(1000 + Math.random()*9000);
        const peer = new Peer("HORROR-" + id);
        Game.peer = peer;
        Game.isHost = true;
        Game.role = 'physical'; // Host is Physical

        peer.on('open', (pid) => {
            document.getElementById('menu-modal').classList.add('hidden');
            document.getElementById('lobby-modal').classList.remove('hidden');
            document.getElementById('lobby-code').innerText = id;
            document.getElementById('p1-name').innerText = document.getElementById('input-name').value;
            document.getElementById('role-badge').innerText = "PHYSICAL";
        });

        peer.on('connection', (conn) => {
            Game.conn = conn;
            conn.on('open', () => {
                conn.send({type: 'INFO', hostName: document.getElementById('input-name').value});
            });
            conn.on('data', Game.handleData);

            // Audio Call handler
            peer.on('call', call => {
                call.answer();
                call.on('stream', s => {
                    const a = new Audio();
                    a.srcObject = s;
                    a.play();
                });
            });
        });
    },

    joinRoom: () => {
        const code = document.getElementById('input-room').value;
        const peer = new Peer();
        Game.peer = peer;
        Game.role = 'observer'; // Client is Observer

        peer.on('open', () => {
            const conn = peer.connect("HORROR-" + code);
            Game.conn = conn;
            conn.on('open', () => {
                conn.send({type: 'JOIN', name: document.getElementById('input-name').value});
                document.getElementById('menu-modal').classList.add('hidden');
                document.getElementById('loading-screen').classList.remove('hidden');
                document.getElementById('role-badge').innerText = "OBSERVER";
            });
            conn.on('data', Game.handleData);

             peer.on('call', call => {
                call.answer();
                call.on('stream', s => {
                    const a = new Audio();
                    a.srcObject = s;
                    a.play();
                });
            });
        });
    },

    start: () => {
        if(Game.conn) Game.conn.send({type: 'START'});
        document.getElementById('lobby-modal').classList.add('hidden');
        Game.ready = true;
    },

    handleData: (d) => {
        if(d.type === 'JOIN') {
            document.getElementById('p2-name').innerText = d.name;
            document.getElementById('btn-start').classList.remove('hidden');
        } else if (d.type === 'INFO') {
            // Client joined lobby logic handled visually by just starting?
            // Simplified: Client waits for START
        } else if (d.type === 'START') {
            document.getElementById('loading-screen').classList.add('hidden');
            Game.ready = true;
        } else if (d.type === 'MOVE') {
            // Update other player mesh
            Game.otherPlayer.mesh.position.copy(d.pos);
            Game.otherPlayer.mesh.rotation.copy(d.rot);
        } else if (d.type === 'FX') {
            // Flashlight sync? We might need visual for other player flashlight
        }
    }
};

window.onload = Game.init;

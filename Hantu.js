
class HantuAI {
    constructor(scene) {
        this.scene = scene;
        this.state = 'sleeping'; // sleeping, stalking, aggressive
        this.anger = 0;
        this.pos = new THREE.Vector3(0, -10, 0); // Hide initially

        // Visual
        const geo = new THREE.CapsuleGeometry(0.5, 1.8, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
        this.mesh = new THREE.Mesh(geo, mat);
        scene.add(this.mesh);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.eyes = [new THREE.Mesh(eyeGeo, eyeMat), new THREE.Mesh(eyeGeo, eyeMat)];
        this.eyes[0].position.set(-0.15, 0.6, 0.4);
        this.eyes[1].position.set(0.15, 0.6, 0.4);
        this.mesh.add(this.eyes[0]);
        this.mesh.add(this.eyes[1]);

        this.mesh.visible = false;
    }

    update(dt, playerPos, fearLevel) {
        // Simple State Machine
        if (this.state === 'sleeping') {
            if (fearLevel > 20) this.state = 'stalking';
        } else if (this.state === 'stalking') {
            this.mesh.visible = Math.random() > 0.95; // Flicker
            // Teleport behind player occasionally
            if(Math.random() < 0.01) {
                const offset = new THREE.Vector3(0, 0, -5).applyAxisAngle(new THREE.Vector3(0,1,0), Math.random()*6);
                this.mesh.position.copy(playerPos).add(offset);
                this.mesh.lookAt(playerPos);
            }
            if (fearLevel > 80) this.state = 'aggressive';
        } else if (this.state === 'aggressive') {
            this.mesh.visible = true;
            // Move towards player
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(dt * 3)); // Speed 3m/s
            this.mesh.lookAt(playerPos);
        }
    }
}


const MapGen = {
    init: (scene) => {
        // Materials
        const texLoader = new THREE.TextureLoader();
        // Use placeholder colors/procedural textures if assets not available
        const matWall = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9,
            bumpScale: 0.2
        });
        const matFloor = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
        const matCeiling = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

        const group = new THREE.Group();

        // 1. BASEMENT (Level 0)
        // Simple corridor and room layout
        MapGen.createRoom(group, 0, 0, 0, 10, 5, 10, matWall, matFloor); // Main
        MapGen.createRoom(group, 10, 0, -2, 4, 3, 6, matWall, matFloor); // Side pipe room

        // 2. FLOOR 1 (Level 1)
        // Living room, Kitchen
        MapGen.createRoom(group, 0, 5, 0, 15, 5, 15, matWall, matFloor);

        scene.add(group);
        return { mesh: group, colliders: [] }; // Return collider list for physics
    },

    createRoom: (group, x, y, z, w, h, d, matWall, matFloor) => {
        // Floor
        const floorGeo = new THREE.BoxGeometry(w, 0.2, d);
        const floor = new THREE.Mesh(floorGeo, matFloor);
        floor.position.set(x, y, z);
        floor.receiveShadow = true;
        group.add(floor);

        // Ceiling
        const ceilGeo = new THREE.BoxGeometry(w, 0.2, d);
        const ceil = new THREE.Mesh(ceilGeo, matWall);
        ceil.position.set(x, y+h, z);
        group.add(ceil);

        // Walls (Back, Front, Left, Right)
        const wallThick = 0.2;
        const walls = [
            { pos: [x, y+h/2, z-d/2], dim: [w, h, wallThick] }, // Back
            { pos: [x, y+h/2, z+d/2], dim: [w, h, wallThick] }, // Front
            { pos: [x-w/2, y+h/2, z], dim: [wallThick, h, d] }, // Left
            { pos: [x+w/2, y+h/2, z], dim: [wallThick, h, d] }  // Right
        ];

        walls.forEach(wDef => {
            const g = new THREE.BoxGeometry(...wDef.dim);
            const m = new THREE.Mesh(g, matWall);
            m.position.set(...wDef.pos);
            m.castShadow = true;
            m.receiveShadow = true;
            group.add(m);
        });
    }
};

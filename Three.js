
/*
   Three.js Helper Module
   Sets up standard "Horror" visual pipeline
*/
const ThreeHelper = {
    setupRTX: (renderer, scene, camera) => {
        // In a real prod env, we'd use EffectComposer here.
        // For this drop-in, we simulate RTX with Fog and Lighting.

        // 1. Volumetric-ish Fog
        scene.fog = new THREE.FogExp2(0x050505, 0.1);

        // 2. Shadows
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1.0;

        // 3. Lighting
        const hemiLight = new THREE.HemisphereLight(0x111111, 0x000000, 0.2); // Dark ambient
        scene.add(hemiLight);

        // Flashlight (attached to camera later) is the main source
    }
};

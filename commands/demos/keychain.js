// commands/demos/keychain.js

export const KEYCHAIN_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing a simple keychain tag." },

    // 1. Tag Body (Rounded Rectangle style)
    // We'll make a composite shape: Box + Cylinder at end
    { cmd: '/parametric box 4 0.5 2', delay: 1500, narration: "Creating the main tag body." },
    { cmd: '/move 1 0 0', delay: 500 }, // Shift to make room for round end
    { cmd: '/tag_last BodyRect', delay: 500 },

    // Round End
    { cmd: '/parametric cylinder 1 1 0.5', delay: 1000 },
    { cmd: '/move -1 0 0', delay: 500 }, // Center at -1
    { cmd: '/tag_last RoundEnd', delay: 500 },

    // Union
    { cmd: '/union @BodyRect @RoundEnd', delay: 2000, narration: "Fusing the shapes." },
    { cmd: '/tag_last TagBase', delay: 500 },

    // 2. Keyring Hole
    { cmd: '/parametric cylinder 0.3 0.3 1', delay: 1000, narration: "Drilling the hole for the ring." },
    { cmd: '/move -1 0 0', delay: 500 },
    { cmd: '/subtract @TagBase @Cylinder_0.3x0.3x1', delay: 2500 },
    { cmd: '/tag_last FinalTag', delay: 500 },

    // 3. The Ring
    { cmd: '/parametric torus 0.8 0.1', delay: 1500, narration: "Adding the metal split ring." },
    // Torus lies on XZ (flat). Rotate to hang if needed, but flat is fine for printing view.
    { cmd: '/move -1 0 0', delay: 1000 },
    { cmd: '/setprop @Torus_0.8x0.1 material steel', delay: 500 },

    // 4. Annotation (Simulating Text Engraving)
    { cmd: '/annotate @FinalTag MY_KEYS', delay: 1000, narration: "Adding a label." },
    
    { cmd: '/setprop @FinalTag color yellow', delay: 500 },
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/view fit', delay: 1000, narration: "Keychain ready." }
];
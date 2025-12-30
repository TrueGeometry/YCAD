// commands/demos/mixing_bowl_seal.js

export const MIXING_BOWL_SEAL_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a flexible silicone mixing bowl seal." },

    // 1. Main Flexible Sheet
    { cmd: '/parametric cylinder 8 8 0.1', delay: 2000, narration: "Creating the main flexible cover." },
    { cmd: '/tag_last Sheet', delay: 500 },

    // 2. Outer Grip Rim
    { cmd: '/parametric torus 8 0.4', delay: 1500, narration: "Adding a reinforced outer rim." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Lay flat
    { cmd: '/tag_last Rim', delay: 500 },

    // 3. Inner Seal Ring (to grip the bowl edge)
    { cmd: '/parametric torus 7.5 0.3', delay: 1500, narration: "Adding an inner sealing ring." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 0 -0.2 0', delay: 1000, narration: "Offsetting downwards to grip inside the bowl." },
    { cmd: '/tag_last SealRing', delay: 500 },

    // 4. Lift Tabs (for easy removal)
    { cmd: '/parametric box 2 0.2 2', delay: 1000, narration: "Adding lift tabs." },
    { cmd: '/move 8.5 0 0', delay: 1000 },
    { cmd: '/tag_last Tab1', delay: 500 },

    { cmd: '/parametric box 2 0.2 2', delay: 1000 },
    { cmd: '/move -8.5 0 0', delay: 1000 },
    { cmd: '/tag_last Tab2', delay: 500 },

    // 5. Union All
    { cmd: '/union @Sheet @Rim @SealRing @Tab1 @Tab2', delay: 3000, narration: "Fusing into a single silicone part." },
    { cmd: '/tag_last BowlLid', delay: 500 },

    // 6. Styling
    { cmd: '/setprop @BowlLid material silicone_transparent', delay: 500 },
    { cmd: '/setprop @BowlLid color cyan', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "A perfect airtight seal." }
];
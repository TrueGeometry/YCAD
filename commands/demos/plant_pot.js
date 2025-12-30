// commands/demos/plant_pot.js

export const PLANT_POT_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a modern plant pot." },

    // 1. Pot Body (Tapered)
    // Top R=5, Bottom R=3.5, Height 8
    { cmd: '/parametric cylinder 5 3.5 8', delay: 2000, narration: "Creating the tapered pot body." },
    { cmd: '/tag_last PotSolid', delay: 500 },

    // 2. Hollow Tool
    // Top R=4.5, Bottom R=3, Height 9 (Cut through top)
    { cmd: '/parametric cylinder 4.5 3 9', delay: 1500, narration: "Creating the inner volume tool." },
    { cmd: '/move 0 1 0', delay: 1000, narration: "Positioning to leave a thick base." },
    { cmd: '/tag_last PotHollow', delay: 500 },

    // 3. Subtract
    { cmd: '/subtract @PotSolid @PotHollow', delay: 2500, narration: "Hollowing out the pot." },
    { cmd: '/tag_last PotFinal', delay: 500 },

    // 4. Saucer
    { cmd: '/parametric cylinder 4.5 4 1', delay: 1500, narration: "Adding a drainage saucer." },
    // Pot H=8 (Y -4 to 4). Move saucer to be just below -4.
    // Saucer H=1 (Y -0.5 to 0.5). Move to -4.5.
    { cmd: '/move 0 -4.5 0', delay: 1000 },
    { cmd: '/tag_last SaucerBase', delay: 500 },

    // 5. Hollow Saucer
    { cmd: '/parametric cylinder 4 3.5 1', delay: 1000 },
    { cmd: '/move 0 -4.2 0', delay: 1000 }, // Slightly higher than base center
    { cmd: '/subtract @SaucerBase @Cylinder_4x3.5x1', delay: 2000 },
    { cmd: '/tag_last Saucer', delay: 500 },

    // 6. Finishing
    { cmd: '/setprop @PotFinal material terracotta', delay: 500 },
    { cmd: '/setprop @Saucer material terracotta', delay: 500 },
    
    { cmd: '/view fit', delay: 1000, narration: "Ready for planting." }
];
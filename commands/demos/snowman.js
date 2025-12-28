// commands/demos/snowman.js
export const SNOWMAN_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's build a snowman!" },

    // Bottom
    { cmd: '/parametric sphere 4', delay: 1500, narration: "The base snowball." },
    { cmd: '/move 0 4 0', delay: 1000 },

    // Middle
    { cmd: '/parametric sphere 3', delay: 1500, narration: "The middle section." },
    { cmd: '/move 0 10 0', delay: 1000 },

    // Head
    { cmd: '/parametric sphere 2', delay: 1500, narration: "And the head." },
    { cmd: '/move 0 14.5 0', delay: 1000 },

    // Eyes (simple pattern?) No, manual placement for simplicity
    { cmd: '/parametric sphere 0.3', delay: 1000 },
    { cmd: '/move 1 15 1.5', delay: 500 },
    { cmd: '/setprop @Sphere_0.3 material coal', delay: 500 }, // Simulated prop

    { cmd: '/parametric sphere 0.3', delay: 1000 },
    { cmd: '/move -1 15 1.5', delay: 500 },

    // Nose
    { cmd: '/parametric cone 0.5 2', delay: 1500, narration: "A carrot nose." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 0 14.5 2.5', delay: 1000 },

    // Hat
    { cmd: '/parametric cylinder 2.5 2.5 0.5', delay: 1000, narration: "The hat brim." },
    { cmd: '/move 0 16.2 0', delay: 500 },
    
    { cmd: '/parametric cylinder 1.5 1.5 3', delay: 1000, narration: "The top hat." },
    { cmd: '/move 0 17.5 0', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "Happy Holidays!" }
];
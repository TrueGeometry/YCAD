// commands/demos/bridge.js
export const BRIDGE_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's build a bridge spanning across a river." },

    // 1. The River
    { cmd: '/parametric box 10 1 30', delay: 1500, narration: "First, the water below." },
    { cmd: '/setprop @Box_10x1x30 material water', delay: 500 },
    { cmd: '/move 0 -2 0', delay: 1000 },

    // 2. Pillars
    { cmd: '/parametric cylinder 1 1 8', delay: 1500, narration: "Create a concrete support pillar." },
    { cmd: '/move -3 0 -10', delay: 1000, narration: "Position the first pillar." },

    // 3. Pattern Pillars
    // Rect pattern: Cols (X), Rows (Z)
    // We want 2 columns (width of bridge) and 3 rows (length of bridge)
    { cmd: '/pattern rect 2 3 6 10', delay: 3000, narration: "Pattern the pillars to support the full length." },
    
    // 4. The Road Deck
    { cmd: '/parametric box 8 0.5 32', delay: 2000, narration: "Lay down the road deck." },
    { cmd: '/move 0 4 0', delay: 1000, narration: "Place it on top of the pillars." },
    { cmd: '/setprop @Box_8x0.5x32 material concrete', delay: 500 },

    // 5. Side Rails (Guard rails)
    { cmd: '/parametric box 0.5 1 32', delay: 1500, narration: "Add a safety barrier on the left." },
    { cmd: '/move -3.5 4.75 0', delay: 1000 },
    
    { cmd: '/parametric box 0.5 1 32', delay: 1500, narration: "And one on the right." },
    { cmd: '/move 3.5 4.75 0', delay: 1000 },

    { cmd: '/view fit', delay: 1000, narration: "The bridge is open for traffic." }
];
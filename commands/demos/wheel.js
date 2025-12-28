// commands/demos/wheel.js
export const WHEEL_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Let's construct a wagon wheel. We'll build it lying flat." },

    // Hub
    { cmd: '/parametric cylinder 1.5 1.5 2', delay: 2000, narration: "Start with the central hub." },
    // Cylinder is Y-up, centered at 0,0,0 (height 2 means y goes -1 to 1). Perfect.

    // Rim
    { cmd: '/parametric torus 6 0.5', delay: 2000, narration: "Add the outer rim using a torus." },
    { cmd: '/rotate 90 0 0', delay: 1000, narration: "Lay the torus flat." },

    // Spoke
    { cmd: '/parametric cylinder 0.3 0.3 4.5', delay: 2000, narration: "Create a single spoke." },
    { cmd: '/rotate 0 0 90', delay: 1000, narration: "Rotate it to point outwards." },
    { cmd: '/move 3 0 0', delay: 1000, narration: "Position it between hub and rim." },

    // Pattern
    { cmd: '/pattern circ 8 360 y', delay: 3000, narration: "Create 8 spokes using a circular pattern around the Y axis." },

    { cmd: '/view iso', delay: 1000 },
    { cmd: '/view fit', delay: 1000, narration: "A perfect wheel." }
];
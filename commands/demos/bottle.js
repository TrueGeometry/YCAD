// commands/demos/bottle.js

// Profile for a bottle with wall thickness
// Drawn on XY plane, Center Axis at X=0
const BOTTLE_PROFILE = JSON.stringify([
    {"type":"line","x":0,"y":0},       // Start at center bottom
    {"type":"line","x":4,"y":0},       // Base Radius
    {"type":"line","x":4,"y":6},       // Body vertical
    {"type":"line","x":1.5,"y":10},    // Shoulder taper
    {"type":"line","x":1.5,"y":13},    // Neck vertical
    {"type":"line","x":2.0,"y":13},    // Lip Out
    {"type":"line","x":2.0,"y":13.5},  // Lip Up
    {"type":"line","x":1.0,"y":13.5},  // Lip Inner Top
    {"type":"line","x":1.0,"y":10},    // Neck Inner
    {"type":"line","x":3.5,"y":6},     // Shoulder Inner
    {"type":"line","x":3.5,"y":0.5},   // Body Inner
    {"type":"line","x":0,"y":0.5},     // Bottom Inner
    {"type":"line","x":0,"y":0}        // Close Loop
]);

export const BOTTLE_DEMO = [
    { cmd: '/view front', delay: 1000, narration: "Let's design a glass bottle using the Revolve command." },
    
    // 1. Sketch Profile & Axis
    { cmd: '/sketch_on XY', delay: 1500, narration: "Drawing the cross-section profile." },
    { cmd: `/sketch_draw composite ${BOTTLE_PROFILE}`, delay: 2000 },
    { cmd: '/tag_last Profile', delay: 500 },
    
    { cmd: '/sketch_draw line 0 -2 0 15', delay: 1000, narration: "Drawing the central axis of revolution." },
    { cmd: '/tag_last Axis', delay: 500 },
    { cmd: '/sketch_off', delay: 1000 },

    // 2. Revolve
    { cmd: '/revolve @Profile @Axis 360', delay: 3000, narration: "Revolving the profile 360 degrees to create the solid." },
    { cmd: '/tag_last MyBottle', delay: 500 },

    // 3. Styling
    { cmd: '/setprop @MyBottle material glass', delay: 500 },
    { cmd: '/setprop @MyBottle color #a5f3fc', delay: 500 }, // Light Cyan
    { cmd: '/setprop @MyBottle opacity 0.6', delay: 500 },
    
    { cmd: '/view iso', delay: 1500, narration: "A nice parametric bottle." },
    { cmd: '/rotate 0 360 0', delay: 2000 }, // Spin view
    { cmd: '/view fit', delay: 1000 }
];
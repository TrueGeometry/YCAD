// commands/demos/house.js
export const HOUSE_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "We will build a small house using Boolean operations." },
    
    // 1. Main Body
    { cmd: '/parametric box 10 8 10', delay: 2000, narration: "Create the main building block." },
    { cmd: '/move 0 4 0', delay: 1000 },

    // 2. Roof (Cone 4 sides = Pyramid)
    // Cone: radius, height, radialSegments
    { cmd: '/parametric cone 8 4', delay: 500 }, // Note: Standard cone is round, we'll stick to round roof or rotate a box for precision if we had it. Let's use a cone for a hut style.
    { cmd: '/move 0 10 0', delay: 1000, narration: "Add a roof structure." },
    { cmd: '/setprop @Cone_8x4 name Roof', delay: 500 },

    // 3. Door Cutout
    { cmd: '/parametric box 3 5 5', delay: 1500, narration: "Create a shape to cut out the door." },
    { cmd: '/move 0 2.5 4', delay: 1500, narration: "Position the cutter at the front." },
    
    // 4. Boolean
    { cmd: '/subtract @Box_10x8x10 @Box_3x5x5', delay: 3000, narration: "Subtract the door shape from the main body." },
    
    // 5. Chimney
    { cmd: '/parametric cylinder 1 1 4', delay: 1500, narration: "Add a chimney." },
    { cmd: '/move 3 10 -2', delay: 1500 },
    
    { cmd: '/view fit', delay: 1000, narration: "The house structure is ready." }
];
// commands/demos/ship.js
export const SHIP_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's assemble a cargo ship." },

    // 1. Hull
    { cmd: '/parametric box 6 3 20', delay: 2000, narration: "Create the main hull." },
    { cmd: '/move 0 1.5 0', delay: 1000 },
    { cmd: '/setprop @Box_6x3x20 material steel', delay: 500 },

    // 2. Bridge Tower (Stern)
    { cmd: '/parametric box 6 5 4', delay: 1500, narration: "Add the captain's bridge at the stern." },
    { cmd: '/move 0 5.5 -7', delay: 1000 },

    // 3. Funnel/Smokestack
    { cmd: '/parametric cylinder 1 1 4', delay: 1500, narration: "Add the engine funnel." },
    { cmd: '/move 0 9 -5', delay: 1000 },
    { cmd: '/setprop @Cylinder_1x1x4 color red', delay: 500 },

    // 4. Cargo Containers
    { cmd: '/parametric box 1.5 1.5 3', delay: 1500, narration: "Create a cargo container." },
    { cmd: '/move -1.5 3.75 0', delay: 1000, narration: "Place the first container on deck." },
    { cmd: '/setprop @Box_1.5x1.5x3 color blue', delay: 500 },

    // Pattern the containers
    // 2 columns (X), 3 rows (Z)
    { cmd: '/pattern rect 2 3 3 4', delay: 3000, narration: "Load the ship with more containers." },

    // 5. Water level check
    { cmd: '/parametric plane 40 40', delay: 1500, narration: "Visualize the water line." },
    { cmd: '/rotate -90 0 0', delay: 500 }, // Plane defaults to XY vertical, rotate flat
    { cmd: '/move 0 1 0', delay: 1000 },
    
    { cmd: '/view fit', delay: 1000, narration: "The ship is ready to set sail." }
];
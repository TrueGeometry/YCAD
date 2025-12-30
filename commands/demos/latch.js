// commands/demos/latch.js

export const LATCH_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Building a sliding bolt latch mechanism." },

    // 1. Base Plate
    { cmd: '/parametric box 10 4 0.5', delay: 1500, narration: "The main latch body plate." },
    { cmd: '/move 0 0 0', delay: 500 },
    { cmd: '/tag_last Base', delay: 500 },

    // 2. Bolt (Horizontal Cylinder)
    { cmd: '/parametric cylinder 0.6 0.6 8', delay: 1500, narration: "The sliding bolt." },
    { cmd: '/rotate 0 0 90', delay: 1000 },
    { cmd: '/move 0 0 1.5', delay: 1000, narration: "Sitting above the plate." },
    { cmd: '/tag_last Bolt', delay: 500 },

    // 3. Keepers (Loops holding the bolt)
    // Make one Keeper block
    { cmd: '/parametric box 2 2 2', delay: 1500, narration: "Creating a keeper block." },
    { cmd: '/tag_last KeeperBlock', delay: 500 },
    
    // Make hole cutter
    { cmd: '/parametric cylinder 0.7 0.7 3', delay: 1000 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/tag_last KeeperHole', delay: 500 },
    
    // Cut Hole
    { cmd: '/subtract @KeeperBlock @KeeperHole', delay: 2500 },
    { cmd: '/tag_last Keeper1', delay: 500 },
    
    // Position Keeper 1
    { cmd: '/move -3 0 1', delay: 1000 },
    
    // Duplicate for Keeper 2
    // We can't clone simply via script without Pattern or manual create. Let's make another.
    { cmd: '/parametric box 2 2 2', delay: 1000, narration: "Adding second keeper." },
    { cmd: '/parametric cylinder 0.7 0.7 3', delay: 500 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/subtract @Box_2x2x2 @Cylinder_0.7x0.7x3', delay: 2000 },
    { cmd: '/move 2 0 1', delay: 1000 },
    
    // 4. Handle on Bolt
    { cmd: '/parametric cylinder 0.4 0.4 1.5', delay: 1500, narration: "Adding the handle knob." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Pointing up (Z is up? No Y is up in default geo, rotated cylinder is X aligned)
    // Bolt is along X. Handle should point Up (Y) or Out (Z).
    // Let's make it point Y (Up from table). Cylinder default is Y up.
    // Bolt is at Z=1.5. Handle needs to sit on Bolt.
    { cmd: '/move -1 0 1.5', delay: 1000 }, 
    { cmd: '/tag_last HandleStem', delay: 500 },
    
    { cmd: '/parametric sphere 0.6', delay: 500 },
    { cmd: '/move -1 0.75 1.5', delay: 1000 }, // Top of stem
    { cmd: '/tag_last HandleKnob', delay: 500 },

    // 5. Catch Plate (Separate part)
    { cmd: '/parametric box 3 4 0.5', delay: 1500, narration: "The separate catch plate." },
    { cmd: '/move 7 0 0', delay: 1000 },
    
    // Catch Loop
    { cmd: '/parametric box 2 2 2', delay: 1000 },
    { cmd: '/parametric cylinder 0.7 0.7 3', delay: 500 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/subtract @Box_2x2x2 @Cylinder_0.7x0.7x3', delay: 2000 },
    { cmd: '/move 7 0 1', delay: 1000 },

    // 6. Animation (Slide)
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/union @Bolt @HandleStem @HandleKnob', delay: 2000, narration: "Grouping the bolt assembly." },
    { cmd: '/tag_last BoltAssembly', delay: 500 },
    
    { cmd: '/move 2 0 0', delay: 500, narration: "Testing slide..." },
    { cmd: '/move -2 0 0', delay: 500 },
    
    { cmd: '/view fit', delay: 1000, narration: "Secure latch design." }
];
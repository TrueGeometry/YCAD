// commands/demos/storage_bin.js

export const STORAGE_BIN_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing a custom grid organizer bin." },

    // 1. Base Block
    { cmd: '/parametric box 22 5 22', delay: 2000, narration: "Starting with the main solid block (22x22 units)." },
    { cmd: '/tag_last BinBase', delay: 500 },

    // 2. Create Single Compartment Cutter
    // Size 9x9 leaves (22 - 9 - 9 = 4) / 3 = 1.33 walls.
    // Let's use 11 spacing. Center -5.5 to 5.5 is 11 distance.
    { cmd: '/parametric box 9 6 9', delay: 1500, narration: "Creating the negative shape for one compartment." },
    { cmd: '/tag_last Cutter', delay: 500 },
    
    // 3. Position Cutter (Top Left)
    { cmd: '/move -5.5 1 -5.5', delay: 1500, narration: "Positioning the cutter in the first quadrant." },

    // 4. Pattern Grid (2x2)
    // dx = 11, dz = 11
    { cmd: '/pattern rect 2 2 11 11', delay: 3000, narration: "Patterning the cutter to create a 2x2 grid." },
    
    // 5. Subtract All
    { cmd: '/subtract @BinBase @Cutter @Cutter_1_0 @Cutter_0_1 @Cutter_1_1', delay: 4000, narration: "Subtracting the compartments from the base." },
    { cmd: '/tag_last FinalBin', delay: 500 },

    // 6. Styling
    { cmd: '/setprop @FinalBin material heavy_duty_plastic', delay: 500 },
    { cmd: '/setprop @FinalBin color orange', delay: 500 }, // Simulated property
    
    { cmd: '/view iso', delay: 1500, narration: "The organizer bin is ready for screws or beads." },
    { cmd: '/view fit', delay: 1000 }
];
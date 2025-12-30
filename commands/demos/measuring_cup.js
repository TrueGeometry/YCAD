// commands/demos/measuring_cup.js

export const MEASURING_CUP_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a standard measuring cup." },

    // 1. Cup Body (Tapered Cylinder)
    // Top Radius 4, Bottom 3.5, Height 6
    { cmd: '/parametric cylinder 4 3.5 6', delay: 2000, narration: "Creating the main tapered body." },
    { cmd: '/tag_last CupSolid', delay: 500 },

    // 2. Hollow Tool
    // Slightly taller to cut the top open cleanly
    { cmd: '/parametric cylinder 3.6 3.1 8', delay: 1000 },
    { cmd: '/move 0 1.5 0', delay: 1000, narration: "Positioning the cutter to leave a solid base." },
    { cmd: '/tag_last CupHollow', delay: 500 },

    // 3. Spout (A small rotated cylinder to cut a lip)
    { cmd: '/parametric cylinder 0.5 0.5 6', delay: 1000 },
    { cmd: '/rotate 45 0 0', delay: 500 },
    { cmd: '/move 0 6 4', delay: 1000, narration: "Adding a spout cutter at the rim." },
    { cmd: '/tag_last SpoutCutter', delay: 500 },

    // 4. Subtract Body - Hollow - Spout
    { cmd: '/subtract @CupSolid @CupHollow @SpoutCutter', delay: 3000, narration: "Hollowing out the cup and forming the spout." },
    { cmd: '/tag_last CupBody', delay: 500 },

    // 5. Handle
    { cmd: '/parametric torus 2.5 0.4', delay: 1000, narration: "Adding a handle ring." },
    { cmd: '/rotate 0 0 90', delay: 500 }, // Stand vertical
    { cmd: '/move 0 3 -3.5', delay: 1000 }, // Position opposite spout
    { cmd: '/tag_last Handle', delay: 500 },

    // 6. Union
    { cmd: '/union @CupBody @Handle', delay: 2000, narration: "Fusing the handle to the cup." },
    
    // 7. Styling
    { cmd: '/setprop @union_CupBody_Handle material plastic_clear', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Measuring cup ready." }
];
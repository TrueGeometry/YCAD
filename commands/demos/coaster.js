// commands/demos/coaster.js

export const COASTER_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Creating a geometric coaster." },

    // 1. Main Disc
    { cmd: '/parametric cylinder 5 5 0.4', delay: 1500, narration: "Starting with the cork disk." },
    { cmd: '/tag_last CoasterBase', delay: 500 },

    // 2. Pattern Cutter (Holes)
    { cmd: '/parametric cylinder 0.5 0.5 1', delay: 1000 },
    { cmd: '/move 3 0 0', delay: 500 }, // Offset from center
    { cmd: '/tag_last Hole', delay: 500 },

    // 3. Pattern
    { cmd: '/pattern circ 8 360 y', delay: 2500, narration: "Creating a radial decorative pattern." },
    
    // 4. Raised Rim
    { cmd: '/parametric torus 5 0.3', delay: 1500, narration: "Adding a raised rim to catch drips." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Lie flat
    { cmd: '/tag_last Rim', delay: 500 },

    // 5. Subtract Holes from Base
    { cmd: '/subtract @CoasterBase @Hole @Hole_c1 @Hole_c2 @Hole_c3 @Hole_c4 @Hole_c5 @Hole_c6 @Hole_c7', delay: 4000, narration: "Perforating the base." },
    { cmd: '/tag_last BasePerforated', delay: 500 },

    // 6. Union Rim to Base
    { cmd: '/union @BasePerforated @Rim', delay: 2000, narration: "Final assembly." },
    
    { cmd: '/setprop @union_BasePerforated_Rim material cork', delay: 500 },
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/view fit', delay: 1000 }
];
// commands/demos/mounting_plate_sketch.js

export const MOUNTING_PLATE_SKETCH_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing the mounting plate using 2D Sketch Booleans." },

    // 1. Initialize Sketch Plane
    { cmd: '/sketch_on XY', delay: 1000 },

    // 2. Base Shapes
    // Top Circle (R96)
    { cmd: '/sketch_draw circle 96', delay: 1000 },
    { cmd: '/tag_last S_Top', delay: 200 },

    // Bottom Circle (R54) at Y=-80
    { cmd: '/sketch_draw circle 54', delay: 1000 },
    { cmd: '/move 0 -80 0', delay: 500 },
    { cmd: '/tag_last S_Bot', delay: 200 },

    // Neck Rect (160x100) at Y=-40
    { cmd: '/sketch_draw rect 160 100', delay: 1000 },
    { cmd: '/move 0 -40 0', delay: 500 },
    { cmd: '/tag_last S_Neck', delay: 200 },

    // 3. Merge Base Shapes (Union)
    { cmd: '/sketch_union @S_Top @S_Bot', delay: 1500, narration: "Merging profiles into one." },
    { cmd: '/sketch_union @S_Top @S_Neck', delay: 1500 },

    // 4. Waist Cuts (Subtract)
    // Right Cut (R20 at 73.34, -90)
    { cmd: '/sketch_draw circle 20', delay: 500 },
    { cmd: '/move 73.34 -90 0', delay: 500 },
    { cmd: '/tag_last S_CutR', delay: 200 },
    { cmd: '/sketch_subtract @S_Top @S_CutR', delay: 1500, narration: "Trimming the neck." },

    // Left Cut (R20 at -73.34, -90)
    { cmd: '/sketch_draw circle 20', delay: 500 },
    { cmd: '/move -73.34 -90 0', delay: 500 },
    { cmd: '/tag_last S_CutL', delay: 200 },
    { cmd: '/sketch_subtract @S_Top @S_CutL', delay: 1500 },

    // 5. Holes (Subtract)
    // Top Hole (R15 at 0, 64)
    { cmd: '/sketch_draw circle 15', delay: 500 }, { cmd: '/move 0 64 0', delay: 200 }, { cmd: '/tag_last H_Top', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @H_Top', delay: 1000, narration: "Adding mounting holes." },

    // Right Hole (R15 at 55.42, 32)
    { cmd: '/sketch_draw circle 15', delay: 500 }, { cmd: '/move 55.42 32 0', delay: 200 }, { cmd: '/tag_last H_Right', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @H_Right', delay: 1000 },

    // Left Hole (R15 at -55.42, 32)
    { cmd: '/sketch_draw circle 15', delay: 500 }, { cmd: '/move -55.42 32 0', delay: 200 }, { cmd: '/tag_last H_Left', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @H_Left', delay: 1000 },

    // Center Bore (R25)
    { cmd: '/sketch_draw circle 25', delay: 500 }, { cmd: '/tag_last H_Center', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @H_Center', delay: 1000 },

    // Bottom Bore (R20 at 0, -80)
    { cmd: '/sketch_draw circle 20', delay: 500 }, { cmd: '/move 0 -80 0', delay: 200 }, { cmd: '/tag_last H_Bot', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @H_Bot', delay: 1000 },

    // Bottom Slots (R9 at +/- 25, -90)
    { cmd: '/sketch_draw circle 9', delay: 500 }, { cmd: '/move 25 -90 0', delay: 200 }, { cmd: '/tag_last Slot1', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @Slot1', delay: 1000 },

    { cmd: '/sketch_draw circle 9', delay: 500 }, { cmd: '/move -25 -90 0', delay: 200 }, { cmd: '/tag_last Slot2', delay: 100 },
    { cmd: '/sketch_subtract @S_Top @Slot2', delay: 1000 },

    // 6. Extrude
    { cmd: '/sketch_off', delay: 1000 },
    { cmd: '/view iso', delay: 1500 },
    { cmd: '/extrude @S_Top 20', delay: 4000, narration: "Extruding the complete profile." },
    
    { cmd: '/setprop @Extrude_S_Top material steel', delay: 500 },
    { cmd: '/view fit', delay: 1000 }
];
// commands/demos/variable_duct.js

export const VARIABLE_DUCT_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Creating a variable section sweep duct." },

    // 1. Path (90 deg bend on XY plane)
    // x = 12(1-cos(t)), y = 12sin(t)
    // Starts vertical (0,0) tangent up. Ends horizontal (12,12) tangent right.
    { cmd: '/sketch_on XY', delay: 1500, narration: "Sketching the guide path." },
    { cmd: '/sketch_draw equation 12*(1-cos(t)) 12*sin(t) 0 1.57', delay: 2000 },
    { cmd: '/tag_last Path', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 2. Start Profile (XZ Plane)
    // Small Rounded Rect 6x4, radius 1
    { cmd: '/sketch_on XZ', delay: 1500, narration: "Creating the start profile." },
    { cmd: '/sketch_draw rounded_rect 6 4 1', delay: 1500 },
    { cmd: '/tag_last StartProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 3. End Profile (YZ Plane, moved to end)
    // Large Rounded Rect 10x8, radius 2
    // We create a Workplane at X=12 first to sketch on YZ offset
    { cmd: '/workplane offset YZ 12', delay: 1000, narration: "Creating the end profile plane." },
    { cmd: '/sketch_on YZ_Plane_Offset_12', delay: 1500 },
    { cmd: '/sketch_draw rounded_rect 10 8 2', delay: 1500 },
    { cmd: '/tag_last EndProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // Move End Profile to (12, 12, 0)
    // The sketch plane is at World (12, 0, 0).
    // The sketch local coordinates are: Y is Up (World Y), X is Horizontal (World Z).
    // We need to move it UP by 12 units to match the path end at (12, 12, 0).
    // So we set local position to (0, 12, 0).
    { cmd: '/move 0 12 0', delay: 1000, narration: "Positioning end profile." },

    // 4. Sweep
    { cmd: '/sweep_variable @StartProfile @EndProfile @Path solid', delay: 4000, narration: "Generating the variable sweep." },
    { cmd: '/tag_last Duct', delay: 500 },

    // 5. Finish
    { cmd: '/setprop @Duct color silver', delay: 500 },
    { cmd: '/setprop @Duct material aluminum', delay: 500 },
    { cmd: '/view fit', delay: 1000 }
];

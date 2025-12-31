// commands/demos/flanged_elbow.js

export const FLANGED_ELBOW_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a flanged pipe elbow." },

    // 1. Path: 90-degree bend
    { cmd: '/sketch_on XY', delay: 1500, narration: "Defining the 90-degree bend path." },
    // Equation circle segment centered at (0,10) or similar. 
    // Let's use x=10*sin(t), y=10*(1-cos(t)). From t=0 to 1.57 (PI/2).
    { cmd: '/sketch_draw equation 10*sin(t) 10*(1-cos(t)) 0 1.57', delay: 1000 },
    { cmd: '/tag_last Path', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 2. Profile (Outer) - Circle R=3
    { cmd: '/sketch_on YZ', delay: 1500, narration: "Sketching the outer pipe diameter." },
    { cmd: '/sketch_draw circle 3', delay: 1000 },
    { cmd: '/tag_last OuterProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 3. Profile (Inner) - Circle R=2
    { cmd: '/sketch_on YZ', delay: 1500, narration: "Sketching the inner diameter for the hollow core." },
    { cmd: '/sketch_draw circle 2', delay: 1000 },
    { cmd: '/tag_last InnerProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 4. Sweep Outer
    // Added 'solid' so it has caps for boolean union
    { cmd: '/sweep_uniform @OuterProfile @Path solid align:z rot:0', delay: 3000, narration: "Sweeping the main pipe body." },
    { cmd: '/tag_last PipeSolid', delay: 500 },

    // 5. Sweep Inner (Core)
    // Added 'solid' so it acts as a volume to remove
    { cmd: '/sweep_uniform @InnerProfile @Path solid align:z rot:0', delay: 3000, narration: "Sweeping the inner core." },
    { cmd: '/tag_last PipeCore', delay: 500 },

    // 6. Flange 1 (Start - YZ Plane)
    // Cylinder Y-up. Rotate Z -90 to align with X-axis (Normal of YZ plane).
    { cmd: '/parametric cylinder 5 5 1', delay: 1000, narration: "Adding the inlet flange." },
    { cmd: '/rotate 0 0 -90', delay: 500 },
    { cmd: '/move 0 0 0', delay: 500 }, 
    { cmd: '/tag_last Flange1', delay: 500 },

    // 7. Flange 2 (End - XZ Plane)
    // Path ends at (10,10,0) tangent to Y.
    // Cylinder Y-up aligns perfectly.
    { cmd: '/parametric cylinder 5 5 1', delay: 1000, narration: "Adding the outlet flange." },
    { cmd: '/move 10 10 0', delay: 1000 },
    { cmd: '/tag_last Flange2', delay: 500 },

    // 8. Core Extensions (To punch through flanges fully)
    // Start Bore (Horizontal X)
    { cmd: '/parametric cylinder 2 2 3', delay: 500 }, 
    { cmd: '/rotate 0 0 90', delay: 200 },
    { cmd: '/move 0 0 0', delay: 200 },
    { cmd: '/tag_last CoreExt1', delay: 200 },

    // End Bore (Vertical Y)
    { cmd: '/parametric cylinder 2 2 3', delay: 500 },
    { cmd: '/move 10 10 0', delay: 200 },
    { cmd: '/tag_last CoreExt2', delay: 200 },

    // 9. Bolt Holes Flange 1
    { cmd: '/parametric cylinder 0.4 0.4 2', delay: 1000 }, // Cutter
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 0 3.5 0', delay: 500 }, // Offset radius 3.5
    { cmd: '/tag_last BoltCut1', delay: 500 },
    { cmd: '/pattern circ 4 360 x', delay: 2000 }, // Pattern around X axis

    // 10. Bolt Holes Flange 2
    // Need pattern axis at (10,10,0). Create a temporary work axis.
    { cmd: '/workaxis offset Y X 10', delay: 1000, narration: "Creating reference axis for outlet holes." },
    
    { cmd: '/parametric cylinder 0.4 0.4 2', delay: 500 },
    { cmd: '/move 10 10 3.5', delay: 500 }, // Pos relative to flange center
    { cmd: '/tag_last BoltCut2', delay: 500 },
    
    { cmd: '/pattern circ 4 360 Y_Axis_Offset_X10', delay: 2000 },

    // 11. Boolean Operations
    // Union Body + Flanges
    { cmd: '/union @PipeSolid @Flange1 @Flange2', delay: 2000, narration: "Merging flange body." },
    { cmd: '/tag_last MainBody', delay: 500 },
    
    // Subtract Core + Extensions
    { cmd: '/subtract @MainBody @PipeCore @CoreExt1 @CoreExt2', delay: 2000, narration: "Hollowing the pipe." },
    { cmd: '/tag_last HollowPipe', delay: 500 },
    
    // Subtract Bolts
    // Names: BoltCut1, BoltCut1_c1...c3, BoltCut2, BoltCut2_c1...c3
    { cmd: '/subtract @HollowPipe @BoltCut1 @BoltCut1_c1 @BoltCut1_c2 @BoltCut1_c3 @BoltCut2 @BoltCut2_c1 @BoltCut2_c2 @BoltCut2_c3', delay: 4000, narration: "Drilling bolt holes." },
    { cmd: '/tag_last FinalElbow', delay: 500 },

    // 12. Side Boss (Optional Detail)
    { cmd: '/parametric cylinder 1.5 1.5 3', delay: 1000 },
    { cmd: '/rotate 0 0 -45', delay: 500 }, // Align roughly with diagonal
    { cmd: '/move 7 3 0', delay: 1000 }, 
    { cmd: '/union @FinalElbow @Cylinder_1.5x1.5x3', delay: 2000, narration: "Adding a sensor boss." },
    
    { cmd: '/setprop @union_FinalElbow_Cylinder_1.5x1.5x3 material cast_iron', delay: 500 },
    { cmd: '/setprop @union_FinalElbow_Cylinder_1.5x1.5x3 color grey', delay: 500 },

    { cmd: '/view iso', delay: 1500, narration: "Flanged Elbow complete." },
    { cmd: '/view fit', delay: 1000 }
];
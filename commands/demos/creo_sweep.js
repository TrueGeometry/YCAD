// commands/demos/creo_sweep.js

export const CREO_SWEEP_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Recreating a Variable Section Sweep part." },

    // 1. Base Plate
    { cmd: '/parametric box 14 2 10', delay: 1500, narration: "Creating the rectangular base." },
    { cmd: '/move 0 1 0', delay: 500 }, // Sit on floor Y=0, height 2, so center at Y=1
    { cmd: '/tag_last Base', delay: 500 },

    // 2. Bolt Holes
    // Box is 14x10. Holes near corners.
    // Center is 0,0. Corners +/- 7, +/- 5.
    // Holes at +/- 5, +/- 3.5.
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 1000 },
    { cmd: '/move -5 1 -3.5', delay: 500 }, // Start pos for pattern
    { cmd: '/tag_last Drill', delay: 500 },
    
    // Pattern: 2 cols (X), 2 rows (Z). 
    // Spacing: X=10 (-5 to 5), Z=7 (-3.5 to 3.5)
    { cmd: '/pattern rect 2 2 10 7', delay: 2000, narration: "Patterning bolt holes." },
    
    { cmd: '/subtract @Base @Drill @Drill_1_0 @Drill_0_1 @Drill_1_1', delay: 3000 },
    { cmd: '/tag_last BasePlate', delay: 500 },

    // 3. Sweep Path (90 deg bend)
    // Start at top of base (0, 2, 0).
    // Radius 10.
    // x = 10*(1-cos(t)), y = 2 + 10*sin(t)
    { cmd: '/sketch_on XY', delay: 1500, narration: "Sketching the guide curve." },
    { cmd: '/sketch_draw equation 10*(1-cos(t)) 2+(10*sin(t)) 0 1.57', delay: 1500 },
    { cmd: '/tag_last GuidePath', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 4. Start Profile (Rect on Base)
    // Tangent at start (t=0) is Y-axis. Profile plane should be XZ (Normal Y).
    // Position: (0, 2, 0).
    // We create a Work Plane offset to Y=2.
    { cmd: '/workplane offset XZ 2', delay: 1000, narration: "Creating start plane at Y=2." },
    { cmd: '/sketch_on XZ_Plane_Offset_2', delay: 1500, narration: "Sketching the rectangular start profile." },
    { cmd: '/sketch_draw rect 8 6', delay: 1000 },
    { cmd: '/tag_last StartProf', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    // Plane is at Y=2, so Rect is at (0,2,0). Perfect match for start of path.

    // 5. End Profile (Circle at Tip)
    // Tangent at end (t=PI/2) is X-axis. Profile plane should be YZ (Normal X).
    // Position: (10, 12, 0).
    // Create Work Plane offset to X=10.
    { cmd: '/workplane offset YZ 10', delay: 1000, narration: "Creating end plane at X=10." },
    { cmd: '/sketch_on YZ_Plane_Offset_10', delay: 1500, narration: "Sketching the circular end profile." },
    { cmd: '/sketch_draw circle 2.5', delay: 1000 },
    { cmd: '/tag_last EndProf', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    
    // Plane is at X=10. Origin is (10,0,0). We need (10,12,0).
    { cmd: '/move 10 12 0', delay: 1000, narration: "Positioning profile at the tip." },

    // 6. Sweep
    // Transition from Rect to Circle along curve
    // Using 2 profiles -> variable sweep
    { cmd: '/sweep_variable @StartProf @EndProf @GuidePath solid align:z', delay: 4000, narration: "Creating the variable section sweep." },
    { cmd: '/tag_last PipeBody', delay: 500 },

    // 7. Top Flange
    { cmd: '/parametric cylinder 4 4 2', delay: 1500, narration: "Adding the top flange." },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 11 12 0', delay: 1000 }, 
    { cmd: '/tag_last TopFlange', delay: 500 },

    // 8. Union
    { cmd: '/union @BasePlate @PipeBody @TopFlange', delay: 3000, narration: "Merging parts." },
    { cmd: '/tag_last MainBody', delay: 500 },

    // 9. Bore Top
    { cmd: '/parametric cylinder 2 2 5', delay: 1000, narration: "Boring the outlet." },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 11 12 0', delay: 500 },
    { cmd: '/subtract @MainBody @Cylinder_2x2x5', delay: 2000 },

    // 10. Back Rib (Stiffener)
    // Sketch on XY (Center plane)
    { cmd: '/sketch_on XY', delay: 1500, narration: "Adding the support rib." },
    // Triangle points: (0,2) to (4,2) to (0,6).
    { cmd: '/sketch_draw composite [{"type":"line","x":0,"y":2},{"type":"line","x":4,"y":2},{"type":"line","x":0,"y":6},{"type":"line","x":0,"y":2}]', delay: 1000 },
    { cmd: '/tag_last RibSketch', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    
    { cmd: '/extrude @RibSketch 1', delay: 1500 },
    { cmd: '/move 0 0 -0.5', delay: 500 }, // Center Z (Extrusion is 0 to 1, move to -0.5 to center on plane)
    { cmd: '/tag_last Rib', delay: 500 },
    
    { cmd: '/union @subtract_MainBody_Cylinder_2x2x5 @Rib', delay: 2000 },

    { cmd: '/setprop @union_subtract_MainBody_Cylinder_2x2x5_Rib material cast_iron', delay: 500 },
    { cmd: '/setprop @union_subtract_MainBody_Cylinder_2x2x5_Rib color grey', delay: 500 },
    
    { cmd: '/view fit', delay: 1000, narration: "Creo-style sweep complete." }
];

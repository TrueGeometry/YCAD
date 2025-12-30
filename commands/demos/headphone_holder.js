// commands/demos/headphone_holder.js

export const HEADPHONE_HOLDER_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing an under-desk headphone hanger." },

    // 1. Mounting Plate (Top)
    { cmd: '/parametric box 6 0.5 6', delay: 1500, narration: "The mounting plate for adhesive or screws." },
    { cmd: '/move 0 0 0', delay: 500 },
    { cmd: '/tag_last MountPlate', delay: 500 },

    // 2. Vertical Drop
    { cmd: '/parametric box 2 6 1', delay: 1500, narration: "The vertical support arm." },
    { cmd: '/move 0 -3.25 0', delay: 1000 }, // Center at -3 (height 6/2), shifted down slightly to overlap plate
    { cmd: '/tag_last VertArm', delay: 500 },

    // 3. Curved Rest (Cylinder Segment)
    { cmd: '/parametric cylinder 2.5 2.5 4', delay: 1500, narration: "Creating a curved rest for the headband." },
    { cmd: '/rotate 0 0 90', delay: 500 }, // Horizontal along X
    { cmd: '/move 0 -6 0', delay: 1000 },
    { cmd: '/tag_last RestCyl', delay: 500 },

    // 4. End Cap / Stop
    { cmd: '/parametric cylinder 3.5 3.5 0.5', delay: 1500, narration: "Adding a stop to prevent slipping." },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 2  -6 0', delay: 1000 },
    { cmd: '/tag_last EndCap', delay: 500 },

    // 5. Screw Holes in Mount Plate
    { cmd: '/parametric cylinder 0.3 0.3 2', delay: 1000, narration: "Drilling mounting holes." },
    { cmd: '/move 2 0 2', delay: 500 },
    { cmd: '/pattern rect 2 2 4 4', delay: 2000, narration: "Patterning 4 screw holes." },
    // Start pos was (2,0,2). We need (-2,0,-2) to (2,0,2). 
    // Rect pattern adds. Let's delete and start at negative corner.
    { cmd: '/delete @Cylinder_0.3x0.3x2 @Cylinder_0.3x0.3x2_1_0 @Cylinder_0.3x0.3x2_0_1 @Cylinder_0.3x0.3x2_1_1', delay: 500 },
    
    { cmd: '/parametric cylinder 0.3 0.3 2', delay: 500 },
    { cmd: '/move -2 0 -2', delay: 500 },
    { cmd: '/pattern rect 2 2 4 4', delay: 2000 },
    
    // 6. Subtract Holes from Plate
    { cmd: '/subtract @MountPlate @Cylinder_0.3x0.3x2 @Cylinder_0.3x0.3x2_1_0 @Cylinder_0.3x0.3x2_0_1 @Cylinder_0.3x0.3x2_1_1', delay: 3000, narration: "Finishing the mounting plate." },
    { cmd: '/tag_last FinalPlate', delay: 500 },

    // 7. Assembly
    { cmd: '/union @FinalPlate @VertArm @RestCyl @EndCap', delay: 3000, narration: "Fusing all parts together." },
    
    { cmd: '/setprop @union_FinalPlate_VertArm_RestCyl_EndCap material abs_plastic', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Headphone holder complete." }
];
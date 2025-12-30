// commands/demos/knob.js

export const KNOB_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing an industrial knurled knob." },

    // 1. Main Grip Body
    { cmd: '/parametric cylinder 4 4 3', delay: 1500, narration: "Starting with the main grip cylinder." },
    { cmd: '/tag_last KnobBody', delay: 500 },

    // 2. Create the Knurl Cutter (Groove)
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 1500, narration: "Creating a tool to cut the grip grooves." },
    { cmd: '/move 4 0 0', delay: 1000, narration: "Positioning it on the edge." },
    { cmd: '/tag_last Cutter', delay: 500 },

    // 3. Pattern the Cutter
    { cmd: '/pattern circ 12 360 y', delay: 3000, narration: "Patterning 12 cutters around the knob." },
    
    // 4. Boolean Subtract
    // We need to subtract Cutter, Cutter_c1 ... Cutter_c11 from KnobBody
    // Constructing the command string dynamically is hard in static script, so we assume standard naming.
    { cmd: '/subtract @KnobBody @Cutter @Cutter_c1 @Cutter_c2 @Cutter_c3 @Cutter_c4 @Cutter_c5 @Cutter_c6 @Cutter_c7 @Cutter_c8 @Cutter_c9 @Cutter_c10 @Cutter_c11', delay: 5000, narration: "Subtracting the pattern to create ridges." },
    { cmd: '/tag_last KnurledGrip', delay: 500 },

    // 5. Central Hub/Shaft
    { cmd: '/parametric cylinder 2 2 1', delay: 1500, narration: "Adding the top hub." },
    { cmd: '/move 0 2 0', delay: 1000 },
    { cmd: '/tag_last Hub', delay: 500 },
    
    { cmd: '/union @KnurledGrip @Hub', delay: 2000 },
    { cmd: '/tag_last FinalKnob', delay: 500 },

    // 6. Shaft Hole
    { cmd: '/parametric cylinder 0.5 0.5 5', delay: 1500, narration: "Drilling the shaft hole." },
    { cmd: '/subtract @FinalKnob @Cylinder_0.5x0.5x5', delay: 2000 },
    
    { cmd: '/setprop @subtract_FinalKnob_Cylinder_0.5x0.5x5 material plastic_black', delay: 500 },
    { cmd: '/view iso', delay: 1500, narration: "Knob complete." },
    { cmd: '/view fit', delay: 1000 }
];
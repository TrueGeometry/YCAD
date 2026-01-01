// commands/demos/sensor.js

export const SENSOR_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a wireless IoT Sensor Node." },

    // --- 1. Red Bottom Cap ---
    { cmd: '/sketch_on XZ', delay: 1500, narration: "Starting with the base footprint on the ground." },
    // Width 50, Depth 18, Radius 6
    { cmd: '/sketch_draw rounded_rect 50 18 6', delay: 1500 },
    { cmd: '/sketch_off', delay: 500 },

    { cmd: '/extrude @SketchRounded_rect 12', delay: 2000, narration: "Extruding the battery compartment cap." },
    { cmd: '/tag_last BottomCap', delay: 500 },
    { cmd: '/setprop @BottomCap color #be123c', delay: 500 }, // Rose Red

    // --- 2. Teal Main Body ---
    // Create offset plane on top of cap (Y=12)
    { cmd: '/workplane offset XZ 12', delay: 1000 },
    { cmd: '/sketch_on XZ_Plane_Offset_12', delay: 1000, narration: "Creating the main enclosure body." },
    // Same profile
    { cmd: '/sketch_draw rounded_rect 50 18 6', delay: 1000 },
    { cmd: '/sketch_off', delay: 500 },

    { cmd: '/extrude @SketchRounded_rect 45', delay: 2000, narration: "Extruding the electronics housing." },
    { cmd: '/tag_last MainShell', delay: 500 },
    { cmd: '/setprop @MainShell color #14b8a6', delay: 500 }, // Teal

    // --- 3. Antenna ---
    { cmd: '/parametric cylinder 3 3 20', delay: 1500, narration: "Adding the external antenna." },
    // Cap (12) + Body (45) = 57. Position at top (Y=57).
    // Cylinder default is centered Y. Height 20 -> +/- 10.
    // We want bottom at 57. Center at 67.
    { cmd: '/move 15 67 0', delay: 1000 },
    { cmd: '/tag_last Antenna', delay: 500 },
    { cmd: '/setprop @Antenna color #1f2937', delay: 500 }, // Dark Gray

    // --- 4. Speaker Grill (Subtractive Pattern) ---
    { cmd: '/view front', delay: 1000, narration: "Detailing the speaker grill." },
    
    // Manual placement for demo stability
    // Center Hole
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -12 45 9', delay: 200 }, { cmd: '/tag_last H1', delay: 100 },
    // Surrounding Holes
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -12 48 9', delay: 200 }, { cmd: '/tag_last H2', delay: 100 },
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -12 42 9', delay: 200 }, { cmd: '/tag_last H3', delay: 100 },
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -9 46.5 9', delay: 200 }, { cmd: '/tag_last H4', delay: 100 },
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -9 43.5 9', delay: 200 }, { cmd: '/tag_last H5', delay: 100 },
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -15 46.5 9', delay: 200 }, { cmd: '/tag_last H6', delay: 100 },
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 200 }, { cmd: '/rotate 90 0 0', delay: 200 }, { cmd: '/move -15 43.5 9', delay: 200 }, { cmd: '/tag_last H7', delay: 100 },

    { cmd: '/subtract @MainShell @H1 @H2 @H3 @H4 @H5 @H6 @H7', delay: 4000, narration: "Punching the speaker holes." },
    { cmd: '/tag_last FinalBody', delay: 500 },

    // --- 5. Status LED ---
    { cmd: '/parametric cylinder 1.5 1.5 1', delay: 1000, narration: "Installing the status LED." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 12 45 9', delay: 1000 },
    { cmd: '/tag_last LED', delay: 500 },
    { cmd: '/setprop @LED color #ef4444', delay: 500 }, // Red Light
    { cmd: '/setprop @LED material glass', delay: 500 },

    // --- 6. Union ---
    { cmd: '/union @BottomCap @FinalBody @Antenna @LED', delay: 3000, narration: "Assembling the final unit." },
    { cmd: '/tag_last SensorNode', delay: 500 },

    { cmd: '/view iso', delay: 1500 },
    { cmd: '/view fit', delay: 1000, narration: "Wireless Sensor Node ready." }
];
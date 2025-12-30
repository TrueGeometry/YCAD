// commands/demos/swept_duct.js

export const SWEPT_DUCT_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a transition duct using a Swept Blend." },

    // 1. The Path (Guide Curve)
    // A 90-degree bend from (0,0,0) to (10,10,0) on the XY plane.
    { cmd: '/sketch_on XY', delay: 1500, narration: "First, we define the guide path: a 90-degree bend." },
    // Equation: x=10*sin(t), y=10*(1-cos(t)). t from 0 to PI/2 (1.57)
    // Note: No spaces in equation strings to ensure correct parsing
    { cmd: '/sketch_draw equation 10*sin(t) 10*(1-cos(t)) 0 1.57', delay: 2000 },
    { cmd: '/tag_last Path', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 2. Start Profile (Rectangle)
    // At (0,0,0), perpendicular to X-axis (Tangent start). Plane YZ.
    { cmd: '/sketch_on YZ', delay: 1500, narration: "Sketching the rectangular inlet." },
    { cmd: '/sketch_draw rect 6 4', delay: 1500 },
    { cmd: '/tag_last RectProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 3. End Profile (Circle)
    // At (10,10,0), perpendicular to Y-axis (Tangent end). Plane XZ.
    { cmd: '/sketch_on XZ', delay: 1500, narration: "Sketching the circular outlet." },
    { cmd: '/sketch_draw circle 2.5', delay: 1500 },
    { cmd: '/tag_last CircProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    
    // Position End Profile
    // Created at Origin of XZ plane (0,0,0). Needs to move to (10,10,0) world coords.
    { cmd: '/move 10 10 0', delay: 1000, narration: "Positioning the outlet at the end of the path." },

    // 4. Sweep
    // Added align:z to prevent banking/twisting along the XY curve.
    { cmd: '/sweep @RectProfile @CircProfile @Path align:z', delay: 3000, narration: "Generating the swept geometry." },
    
    // 5. Cleanup & Styling
    { cmd: '/setprop @Sweep_Result color orange', delay: 500 },
    { cmd: '/setprop @Sweep_Result material plastic', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "A smooth transition from rectangle to circle." }
];
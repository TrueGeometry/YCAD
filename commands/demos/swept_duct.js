// commands/demos/swept_duct.js

export const SWEPT_DUCT_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a transition duct using a Swept Blend." },

    // 1. The Path (Guide Curve)
    // A 90-degree bend from (0,0,0) to (10,10,0) on the XY plane.
    { cmd: '/sketch_on XY', delay: 1500, narration: "Defining the guide path: a 90-degree bend." },
    // Equation: x=10*sin(t), y=10*(1-cos(t)). t from 0 to PI/2 (1.57)
    // Starts at 0,0. Ends at 10,10.
    { cmd: '/sketch_draw equation 10*sin(t) 10*(1-cos(t)) 0 1.57', delay: 2000 },
    { cmd: '/tag_last Path', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 2. Start Profile (Rectangle)
    // At (0,0,0), tangent is X (dx/dt = 10cos(0) = 10).
    // Profile Plane should be YZ (Normal X).
    { cmd: '/sketch_on YZ', delay: 1500, narration: "Sketching the rectangular inlet." },
    { cmd: '/sketch_draw rect 6 4', delay: 1500 },
    { cmd: '/tag_last RectProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    // Already at 0,0,0, no move needed.

    // 3. End Profile (Circle)
    // At (10,10,0), tangent is Y (dy/dt = 10sin(PI/2) = 10).
    // Profile Plane should be XZ (Normal Y).
    // We create an Offset Plane at Y=10 to match the end point.
    { cmd: '/workplane offset XZ 10', delay: 1000, narration: "Creating outlet plane at Y=10." },
    { cmd: '/sketch_on XZ_Plane_Offset_10', delay: 1500, narration: "Sketching the circular outlet." },
    { cmd: '/sketch_draw circle 2.5', delay: 1500 },
    { cmd: '/tag_last CircProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },
    
    // Plane is at Y=10. Origin is (0,10,0). We need (10,10,0).
    { cmd: '/move 10 10 0', delay: 1000, narration: "Positioning the outlet." },

    // 4. Sweep
    { cmd: '/sweep_variable @RectProfile @CircProfile @Path solid align:z', delay: 3000, narration: "Generating the swept geometry." },
    { cmd: '/tag_last SweepResult', delay: 500 },
    
    // 5. Cleanup & Styling
    { cmd: '/setprop @SweepResult color orange', delay: 500 },
    { cmd: '/setprop @SweepResult material plastic', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "A smooth transition from rectangle to circle." }
];

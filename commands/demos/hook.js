// commands/demos/hook.js

export const HOOK_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Creating a sturdy wall hook." },

    // 1. Base Plate
    { cmd: '/parametric box 4 6 0.5', delay: 1500, narration: "First, the mounting backplate." },
    { cmd: '/move 0 0 -0.25', delay: 500 }, // Center on Z=0 surface
    { cmd: '/tag_last BasePlate', delay: 500 },

    // 2. The Hook Curve (Torus Section)
    { cmd: '/parametric torus 1.5 0.3', delay: 2000, narration: "Using a torus for the curved hook." },
    { cmd: '/rotate 90 0 0', delay: 1000, narration: "Orienting vertically." },
    { cmd: '/tag_last Ring', delay: 500 },

    // 3. Cut the Ring to make a 'J'
    // Torus is at 0,0,0. Radius 1.5. Top is at Y=1.5. Bottom at Y=-1.5.
    // We want the bottom half and a bit of the up-swing.
    // Let's cut off the top half (Y > 0).
    { cmd: '/parametric box 4 2 2', delay: 1000, narration: "Cutting the top off the ring." },
    { cmd: '/move 0 1 0', delay: 1000 },
    { cmd: '/subtract @Ring @Box_4x2x2', delay: 2500 },
    { cmd: '/tag_last UShape', delay: 500 },

    // 4. Position and Attach
    { cmd: '/move 0 -1 1.5', delay: 1500, narration: "Positioning the hook on the plate." },
    
    // 5. Tip Bulb
    { cmd: '/parametric sphere 0.4', delay: 1000, narration: "Adding a rounded tip." },
    { cmd: '/move 0 0.5 3', delay: 1000 }, // Align with tip of J
    
    // 6. Screw Holes in Base
    { cmd: '/parametric cylinder 0.2 0.2 1', delay: 1000, narration: "Drilling mounting holes." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 0 2 0', delay: 500 },
    { cmd: '/tag_last TopHole', delay: 500 },
    
    { cmd: '/parametric cylinder 0.2 0.2 1', delay: 500 },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 0 -2 0', delay: 500 },
    { cmd: '/tag_last BotHole', delay: 500 },

    { cmd: '/subtract @BasePlate @TopHole @BotHole', delay: 3000, narration: "Base plate ready." },

    // 7. Final Assembly (Visual)
    { cmd: '/setprop @UShape material brass', delay: 500 },
    { cmd: '/setprop @Sphere_0.4 material brass', delay: 500 },
    { cmd: '/setprop @subtract_BasePlate_TopHole_BotHole material wood', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "Wall hook assembly complete." }
];
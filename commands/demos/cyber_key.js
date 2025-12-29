// commands/demos/cyber_key.js

// A "Shield" shape profile for the key handle
// Points: Bottom Tip -> Right Side -> Top Right -> Top Peak -> Top Left -> Left Side -> Close
const HANDLE_PROFILE = JSON.stringify([
    {"type":"line","x":0,"y":-3},
    {"type":"line","x":3,"y":0},
    {"type":"line","x":3,"y":4},
    {"type":"line","x":0,"y":5},
    {"type":"line","x":-3,"y":4},
    {"type":"line","x":-3,"y":0},
    {"type":"line","x":0,"y":-3}
]);

export const CYBER_KEY_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Let's engineer a complex Cyberpunk Key artifact." },

    // --- 1. Sketching the Handle ---
    { cmd: '/sketch_on XY', delay: 1500, narration: "First, we initialize a sketch on the XY Plane for the handle." },
    { cmd: `/sketch_draw composite ${HANDLE_PROFILE}`, delay: 2000, narration: "Drawing a composite shield profile from vector data." },
    
    // RENAME THE SKETCH IMMEDIATELY to ensure we can target it reliably
    { cmd: '/rename @SketchComposite KeyProfile', delay: 500 },

    { cmd: '/sketch_off', delay: 1000 },
    
    // --- 2. Extrusion ---
    { cmd: '/view iso', delay: 1000, narration: "Now, we extrude the 2D profile into a 3D solid." },
    
    // Extrude the renamed profile
    { cmd: '/extrude @KeyProfile 1.5', delay: 2500 },
    { cmd: '/setprop @Extrude_KeyProfile material titanium', delay: 500 },

    // --- 3. CSG: Boring a Hole ---
    { cmd: '/parametric cylinder 1.2 1.2 4', delay: 1500, narration: "Creating a cylinder to bore a hole for the keyring." },
    // Cylinder is Y-up. Rotate to Z-up (match extrusion depth)
    { cmd: '/rotate 90 0 0', delay: 1000 }, 
    // Move to upper center of handle
    { cmd: '/move 0 2.5 0.75', delay: 1000 }, 
    
    { cmd: '/subtract @Extrude_KeyProfile @Cylinder_1.2x1.2x4', delay: 3000, narration: "Subtracting the cylinder from the handle." },
    
    // --- 4. The Shaft ---
    { cmd: '/parametric cylinder 0.6 0.6 12', delay: 1500, narration: "Generating the main key shaft." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Lay flat on Y
    { cmd: '/move 0 -6 0.75', delay: 1500, narration: "Aligning shaft with the handle base." },

    // --- 5. CSG: Cutting the Bits (Notches) ---
    { cmd: '/parametric box 1 2 2', delay: 1500, narration: "Creating a cutter tool for the key bits." },
    { cmd: '/move 0.5 -10 0.75', delay: 1000, narration: "Positioning the cutter." },
    
    // We need to cut the shaft
    { cmd: '/subtract @Cylinder_0.6x0.6x12 @Box_1x2x2', delay: 3000, narration: "Cutting the unique lock pattern." },

    // --- 6. Assembly & Decoration ---
    // The subtract operation created a new mesh. We need to find it. 
    // It usually starts with 'subtract_'. The demo runner will Union All at the end, 
    // but let's add a decorative ring to make it look cool before the final merge.
    
    { cmd: '/parametric torus 0.8 0.2', delay: 1500, narration: "Adding a magnetic collar ring." },
    { cmd: '/move 0 -3.5 0.75', delay: 1000 },
    { cmd: '/setprop @Torus_0.8x0.2 material neon_light', delay: 500 },

    // --- 7. Final View ---
    { cmd: '/view fit', delay: 1000, narration: "The Cyber Key is ready for final fusion and export." }
    
    // NOTE: The demo_runner.js will automatically append /union_all and /export_stl here.
];
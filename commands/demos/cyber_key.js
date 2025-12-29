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
    { cmd: '/view top', delay: 1000, narration: "Let's engineer a complex Cyberpunk Key using precision naming." },

    // --- 1. Sketching the Handle ---
    { cmd: '/sketch_on XY', delay: 1500, narration: "First, we initialize a sketch on the XY Plane for the handle." },
    { cmd: `/sketch_draw composite ${HANDLE_PROFILE}`, delay: 2000, narration: "Drawing a composite shield profile from vector data." },
    
    // Tag the sketch immediately so we know what to extrude
    { cmd: '/tag_last KeySketch', delay: 500 },
    
    { cmd: '/sketch_off', delay: 1000 },
    
    // --- 2. Extrusion ---
    { cmd: '/view iso', delay: 1000, narration: "Now, we extrude the 2D profile into a 3D solid." },
    { cmd: '/extrude @KeySketch 1.5', delay: 2500 },
    
    // Tag the extruded solid
    { cmd: '/tag_last KeyHandle', delay: 500 },
    { cmd: '/setprop @KeyHandle material titanium', delay: 500 },

    // --- 3. CSG: Boring a Hole ---
    { cmd: '/parametric cylinder 1.2 1.2 4', delay: 1500, narration: "Creating a cylinder to bore a hole for the keyring." },
    // Tag the tool
    { cmd: '/tag_last DrillBit', delay: 500 },
    
    // Cylinder is Y-up. Rotate to Z-up (to drill through the face)
    { cmd: '/rotate 90 0 0', delay: 1000 }, 
    // Move to upper center of handle
    { cmd: '/move 0 2.5 0.75', delay: 1000 }, 
    
    // Perform Subtract
    { cmd: '/subtract @KeyHandle @DrillBit', delay: 3000, narration: "Subtracting the cylinder from the handle." },
    
    // Tag the result of the subtraction (automatically selected after op)
    { cmd: '/tag_last KeyHandleBored', delay: 500 },
    
    // --- 4. The Shaft ---
    { cmd: '/parametric cylinder 0.6 0.6 12', delay: 1500, narration: "Generating the main key shaft." },
    { cmd: '/tag_last KeyShaft', delay: 500 },
    
    // Cylinder is Y-up by default, which is correct for a vertical shaft below the handle.
    // No rotation needed here.
    
    { cmd: '/move 0 -6 0.75', delay: 1500, narration: "Aligning shaft with the handle base." },

    // --- 5. CSG: Cutting the Bits (Notches) ---
    { cmd: '/parametric box 1 2 2', delay: 1500, narration: "Creating a cutter tool for the key bits." },
    { cmd: '/tag_last NotchCutter', delay: 500 },
    
    // Position cutter to intersect the lower part of the shaft
    { cmd: '/move 0.5 -10 0.75', delay: 1000, narration: "Positioning the cutter." },
    
    // Cut the shaft
    { cmd: '/subtract @KeyShaft @NotchCutter', delay: 3000, narration: "Cutting the unique lock pattern." },
    { cmd: '/tag_last KeyShaftNotched', delay: 500 },

    // --- 6. Assembly & Decoration ---
    
    { cmd: '/parametric torus 0.8 0.2', delay: 1500, narration: "Adding a magnetic collar ring." },
    { cmd: '/tag_last KeyRing', delay: 500 },
    
    // Rotate Torus to lie flat (XZ plane) around the vertical Y shaft
    { cmd: '/rotate 90 0 0', delay: 1000 },
    
    { cmd: '/move 0 -3.5 0.75', delay: 1000 },
    { cmd: '/setprop @KeyRing material neon_light', delay: 500 },

    // --- 7. Final View ---
    { cmd: '/view fit', delay: 1000, narration: "The Cyber Key is ready for final fusion and export." }
    
    // NOTE: The demo_runner.js will automatically append /union_all and /export_stl here.
];
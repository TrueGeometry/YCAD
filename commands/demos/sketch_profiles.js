// commands/demos/sketch_profiles.js

// JSON for V-Block Profile (Vertices of the loop)
// Note: Must not contain spaces to pass through command parser safely
const V_BLOCK_JSON = JSON.stringify([
    {type:"line",x:-6,y:-2},
    {type:"line",x:6,y:-2},
    {type:"line",x:6,y:2.5},
    {type:"line",x:3,y:2.5},
    {type:"line",x:0,y:0},
    {type:"line",x:-3,y:2.5},
    {type:"line",x:-6,y:2.5},
    {type:"line",x:-6,y:-2}
]);

export const SKETCH_PROFILES_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Let's explore the advanced sketching capabilities." },
    
    // --- 1. V-Block using Composite Curve ---
    { cmd: '/sketch_on XY', delay: 1500, narration: "First, we'll create a V-Block profile using a composite curve." },
    // We pass the JSON string directly. The command parser requires no spaces in the argument.
    { cmd: `/sketch_draw composite ${V_BLOCK_JSON}`, delay: 2000, narration: "The profile is generated from a list of vertices." },
    { cmd: '/sketch_off', delay: 1000 },
    
    { cmd: '/move 0 8 0', delay: 1500, narration: "Moving the profile aside." },

    // --- 2. Slotted Plate using Primitives ---
    { cmd: '/sketch_on XY', delay: 1500, narration: "Next, designing a slotted plate using standard primitives." },
    { cmd: '/sketch_draw rect 12 8', delay: 1000, narration: "Creating the main plate body." },
    
    // Central Hole
    { cmd: '/sketch_draw circle 2', delay: 1000, narration: "Adding a central bore." },
    
    // Slots (Simulated with thin rectangles)
    { cmd: '/sketch_draw rect 8 1', delay: 500 },
    { cmd: '/move 0 2.5 0', delay: 1000, narration: "Positioning top slot." },
    
    { cmd: '/sketch_draw rect 8 1', delay: 500 },
    { cmd: '/move 0 -2.5 0', delay: 1000, narration: "Positioning bottom slot." },
    
    { cmd: '/sketch_off', delay: 1000 },
    { cmd: '/move 16 0 0', delay: 1500 },

    // --- 3. Parametric Cam/Gear Profile ---
    { cmd: '/sketch_on XY', delay: 1500, narration: "Finally, a mathematical cam profile using parametric equations." },
    
    // Equation for a Heart/Cam shape:
    // x = 16 * sin(t)^3
    // y = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
    // Scaled by 0.3 to fit scene
    { cmd: '/sketch_draw equation 0.3*(16*pow(sin(t),3)) 0.3*(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)) 0 6.28', delay: 3000, narration: "Generating complex geometry from mathematical functions." },
    
    { cmd: '/sketch_off', delay: 1000 },

    // --- Extrusion Showcase ---
    { cmd: '/view iso', delay: 1500, narration: "Now let's turn these sketches into 3D parts." },
    { cmd: '/extrude @SketchComposite 4', delay: 2000, narration: "Extruding the V-Block." },
    { cmd: '/extrude @SketchRect 2', delay: 2000, narration: "Extruding the Plate." },
    // Note: The slots (rects) inside the plate are separate objects. 
    // A full CAD boolean workflow would subtract them, but for visual sketch demo, this suffices.
    
    { cmd: '/view fit', delay: 1000, narration: "Sketching and Modeling demonstration complete." }
];

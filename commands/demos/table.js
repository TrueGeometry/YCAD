// commands/demos/table.js
export const TABLE_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's build a simple wooden table." },
    
    // 1. Create one leg
    { cmd: '/parametric cylinder 1 1 10', delay: 2000, narration: "First, we create a cylinder for the first leg." },
    { cmd: '/move -6 5 -4', delay: 1500, narration: "Move it to the corner position." },
    
    // 2. Pattern legs
    { cmd: '/pattern rect 2 2 12 8', delay: 3000, narration: "Now, create a rectangular pattern to generate the other three legs." },
    { cmd: '/view fit', delay: 1000 },
    
    // 3. Create Top
    { cmd: '/parametric box 16 1 12', delay: 2000, narration: "Create a box for the table top." },
    { cmd: '/move 0 10.5 0', delay: 1500, narration: "Move the top to rest on the legs." },
    
    // 4. Style
    { cmd: '/setprop @Box_16x1x12 material wood', delay: 500 },
    { cmd: '/annotate @Box_16x1x12 Table_Top', delay: 1500, narration: "Let's label the top part." },
    
    { cmd: '/view iso', delay: 1000, narration: "And there is our finished table." }
];
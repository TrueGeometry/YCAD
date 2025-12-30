// commands/demos/pen_holder.js

export const PEN_HOLDER_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Building a hexagonal pen holder." },

    // 1. Main Body (Approximated with Cylinder 6 segments, but we don't have segments param in basic cyl yet. Use standard Cylinder for now, maybe Pattern later for hex look)
    // Let's stick to a Cylinder for simplicity, or build a box structure.
    { cmd: '/parametric cylinder 4 4 10', delay: 2000, narration: "Starting with the main cylinder body." },
    { cmd: '/tag_last HolderSolid', delay: 500 },

    // 2. Hollow Tool
    { cmd: '/parametric cylinder 3.5 3.5 11', delay: 1000, narration: "Creating the inner void." },
    { cmd: '/move 0 1 0', delay: 1000, narration: "Offsetting to keep a solid base." },
    
    // 3. Subtract
    { cmd: '/subtract @HolderSolid @Cylinder_3.5x3.5x11', delay: 3000, narration: "Hollowing out the holder." },
    { cmd: '/tag_last Cup', delay: 500 },

    // 4. Decoration (Patterned holes)
    { cmd: '/parametric sphere 1', delay: 1000, narration: "Adding decorative cutouts." },
    { cmd: '/move 4 0 0', delay: 500 },
    
    // Pattern vertically
    { cmd: '/pattern rect 1 3 0 3', delay: 2000 }, // 1 col, 3 rows, dz=3? No, rect is X/Z usually. 
    // Wait, rect pattern is on XZ plane generally for placement? The command logic is:
    // clone.position.set(startX + i*dx, startY, startZ + j*dz)
    // To go vertical (Y), we need to manually move or rely on a different pattern command logic.
    // Our current `/pattern rect` does X/Z.
    // Let's do manual vertical placement or use a rotated tool.
    
    { cmd: '/undo', delay: 500, narration: "Actually, let's place them manually for vertical styling." },
    
    // Manual placement
    { cmd: '/parametric sphere 1', delay: 500 },
    { cmd: '/move 3.5 2 0', delay: 500 },
    { cmd: '/tag_last D1', delay: 200 },
    
    { cmd: '/parametric sphere 1', delay: 500 },
    { cmd: '/move 3.5 5 0', delay: 500 },
    { cmd: '/tag_last D2', delay: 200 },
    
    { cmd: '/parametric sphere 1', delay: 500 },
    { cmd: '/move 3.5 -2 0', delay: 500 },
    { cmd: '/tag_last D3', delay: 200 },

    // Subtract decoration
    { cmd: '/subtract @Cup @D1 @D2 @D3', delay: 4000, narration: "Applying the texture." },
    
    { cmd: '/setprop @subtract_Cup_D1_D2_D3 color teal', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Pen holder complete." }
];
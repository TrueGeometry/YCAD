// commands/demos/drawer.js

export const DRAWER_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Building a simple drawer unit." },

    // --- 1. The Casing ---
    { cmd: '/parametric box 12 8 20', delay: 2000, narration: "Creating the outer casing shell." },
    { cmd: '/tag_last OuterBox', delay: 500 },
    
    // Hollow out the casing (open front)
    { cmd: '/parametric box 10 6 22', delay: 1500, narration: "Creating a tool to hollow out the case." },
    { cmd: '/tag_last CaseCutter', delay: 500 },
    { cmd: '/move 0 0 -2', delay: 1000, narration: "Aligning to cut the front face but leave a back wall." },
    
    { cmd: '/subtract @OuterBox @CaseCutter', delay: 3000, narration: "Casing is complete." },
    { cmd: '/tag_last Casing', delay: 500 },

    // --- 2. The Drawer ---
    // Slightly smaller than the hole (10x6) -> 9.5 x 5.5
    { cmd: '/parametric box 9.5 5.5 18', delay: 2000, narration: "Creating the sliding drawer body." },
    { cmd: '/tag_last DrawerSolid', delay: 500 },
    { cmd: '/move 0 -0.25 -1', delay: 1000, narration: "Sliding it inside." },
    
    // Hollow out the drawer (top open)
    { cmd: '/parametric box 8.5 5.5 16', delay: 1500, narration: "Creating the storage volume inside the drawer." },
    { cmd: '/tag_last DrawerScoop', delay: 500 },
    { cmd: '/move 0 1 -1', delay: 1000, narration: "Positioning the hollow." },
    
    { cmd: '/subtract @DrawerSolid @DrawerScoop', delay: 3000, narration: "Drawer is now hollow." },
    { cmd: '/tag_last FinalDrawer', delay: 500 },

    // --- 3. Handle ---
    { cmd: '/parametric sphere 1.2', delay: 1000, narration: "Adding a knob handle." },
    { cmd: '/tag_last Knob', delay: 500 },
    { cmd: '/move 0 0 -10', delay: 1000, narration: "Attaching knob to the front." },
    
    // Union Handle to Drawer
    { cmd: '/union @FinalDrawer @Knob', delay: 2500, narration: "Fusing the handle." },
    { cmd: '/tag_last DrawerAssembly', delay: 500 },

    // --- 4. Animation (Slide Out) ---
    { cmd: '/move 0 0 -5', delay: 2000, narration: "Testing the slide action." },
    
    { cmd: '/view fit', delay: 1000, narration: "Storage unit complete." }
];
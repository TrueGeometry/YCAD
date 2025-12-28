// commands/demos/bookshelf.js
export const BOOKSHELF_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's build a simple bookshelf." },
    
    // Sides
    { cmd: '/parametric box 1 8 4', delay: 1500, narration: "First, create the left side panel." },
    { cmd: '/move -2.5 4 0', delay: 1000 },
    
    { cmd: '/parametric box 1 8 4', delay: 1500, narration: "Now the right side panel." },
    { cmd: '/move 2.5 4 0', delay: 1000 },

    // Shelves (Manual placement since pattern rect is horizontal)
    { cmd: '/parametric box 4 0.5 4', delay: 1500, narration: "Adding the bottom shelf." },
    { cmd: '/move 0 0.5 0', delay: 1000 },

    { cmd: '/parametric box 4 0.5 4', delay: 1500, narration: "Adding the middle shelf." },
    { cmd: '/move 0 4 0', delay: 1000 },

    { cmd: '/parametric box 4 0.5 4', delay: 1500, narration: "Adding the top shelf." },
    { cmd: '/move 0 7.5 0', delay: 1000 },
    
    // Top Cap
    { cmd: '/parametric box 6.5 0.5 4.5', delay: 2000, narration: "Finally, a wider top cap to finish it off." },
    { cmd: '/move 0 8.25 0', delay: 1000 },

    { cmd: '/setprop @Box_6.5x0.5x4.5 name Top_Cap', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "The bookshelf is ready." }
];
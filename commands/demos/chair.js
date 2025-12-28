// commands/demos/chair.js
export const CHAIR_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's design a basic chair." },
    
    // 1. Seat
    { cmd: '/parametric box 6 1 6', delay: 1500, narration: "Start with a box for the seat." },
    { cmd: '/move 0 4 0', delay: 1000 },

    // 2. Legs
    { cmd: '/parametric box 0.8 4 0.8', delay: 1500, narration: "Create a leg." },
    { cmd: '/move -2.5 2 -2.5', delay: 1000, narration: "Position the front-left leg." },
    
    { cmd: '/pattern rect 2 2 5 5', delay: 2500, narration: "Pattern it to create 4 legs." },
    
    // 3. Backrest
    // We need to extend the back legs up, or add a new part. Let's add a new part.
    { cmd: '/parametric box 6 6 1', delay: 2000, narration: "Create the backrest." },
    { cmd: '/move 0 7.5 -2.5', delay: 2000, narration: "Move it into position." },
    
    // 4. Grouping/Color (Simulated via properties)
    { cmd: '/view fit', delay: 1000, narration: "Let's take a closer look." },
    { cmd: '/rotate 0 45 0', delay: 500, narration: "Rotating the view..." },
    
    { cmd: '/annotate @Box_6x6x1 Backrest', delay: 1000 },
    { cmd: '/view iso', delay: 1000, narration: "Chair construction complete." }
];
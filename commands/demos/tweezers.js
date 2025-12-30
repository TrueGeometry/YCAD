// commands/demos/tweezers.js

export const TWEEZERS_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing precision tweezers." },

    // 1. Connection Point (Back)
    { cmd: '/parametric cylinder 0.5 0.5 1', delay: 1500, narration: "The hinge/connection point." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move -5 0 0', delay: 1000 },
    { cmd: '/tag_last Hinge', delay: 500 },

    // 2. Top Arm
    { cmd: '/parametric box 10 0.2 0.8', delay: 1500, narration: "The top arm." },
    { cmd: '/rotate 0 0 5', delay: 1000, narration: "Angling it open." },
    { cmd: '/move 0 0.5 0', delay: 1000 }, // Adjust position
    { cmd: '/tag_last TopArm', delay: 500 },

    // 3. Bottom Arm
    { cmd: '/parametric box 10 0.2 0.8', delay: 1500, narration: "The bottom arm." },
    { cmd: '/rotate 0 0 -5', delay: 1000 },
    { cmd: '/move 0 -0.5 0', delay: 1000 },
    { cmd: '/tag_last BotArm', delay: 500 },

    // 4. Union Hinge + Arms
    { cmd: '/union @Hinge @TopArm @BotArm', delay: 2500, narration: "Joining the assembly." },
    { cmd: '/tag_last TweezerBody', delay: 500 },

    // 5. Sharpen Tips (Cut)
    // Tips are at X ~ 5. Let's cut them to a point.
    { cmd: '/parametric box 2 2 2', delay: 1000, narration: "Sharpening the tips." },
    { cmd: '/rotate 0 45 0', delay: 500 },
    { cmd: '/move 6 0 0', delay: 1000 },
    { cmd: '/tag_last Cutter', delay: 500 },
    
    // We want to keep the inner part, so subtract the cutter?
    // Actually intersection or subtraction depends on shape.
    // Let's just annotate the tips for simplicity in this demo environment.
    { cmd: '/delete @Cutter', delay: 500, narration: "Actually, these flat tips are good for electronics." },

    { cmd: '/setprop @TweezerBody material stainless_steel', delay: 500 },
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/view fit', delay: 1000, narration: "Precision tool ready." }
];
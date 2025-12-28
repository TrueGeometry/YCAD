// commands/demos/mug.js
export const MUG_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "We will make a coffee mug using Boolean operations." },

    // 1. Main Body
    { cmd: '/parametric cylinder 3 3 5', delay: 2000, narration: "Start with a solid cylinder for the body." },
    { cmd: '/move 0 2.5 0', delay: 1000 },

    // 2. Hollow Cutter
    { cmd: '/parametric cylinder 2.5 2.5 6', delay: 2000, narration: "Create a slightly smaller cylinder to cut the hole." },
    { cmd: '/move 0 3.5 0', delay: 1000, narration: "Position it higher so it doesn't cut the bottom." },

    // 3. Subtract
    { cmd: '/subtract @Cylinder_3x3x5 @Cylinder_2.5x2.5x6', delay: 3000, narration: "Subtract the inner cylinder to hollow out the mug." },

    // 4. Handle
    { cmd: '/parametric torus 2 0.3', delay: 2000, narration: "Create a torus ring for the handle." },
    // Torus defaults to flat in XY. We need to stand it up or rotate it.
    // Default torus lies on XY plane.
    { cmd: '/rotate 90 0 0', delay: 1000, narration: "Rotate it upright." },
    { cmd: '/move 2.5 2.5 0', delay: 1500, narration: "Move it to the side of the mug." },

    // 5. Union
    // The previous subtraction created a new mesh named 'subtract_...'. We select it via @subtract... or simply via valid reference logic
    // But since the name is dynamic, let's rely on the fact that /subtract selects the result.
    // However, our demo script needs names. The system names results as 'subtract_Target_Tool'.
    { cmd: '/union @subtract_Cylinder_3x3x5_Cylinder_2.5x2.5x6 @Torus_2x0.3', delay: 3000, narration: "Join the handle to the body." },

    { cmd: '/view fit', delay: 1000, narration: "Time for coffee!" }
];
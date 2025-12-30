// commands/demos/kitchen_clip.js

export const KITCHEN_CLIP_DEMO = [
    { cmd: '/view front', delay: 1000, narration: "Building a durable kitchen bag clip." },

    // 1. The Hinge Mechanism
    { cmd: '/parametric cylinder 0.8 0.8 4', delay: 1500, narration: "Starting with the central hinge pin." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Horizontal Z axis (Cylinder Y up -> Rot X 90 -> Z aligned)
    // Wait, cylinder default is Y-axis. Rotate X 90 -> Z axis. Correct.
    { cmd: '/tag_last HingePin', delay: 500 },

    // 2. Upper Arm
    { cmd: '/parametric box 12 0.6 3', delay: 2000, narration: "Creating the upper arm." },
    { cmd: '/move 0 0.8 0', delay: 1000 }, // Sit above hinge
    { cmd: '/rotate 0 0 5', delay: 1000, narration: "Angling open slightly." }, // Rotate Z axis to tilt
    { cmd: '/tag_last UpperArm', delay: 500 },

    // 3. Lower Arm
    { cmd: '/parametric box 12 0.6 3', delay: 1500, narration: "Creating the lower arm." },
    { cmd: '/move 0 -0.8 0', delay: 1000 },
    { cmd: '/rotate 0 0 -5', delay: 1000 },
    { cmd: '/tag_last LowerArm', delay: 500 },

    // 4. Gripping Teeth (Upper)
    // Pattern small ridges on the gripping side (Positive X)
    { cmd: '/parametric cylinder 0.3 0.3 3', delay: 1000, narration: "Adding grip teeth." },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 3 0.5 0', delay: 500 }, // Position on upper arm inner face
    { cmd: '/pattern rect 4 1 1.5 0', delay: 2000 }, // 4 teeth along X
    
    // We need to group these with Upper Arm or just leave them visual.
    // Let's create a group for the top assembly visually.
    
    // 5. Gripping Teeth (Lower)
    { cmd: '/parametric cylinder 0.3 0.3 3', delay: 1000 },
    { cmd: '/rotate 90 0 0', delay: 500 },
    { cmd: '/move 3.75 -0.5 0', delay: 500 }, // Offset X to interlock
    { cmd: '/pattern rect 3 1 1.5 0', delay: 2000 },

    // 6. Spring Coil Visual
    { cmd: '/parametric torus 0.6 0.1', delay: 1500, narration: "Adding the spring mechanism." },
    { cmd: '/move 0 0 2', delay: 500 }, // One side
    { cmd: '/tag_last Spring1', delay: 500 },
    
    { cmd: '/parametric torus 0.6 0.1', delay: 500 },
    { cmd: '/move 0 0 -2', delay: 500 }, // Other side
    { cmd: '/tag_last Spring2', delay: 500 },

    // 7. Styling
    { cmd: '/setprop @UpperArm color red', delay: 200 },
    { cmd: '/setprop @LowerArm color red', delay: 200 },
    { cmd: '/setprop @HingePin color silver', delay: 200 },
    
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/view fit', delay: 1000, narration: "Heavy duty clip ready." }
];
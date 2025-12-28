// commands/demos/car.js
export const CAR_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Let's design a simple car." },

    // 1. Chassis
    { cmd: '/parametric box 4 1 8', delay: 1500, narration: "Start with the chassis base." },
    { cmd: '/move 0 1.5 0', delay: 1000 },
    { cmd: '/setprop @Box_4x1x8 material metal', delay: 500 },

    // 2. Wheels
    // Cylinder default is Y-up. Rotate Z 90 to make it a wheel rolling on X/Z plane.
    { cmd: '/parametric cylinder 1.2 1.2 1', delay: 1500, narration: "Create a wheel." },
    { cmd: '/rotate 0 0 90', delay: 1000, narration: "Rotate it to face the correct way." },
    
    // Position 4 wheels manually to ensure correct orientation (Patterning creates copies, but sometimes user wants precision)
    // Wheel 1
    { cmd: '/move -2 1.2 2.5', delay: 500, narration: "Front Left Wheel." },
    { cmd: '/setprop @Cylinder_1.2x1.2x1 material rubber', delay: 500 },

    // Copying logic via pattern would require careful axis alignment. Let's just create copies or new cylinders for clarity in demo.
    { cmd: '/parametric cylinder 1.2 1.2 1', delay: 500 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 2 1.2 2.5', delay: 500, narration: "Front Right Wheel." },
    { cmd: '/setprop @Cylinder_1.2x1.2x1 material rubber', delay: 100 },

    { cmd: '/parametric cylinder 1.2 1.2 1', delay: 500 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move -2 1.2 -2.5', delay: 500, narration: "Rear Left Wheel." },
    { cmd: '/setprop @Cylinder_1.2x1.2x1 material rubber', delay: 100 },

    { cmd: '/parametric cylinder 1.2 1.2 1', delay: 500 },
    { cmd: '/rotate 0 0 90', delay: 500 },
    { cmd: '/move 2 1.2 -2.5', delay: 500, narration: "Rear Right Wheel." },
    { cmd: '/setprop @Cylinder_1.2x1.2x1 material rubber', delay: 100 },

    // 3. Cabin
    { cmd: '/parametric box 3.5 2 4', delay: 1500, narration: "Add the passenger cabin." },
    { cmd: '/move 0 3 0.5', delay: 1000 },

    // 4. Headlights
    { cmd: '/parametric sphere 0.5', delay: 1000, narration: "Headlights." },
    { cmd: '/move -1.2 2 4', delay: 500 },
    { cmd: '/parametric sphere 0.5', delay: 500 },
    { cmd: '/move 1.2 2 4', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "Ready to drive." }
];
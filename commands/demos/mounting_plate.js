// commands/demos/mounting_plate.js

export const MOUNTING_PLATE_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing the mounting plate based on the technical drawing." },
    
    // 1. Top Section (R96 -> Diameter 192)
    { cmd: '/parametric cylinder 96 96 20', delay: 1500, narration: "Creating the top arc section (R96)." },
    { cmd: '/tag_last TopBody', delay: 500 },
    
    // 2. Bottom Section (R54 -> Diameter 108)
    // Distance from center is 80mm
    { cmd: '/parametric cylinder 54 54 20', delay: 1500, narration: "Creating the bottom arc section (R54), offset by 80mm." },
    { cmd: '/move 0 -80 0', delay: 1000 },
    { cmd: '/tag_last BotBody', delay: 500 },
    
    // 3. Connecting Neck
    // Approximate the tangents with a block for the demo
    { cmd: '/parametric box 150 80 20', delay: 1000, narration: "Connecting the two sections." },
    { cmd: '/move 0 -40 0', delay: 500 },
    { cmd: '/tag_last Neck', delay: 500 },
    
    // 4. Shaping the Waist (Simulating R20 Fillets)
    // Subtract cylinders from the sides to narrow the neck
    { cmd: '/parametric cylinder 40 40 30', delay: 500 },
    { cmd: '/move 130 -40 0', delay: 500 },
    { cmd: '/tag_last CutRight', delay: 500 },
    
    { cmd: '/parametric cylinder 40 40 30', delay: 500 },
    { cmd: '/move -130 -40 0', delay: 500 },
    { cmd: '/tag_last CutLeft', delay: 500 },
    
    { cmd: '/subtract @Neck @CutRight @CutLeft', delay: 2000, narration: "Trimming the neck to shape." },
    { cmd: '/tag_last NeckTrimmed', delay: 500 },

    // 5. Union Main Body
    { cmd: '/union @TopBody @BotBody @NeckTrimmed', delay: 2000, narration: "Merging components into a single solid." },
    { cmd: '/tag_last PlateBody', delay: 500 },
    
    // 6. Top Holes Pattern (PCD 128 -> R64)
    // Three holes of Dia 30 (R15)
    
    // Top Center (90 deg)
    { cmd: '/parametric cylinder 15 15 30', delay: 1000, narration: "Drilling the top mounting holes." },
    { cmd: '/move 0 64 0', delay: 500 },
    { cmd: '/tag_last H_Top', delay: 500 },
    
    // Right (30 deg) -> x = 64*cos(30) = 55.42, y = 64*sin(30) = 32
    { cmd: '/parametric cylinder 15 15 30', delay: 500 },
    { cmd: '/move 55.42 32 0', delay: 500 },
    { cmd: '/tag_last H_Right', delay: 500 },
    
    // Left (150 deg) -> x = -55.42, y = 32
    { cmd: '/parametric cylinder 15 15 30', delay: 500 },
    { cmd: '/move -55.42 32 0', delay: 500 },
    { cmd: '/tag_last H_Left', delay: 500 },
    
    // 7. Center Large Bore (Dia 50 -> R25)
    { cmd: '/parametric cylinder 25 25 30', delay: 1000, narration: "Boring the main center hole." },
    { cmd: '/tag_last BoreTop', delay: 500 },
    
    // 8. Bottom Bore (Dia 40 -> R20) at (0, -80)
    { cmd: '/parametric cylinder 20 20 30', delay: 1000, narration: "Boring the bottom hole." },
    { cmd: '/move 0 -80 0', delay: 500 },
    { cmd: '/tag_last BoreBot', delay: 500 },
    
    // 9. Bottom Slots (Approximated as holes)
    // Kidney slots are complex to text-command, approximating with 2 holes
    { cmd: '/parametric cylinder 9 9 30', delay: 500 },
    { cmd: '/move 25 -90 0', delay: 500 },
    { cmd: '/tag_last Slot1', delay: 500 },
    
    { cmd: '/parametric cylinder 9 9 30', delay: 500 },
    { cmd: '/move -25 -90 0', delay: 500 },
    { cmd: '/tag_last Slot2', delay: 500 },

    // 10. Final Subtract
    { cmd: '/subtract @PlateBody @H_Top @H_Right @H_Left @BoreTop @BoreBot @Slot1 @Slot2', delay: 3000, narration: "Finalizing geometry." },
    
    { cmd: '/setprop @subtract_PlateBody_H_Top_H_Right_H_Left_BoreTop_BoreBot_Slot1_Slot2 material steel', delay: 500 },
    { cmd: '/view iso', delay: 1500 },
    { cmd: '/view fit', delay: 1000 }
];
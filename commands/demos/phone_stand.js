// commands/demos/phone_stand.js

export const PHONE_STAND_DEMO = [
    { cmd: '/view side', delay: 1000, narration: "Building a phone and tablet stand." },

    // 1. The Base
    { cmd: '/parametric box 8 1 10', delay: 1500, narration: "Creating the weighted base plate." },
    { cmd: '/move 0 0.5 0', delay: 500 },
    { cmd: '/tag_last Base', delay: 500 },

    // 2. The Angled Back Support
    { cmd: '/parametric box 8 12 1', delay: 1500, narration: "Creating the back support." },
    // Rotate 60 degrees back
    { cmd: '/rotate -60 0 0', delay: 1000, narration: "Angling it for viewing." },
    // Position it. 
    // Center of rotation is 0,0,0. After rot, it tilts back. 
    // Move it up and back.
    { cmd: '/move 0 5 -2', delay: 1000 },
    { cmd: '/tag_last BackRest', delay: 500 },

    // 3. The Lip (Hook to hold phone)
    { cmd: '/parametric box 8 2 1.5', delay: 1500, narration: "Adding the holding lip." },
    { cmd: '/rotate -60 0 0', delay: 500 }, // Match angle roughly
    { cmd: '/move 0 1.5 2.5', delay: 1000, narration: "Positioning at the bottom of the rest." },
    { cmd: '/tag_last Lip', delay: 500 },

    // 4. Union Main Body
    { cmd: '/union @Base @BackRest @Lip', delay: 3000, narration: "Fusing the components." },
    { cmd: '/tag_last StandBody', delay: 500 },

    // 5. Cable Pass-through Hole
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/parametric cylinder 1.5 1.5 5', delay: 1000, narration: "Creating a tool for the charging cable hole." },
    { cmd: '/rotate 30 0 0', delay: 1000, narration: "Aligning perpendicular to the backrest." },
    { cmd: '/move 0 4 -1', delay: 1000 },
    
    { cmd: '/subtract @StandBody @Cylinder_1.5x1.5x5', delay: 3000, narration: "Drilling the cable pass-through." },
    
    // 6. Anti-slip pads (Spheres at corners)
    { cmd: '/parametric sphere 0.5', delay: 1000, narration: "Adding anti-slip feet." },
    { cmd: '/move 3.5 0 4.5', delay: 500 },
    { cmd: '/pattern rect 2 2 7 9', delay: 2000 }, // x-dist 7 (3.5 to -3.5), z-dist 9
    // Move pattern result to correct places (start was 3.5, 4.5. rect goes +x +z usually. 
    // We need to move start point to bottom left: -3.5, 0, -4.5
    { cmd: '/delete @Sphere_0.5 @Sphere_0.5_1_0 @Sphere_0.5_0_1 @Sphere_0.5_1_1', delay: 500, narration: "Oops, let me re-position for the pattern." },
    
    { cmd: '/parametric sphere 0.5', delay: 500 },
    { cmd: '/move -3.5 0 -4.5', delay: 500 },
    { cmd: '/pattern rect 2 2 7 9', delay: 2000, narration: "Adding feet to all four corners." },

    { cmd: '/setprop @subtract_StandBody_Cylinder_1.5x1.5x5 material aluminum', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Modern aluminum phone stand complete." }
];
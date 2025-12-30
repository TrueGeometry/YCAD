// commands/demos/flange.js

export const FLANGE_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Designing a standard flange with a 4-hole pattern." },

    // 1. Main Body: Diameter 100mm (Radius 50), Thickness 10mm
    { cmd: '/parametric cylinder 50 50 10', delay: 2000, narration: "Creating the main disk: 100mm diameter, 10mm thick." },
    { cmd: '/tag_last FlangeBody', delay: 500 },

    // 2. Center Bore: Diameter 30mm (Radius 15)
    { cmd: '/parametric cylinder 15 15 20', delay: 1500, narration: "Creating the 30mm center bore tool." },
    { cmd: '/tag_last CenterBore', delay: 500 },
    
    // 3. Subtract Center
    { cmd: '/subtract @FlangeBody @CenterBore', delay: 2500, narration: "Cutting the center hole." },
    { cmd: '/tag_last FlangeStep1', delay: 500 },

    // 4. Bolt Hole Setup (PCD 60mm -> Radius 30mm)
    // Hole Diameter 10mm (Radius 5)
    { cmd: '/parametric cylinder 5 5 20', delay: 1500, narration: "Creating a 10mm bolt hole cutter." },
    { cmd: '/move 30 0 0', delay: 1500, narration: "Positioning at 30mm radius to match 60mm PCD." },
    { cmd: '/tag_last HoleCutter', delay: 500 },

    // 5. Pattern
    { cmd: '/pattern circ 4 360 y', delay: 3000, narration: "Patterning 4 holes around the center." },
    // Generated names: HoleCutter (original), HoleCutter_c1, HoleCutter_c2, HoleCutter_c3

    // 6. Subtract Holes
    { cmd: '/subtract @FlangeStep1 @HoleCutter @HoleCutter_c1 @HoleCutter_c2 @HoleCutter_c3', delay: 4000, narration: "Subtracting all bolt holes from the flange." },
    { cmd: '/tag_last FinalFlange', delay: 500 },

    // 7. Finish
    { cmd: '/setprop @FinalFlange material steel', delay: 500 },
    { cmd: '/view iso', delay: 1500, narration: "The flange is complete." },
    { cmd: '/view fit', delay: 1000 }
];
// commands/demos/cable_organizer.js

export const CABLE_ORGANIZER_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Designing a desktop cable organizer clip." },

    // 1. Main Block
    { cmd: '/parametric box 10 3 3', delay: 2000, narration: "Starting with the main body block." },
    { cmd: '/move 0 1.5 0', delay: 500 },
    { cmd: '/tag_last Base', delay: 500 },

    // 2. Cable Channels (Cylinders)
    // Cables usually around 4-5mm. Let's say radius 0.4 units.
    { cmd: '/parametric cylinder 0.6 0.6 4', delay: 1000, narration: "Creating the tool for cable channels." },
    { cmd: '/rotate 90 0 0', delay: 500 }, // Align Z
    { cmd: '/move -3 2.5 0', delay: 1000, narration: "Positioning for the first slot." },
    { cmd: '/tag_last Channel1', delay: 500 },

    // 3. Entry Slots (Narrow cut from top)
    { cmd: '/parametric box 0.8 2 4', delay: 1000, narration: "Creating the snap-fit entry slot." },
    { cmd: '/move -3 3.5 0', delay: 1000 },
    { cmd: '/tag_last Slot1', delay: 500 },

    // 4. Pattern the Cutter (Channel + Slot)
    // We can't easily group and pattern for boolean in one go with current simple commands unless we union them first.
    // Let's union the cutter parts to make a master cutter.
    { cmd: '/union @Channel1 @Slot1', delay: 2000, narration: "Combining the channel and slot into one cutter tool." },
    { cmd: '/tag_last MasterCutter', delay: 500 },

    // 5. Pattern Cutters
    { cmd: '/pattern rect 3 1 3 0', delay: 2500, narration: "Patterning 3 slots." },
    // Names: MasterCutter, MasterCutter_1_0 (x=1), MasterCutter_2_0 (x=2)
    // Wait, rect pattern logic: cols(X), rows(Z).
    // dx=3. So pos will be -3, 0, 3.

    // 6. Subtract
    { cmd: '/subtract @Base @MasterCutter @MasterCutter_1_0 @MasterCutter_2_0', delay: 4000, narration: "Cutting the slots into the base." },
    { cmd: '/tag_last CableClip', delay: 500 },

    // 7. Styling
    { cmd: '/setprop @CableClip material silicone', delay: 500 },
    { cmd: '/setprop @CableClip color dark_grey', delay: 500 },

    // 8. Adhesive Backing (Visual)
    { cmd: '/parametric plane 10 3', delay: 1000, narration: "Adding adhesive backing strip." },
    { cmd: '/rotate -90 0 0', delay: 500 },
    { cmd: '/setprop @Plane_10x3 color red', delay: 500 },

    { cmd: '/view fit', delay: 1000, narration: "Cable organizer ready." }
];
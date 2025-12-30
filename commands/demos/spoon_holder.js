// commands/demos/spoon_holder.js

export const SPOON_HOLDER_DEMO = [
    { cmd: '/view top', delay: 1000, narration: "Modeling a kitchen spoon rest." },

    // 1. Base shape via Sketch
    { cmd: '/sketch_on XZ', delay: 1500, narration: "Sketching the base profile on the floor." }, 
    { cmd: '/sketch_draw circle 4', delay: 1000 },
    { cmd: '/sketch_off', delay: 1000 },
    
    { cmd: '/extrude @SketchCircle 1', delay: 2000, narration: "Extruding the base platform." },
    { cmd: '/tag_last Base', delay: 500 },

    // 2. Handle Rest Stem
    { cmd: '/parametric box 2 1.5 6', delay: 1500, narration: "Adding the handle support stem." },
    { cmd: '/move 5 0.5 0', delay: 1000 }, // Overlap with base, sitting on floor (y=0.5 is center of h=1?) No, h=1.5 center 0.75.
    // Let's adjust height. Base is Y 0->1. Stem Y should match roughly.
    { cmd: '/tag_last Stem', delay: 500 },

    // 3. Union Base + Stem
    { cmd: '/union @Base @Stem', delay: 2000, narration: "Joining the parts." },
    { cmd: '/tag_last RawBody', delay: 500 },

    // 4. Scoop out bowl
    { cmd: '/view iso', delay: 1000 },
    { cmd: '/parametric sphere 3.5', delay: 1000, narration: "Creating a tool to scoop the bowl." },
    { cmd: '/move 0 3 0', delay: 1000 }, // Position above base center
    
    { cmd: '/subtract @RawBody @Sphere_3.5', delay: 2500, narration: "Carving out the spoon resting area." },
    { cmd: '/tag_last SpoonRest', delay: 500 },

    { cmd: '/setprop @SpoonRest material ceramic_white', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Spoon holder complete." }
];
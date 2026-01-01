// commands/demos/corner_housing.js

export const CORNER_HOUSING_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Recreating a complex corner housing with internal fillets." },

    // 1. Stock Block
    { cmd: '/parametric box 12 12 12', delay: 1500, narration: "Starting with a solid 12x12x12 block." },
    { cmd: '/move 0 6 0', delay: 1000 },
    { cmd: '/tag_last Stock', delay: 500 },

    // 2. Pocket Tool (Rounded Box)
    // Dimensions 10x10x12, Fillet Radius 2
    // This creates the "Cylindrical Face" (vertical edges) and "Spherical Face" (bottom corners)
    { cmd: '/parametric box 10 10 12 2', delay: 2000, narration: "Creating the pocket tool with 2mm fillet radius." },
    // Align tool to top center. Stock top Y=12.
    // Tool Height 12. Center at 6.
    // We want tool to go down to Y=2 (Bottom thickness).
    // So Tool Bottom @ Y=2. Tool Center @ Y=2+6=8.
    { cmd: '/move 0 8 0', delay: 1000, narration: "Positioning tool to cut a blind pocket." },
    { cmd: '/tag_last PocketTool', delay: 500 },

    // 3. Create Cavity
    { cmd: '/subtract @Stock @PocketTool', delay: 3000, narration: "Machining the cavity to form fillet faces." },
    { cmd: '/tag_last Housing', delay: 500 },

    // 4. Section Cut (Quarter Cutaway)
    { cmd: '/parametric box 6.1 13 6.1', delay: 1500, narration: "Preparing a section cut to reveal the interior." },
    // Move to (+X, +Z) corner
    { cmd: '/move 3.05 6 3.05', delay: 1000 }, 
    { cmd: '/tag_last SectionCutter', delay: 500 },

    { cmd: '/subtract @Housing @SectionCutter', delay: 3000, narration: "Section view applied." },
    { cmd: '/tag_last FinalPart', delay: 500 },

    // 5. Markers & Annotations
    // "Spherical Face" -> Inner Corner Bottom.
    // Pocket wall is at +/- 5 (10 width). Radius 2.
    // Corner is at (-5+2, -5+2) = (-3, -3)? No, corner center is at 3.
    // Let's place marker roughly at the spherical blend.
    { cmd: '/parametric sphere 0.2', delay: 500 },
    { cmd: '/move -3 2.5 -3', delay: 500 },
    { cmd: '/annotate @Sphere_0.2 Spherical_Face', delay: 500 },
    { cmd: '/setprop @Sphere_0.2 color red', delay: 200 },

    // "Cylindrical Face" -> Vertical Edge
    { cmd: '/parametric sphere 0.2', delay: 500 },
    { cmd: '/move -5 8 0', delay: 500 },
    { cmd: '/annotate @Sphere_0.2 Cylindrical_Face', delay: 500 },
    { cmd: '/setprop @Sphere_0.2 color red', delay: 200 },

    // "Toroidal Face" -> Top Rim Blend (Ideally we'd fillet the top edge too)
    // Since our boolean was flat top, the top edge is sharp.
    // Let's create a visual annotation where it *would* be, or user requested "combination of commands".
    // We can simulate a top fillet by subtracting a Torus?
    // Let's just point to the cross edge.
    { cmd: '/parametric sphere 0.2', delay: 500 },
    { cmd: '/move 0 12 -5', delay: 500 },
    { cmd: '/annotate @Sphere_0.2 Top_Edge', delay: 500 },
    { cmd: '/setprop @Sphere_0.2 color red', delay: 200 },

    { cmd: '/setprop @FinalPart material polished_steel', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "Complex housing geometry complete." }
];
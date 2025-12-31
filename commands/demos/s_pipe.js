// commands/demos/s_pipe.js

export const S_PIPE_DEMO = [
    { cmd: '/view iso', delay: 1000, narration: "Creating an S-curved hollow pipe." },

    // 1. The Path (S-Curve)
    // x varies from 0 to 20.
    // y = 5 * sin((x/20) * 2 * PI) = 5 * sin(x * 0.314)
    // t from 0 to 20
    { cmd: '/sketch_on XY', delay: 1500, narration: "Drawing the S-curve guide path." },
    { cmd: '/sketch_draw equation t 5*sin(t*0.314) 0 20', delay: 2000 },
    { cmd: '/tag_last S_Path', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 2. The Profile Plane
    // At t=0, dx=1, dy=1.57. Angle = atan(1.57) = 57.5 degrees.
    // We need a plane perpendicular to this tangent.
    // Start with YZ Plane (Normal X). Rotate 57.5 deg around Z.
    { cmd: '/workplane angle YZ Z 57.5', delay: 1500, narration: "Creating a profile plane perpendicular to the path start." },
    { cmd: '/tag_last ProfilePlane', delay: 500 },

    // 3. The Profile (Circle)
    { cmd: '/sketch_on ProfilePlane', delay: 1500, narration: "Sketching the pipe cross-section." },
    { cmd: '/sketch_draw circle 2', delay: 1500 },
    { cmd: '/tag_last PipeProfile', delay: 500 },
    { cmd: '/sketch_off', delay: 500 },

    // 4. Sweep with Thickness
    { cmd: '/sweep_uniform @PipeProfile @S_Path solid thick:0.4', delay: 3000, narration: "Sweeping the profile with a 0.4 unit wall thickness." },
    { cmd: '/tag_last HollowPipe', delay: 500 },

    // 5. Finish
    { cmd: '/setprop @HollowPipe color silver', delay: 500 },
    { cmd: '/setprop @HollowPipe material metal', delay: 500 },
    { cmd: '/view fit', delay: 1000, narration: "S-Pipe complete." }
];
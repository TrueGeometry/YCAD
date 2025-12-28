// commands/sketch_cmds.js
import { initSketchMode, createSketchShape, exitSketchMode } from '../sketch.js';
import { addMessageToChat } from '../ui.js';

export const sketchCommands = {
    '/sketch_on': {
        desc: 'Start 2D Sketch on plane (Plane [Shape] [Params])',
        execute: (argRaw) => {
            // Usage: 
            // 1. /sketch_on XY
            // 2. /sketch_on XY rectangle 10 20
            
            const args = argRaw.trim().split(/\s+/);
            if (args.length === 0 || !args[0]) {
                addMessageToChat('system', 'Usage: /sketch_on [Plane] [Optional: Shape] [Params...]');
                return;
            }

            let planeName = args[0];
            // Support @mention input by stripping the leading @
            if (planeName.startsWith('@')) {
                planeName = planeName.substring(1);
            }

            const shape = args[1]; // optional
            
            // Initialize Mode
            const success = initSketchMode(planeName);
            
            if (success && shape) {
                // If shape provided immediately, create it
                // e.g., rectangle, circle
                const shapeArgs = args.slice(2).map(n => parseFloat(n));
                
                // Map user friendly names to internal types
                let type = shape.toLowerCase();
                if (type === 'rectangle' || type === 'rect') type = 'rect';
                if (type === 'circle' || type === 'circ') type = 'circle';
                
                createSketchShape(type, shapeArgs);
            }
        }
    },
    '/sketch_off': {
        desc: 'Exit Sketch Mode',
        execute: () => {
            exitSketchMode();
        }
    },
    '/sketch_draw': {
        desc: 'Draw shape on active sketch (rect/circle)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const typeRaw = args[0].toLowerCase();
            const shapeArgs = args.slice(1).map(n => parseFloat(n));
            
            let type = typeRaw;
            if (type === 'rectangle' || type === 'rect') type = 'rect';
            if (type === 'circle' || type === 'circ') type = 'circle';

            createSketchShape(type, shapeArgs);
        }
    }
};
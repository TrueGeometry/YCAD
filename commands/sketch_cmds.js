// commands/sketch_cmds.js
import { initSketchMode, createSketchShape, exitSketchMode } from '../sketch.js';
import { addMessageToChat } from '../ui.js';
import { SHAPE_CONFIG } from './primitive_cmds.js';

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
                // Determine if args should be floats or strings based on shape config
                let type = shape.toLowerCase();
                if (type === 'rectangle' || type === 'rect') type = 'rect';
                if (type === 'circle' || type === 'circ') type = 'circle';
                
                let configKey = `sketch_${type}`;
                if (type === 'rect') configKey = 'sketch_rect';
                if (type === 'circle') configKey = 'sketch_circle';
                if (type === 'equation') configKey = 'sketch_equation';

                const config = SHAPE_CONFIG[configKey];
                const rawArgs = args.slice(2);
                const shapeArgs = rawArgs.map((raw, idx) => {
                     // Check if this param defaults to string
                     if (config && config.defaults && typeof config.defaults[idx] === 'string') {
                         return raw; // keep as string (e.g. "5*cos(t)")
                     }
                     return parseFloat(raw);
                });
                
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
            
            let type = typeRaw;
            if (type === 'rectangle' || type === 'rect') type = 'rect';
            if (type === 'circle' || type === 'circ') type = 'circle';
            
            let configKey = `sketch_${type}`;
            if (type === 'rect') configKey = 'sketch_rect';
            if (type === 'circle') configKey = 'sketch_circle';
            if (type === 'equation') configKey = 'sketch_equation';

            const config = SHAPE_CONFIG[configKey];
            const rawArgs = args.slice(1);
            
            const shapeArgs = rawArgs.map((raw, idx) => {
                 if (config && config.defaults && typeof config.defaults[idx] === 'string') {
                     return raw;
                 }
                 return parseFloat(raw);
            });

            createSketchShape(type, shapeArgs);
        }
    }
};
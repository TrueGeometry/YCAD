// commands/origin_cmds.js
import { createOffsetPlane, createOffsetAxis, createRotatedPlane, createRotatedAxis, toggleOrigin } from '../origin.js';
import { addMessageToChat } from '../ui.js';

export const originCommands = {
    '/origin': {
        desc: 'Toggle Origin visibility',
        execute: () => {
            toggleOrigin();
        }
    },
    '/workplane': {
        desc: 'Create plane (offset/angle)',
        execute: (argRaw) => {
            // Clean up arg to allow @mentions or simple names
            const cleanArg = argRaw.replace(/@/g, '').replace(/_/g, ' ');
            const args = cleanArg.split(/\s+/).map(s => s.trim().toLowerCase());
            
            // Sub-commands
            const type = args[0]; // 'offset' or 'angle'

            if (type === 'offset') {
                // /workplane offset [Base] [Dist]
                const base = args[1];
                const dist = args[2] || 10;
                const plane = createOffsetPlane(base, dist); // name cleaning handled in origin.js now more robustly?
                // Actually, origin.js `createOffsetPlane` expects just the name.
                // We passed "base + ' plane'" before, let's rely on findWorkFeature's fuzzy match in origin.js
                // But `createOffsetPlane` in origin.js uses `findWorkFeature` which handles 'xy' -> 'xy plane'.
                // So passing raw arg is better.
                if (plane) {
                    addMessageToChat('system', `Created work plane: ${plane.name}`);
                } else {
                    addMessageToChat('system', `⚠️ Base plane '${base}' not found.`);
                }
            } 
            else if (type === 'angle' || type === 'rotate') {
                // /workplane angle [Base] [Axis] [Angle]
                const base = args[1];
                const axis = args[2];
                const angle = args[3] || 45;
                const plane = createRotatedPlane(base, axis, angle);
                if (plane) {
                     addMessageToChat('system', `Created rotated plane: ${plane.name}`);
                } else {
                     addMessageToChat('system', `⚠️ Could not create plane. Check inputs.`);
                }
            } 
            else {
                 addMessageToChat('system', 'Usage:<br>/workplane offset [Base] [Dist]<br>/workplane angle [Base] [Axis] [Angle]');
            }
        }
    },

    '/workaxis': {
        desc: 'Create axis (offset/angle)',
        execute: (argRaw) => {
             const cleanArg = argRaw.replace(/@/g, '').replace(/_/g, ' ');
             const args = cleanArg.split(/\s+/).map(s => s.trim().toLowerCase());
             
             const type = args[0];

             if (type === 'offset') {
                 // /workaxis offset [Base] [Dir] [Dist]
                 const base = args[1]; 
                 const dir = args[2];  
                 const dist = args[3] || 10;
                 
                 const axis = createOffsetAxis(base, dir, dist);
                 if (axis) {
                     addMessageToChat('system', `Created work axis: ${axis.name}`);
                 } else {
                     addMessageToChat('system', '⚠️ Base axis not found.');
                 }
             } 
             else if (type === 'angle' || type === 'rotate') {
                 // /workaxis angle [Base] [PivotAxis] [Angle]
                 const base = args[1];
                 const pivot = args[2];
                 const angle = args[3] || 45;
                 
                 const axis = createRotatedAxis(base, pivot, angle);
                 if (axis) {
                      addMessageToChat('system', `Created rotated axis: ${axis.name}`);
                 } else {
                      addMessageToChat('system', '⚠️ Could not create axis. Check inputs.');
                 }
             }
             else {
                 addMessageToChat('system', 'Usage:<br>/workaxis offset [Base] [Dir] [Dist]<br>/workaxis angle [Base] [Pivot] [Angle]');
             }
        }
    }
};
// commands/sketch_cmds.js
import * as THREE from 'three';
import { initSketchMode, createSketchShape, exitSketchMode } from '../sketch.js';
import { addMessageToChat } from '../ui.js';
import { SHAPE_CONFIG } from './primitive_cmds.js';
import { resolveTarget } from './utils.js';
import { getTaggableObjects } from '../viewer.js';

// Helper to handle deferred boolean logic
function applySketchBoolean(op, targetRaw, toolRaw) {
    const { object: targetObj, name: targetName } = resolveTarget(targetRaw);
    const { object: toolObj, name: toolName } = resolveTarget(toolRaw);

    if (!targetObj || !toolObj) {
        addMessageToChat('system', `⚠️ Could not resolve one or both sketches.`);
        return;
    }

    if (targetObj === toolObj) {
        addMessageToChat('system', `⚠️ Cannot perform boolean on self.`);
        return;
    }

    // Validate they are sketches with profiles
    if (!targetObj.userData.profile || !toolObj.userData.profile) {
        addMessageToChat('system', `⚠️ Both objects must be valid sketches.`);
        return;
    }

    // Transform Tool Profile into Target's Local Space
    // This allows boolean even if they are separate objects (though usually coplanar)
    targetObj.updateMatrixWorld();
    toolObj.updateMatrixWorld();
    
    const transformMat = new THREE.Matrix4()
        .copy(targetObj.matrixWorld)
        .invert()
        .multiply(toolObj.matrixWorld);

    const newProfile = toolObj.userData.profile.map(p => {
        const vec = new THREE.Vector3(p.x, p.y, 0).applyMatrix4(transformMat);
        return { x: vec.x, y: vec.y }; // Flatten back to 2D
    });

    // Store Operation
    if (!targetObj.userData.sketch_ops) targetObj.userData.sketch_ops = [];
    
    targetObj.userData.sketch_ops.push({
        type: op,
        profile: newProfile,
        name: toolName
    });

    // Hide the tool to reduce visual clutter (simulate consumption)
    toolObj.visible = false;

    addMessageToChat('system', `🔗 <b>Linked ${op.toUpperCase()}</b>: ${toolName} -> ${targetName}.<br><span style="font-size:0.85em; color:gray;">(Result will appear when you /extrude ${targetName})</span>`);
}

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
                if (type === 'rounded_rect' || type === 'rounded') type = 'rounded_rect';
                
                let configKey = `sketch_${type}`;
                if (type === 'rect') configKey = 'sketch_rect';
                if (type === 'rounded_rect') configKey = 'sketch_rounded_rect';
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
        desc: 'Draw shape on active sketch (rect/circle/rounded_rect)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const typeRaw = args[0].toLowerCase();
            
            let type = typeRaw;
            if (type === 'rectangle' || type === 'rect') type = 'rect';
            if (type === 'circle' || type === 'circ') type = 'circle';
            if (type === 'rounded_rect' || type === 'rounded') type = 'rounded_rect';
            
            let configKey = `sketch_${type}`;
            if (type === 'rect') configKey = 'sketch_rect';
            if (type === 'rounded_rect') configKey = 'sketch_rounded_rect';
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
    },
    
    // --- Sketch Booleans (Deferred) ---
    '/sketch_union': {
        desc: 'Union Sketch B into A (@A @B)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            if (args.length < 2) { addMessageToChat('system', 'Usage: /sketch_union @Target @Tool'); return; }
            applySketchBoolean('union', args[0], args[1]);
        }
    },
    '/sketch_subtract': {
        desc: 'Subtract Sketch B from A (@A @B)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            if (args.length < 2) { addMessageToChat('system', 'Usage: /sketch_subtract @Target @Tool'); return; }
            applySketchBoolean('subtract', args[0], args[1]);
        }
    },
    '/sketch_intersect': {
        desc: 'Intersect Sketch A and B (@A @B)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            if (args.length < 2) { addMessageToChat('system', 'Usage: /sketch_intersect @Target @Tool'); return; }
            applySketchBoolean('intersect', args[0], args[1]);
        }
    }
};
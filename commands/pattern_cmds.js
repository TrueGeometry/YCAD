// commands/pattern_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { updateFeatureTree } from '../tree.js';
import { resolveTarget } from './utils.js';
import { getTaggableObjects } from '../viewer.js';

export const patternCommands = {
    '/pattern': {
        desc: 'Create patterns (rect/circ)',
        execute: (argRaw, cmdString) => {
            // Attempt to resolve target if @mention is present
            const { object, name } = resolveTarget(argRaw);
            
            // Clean args: remove the @mention part - updated regex for dots
            const cleanArgs = argRaw.replace(/@[\w\d_.-]+/, '').trim();
            const args = cleanArgs.split(/\s+/).map(s => s.trim().toLowerCase());
            
            const type = args[0];
            const target = object;

            if (!target) {
                 addMessageToChat('system', '⚠️ Select an object or mention one (@Name) to pattern.');
                 return;
            }
            
            const baseName = target.userData.filename || target.name || 'Obj';

            if (type === 'rect' || type === 'rectangular') {
                // /pattern rect <cols> <rows> <dx> <dy>
                const cols = parseInt(args[1]) || 2;
                const rows = parseInt(args[2]) || 1;
                const dx = parseFloat(args[3]) || 5;
                const dy = parseFloat(args[4]) || 5;

                let created = 0;
                const startX = target.position.x;
                const startY = target.position.y;
                
                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        if (i === 0 && j === 0) continue; // Skip original
                        
                        const clone = target.clone();
                        clone.position.set(
                            startX + (i * dx),
                            startY, // Keep Y same
                            target.position.z + (j * dy) // Map 2nd dim to Z
                        );
                        
                        clone.name = `${baseName}_${i}_${j}`;
                        clone.userData.filename = clone.name;
                        clone.userData.cmd = cmdString; // Set pattern command
                        appState.scene.add(clone);
                        created++;
                    }
                }
                addMessageToChat('system', `Created ${created} copies of <b>${name}</b> in ${cols}x${rows} Rectangular Pattern.`);
                updateFeatureTree();

            } else if (type === 'circ' || type === 'circular') {
                // /pattern circ <count> <angle> <axis>
                const count = parseInt(args[1]) || 4;
                const angleTotal = parseFloat(args[2]) || 360;
                const axisStr = args[3] || 'y';
                
                let axisVec = new THREE.Vector3(0, 1, 0); // Default Y
                let pivot = new THREE.Vector3(0, 0, 0);   // Default Origin
                
                // 1. Check for standard global axes
                if (['x', 'y', 'z'].includes(axisStr.toLowerCase())) {
                    if (axisStr === 'x') axisVec.set(1, 0, 0);
                    if (axisStr === 'y') axisVec.set(0, 1, 0);
                    if (axisStr === 'z') axisVec.set(0, 0, 1);
                } else {
                    // 2. Try to resolve custom Work Axis
                    // Handle underscores as spaces for multi-word names (e.g. X_Axis_Offset_Y5)
                    const searchName = axisStr.replace(/_/g, ' ').toLowerCase();
                    const taggables = getTaggableObjects();
                    
                    const found = taggables.find(t => 
                        t.name.replace(/_/g, ' ').toLowerCase() === searchName || 
                        t.object.name.toLowerCase() === searchName
                    );
                    
                    if (found && found.object.userData.type === 'WorkAxis') {
                         const obj = found.object;
                         
                         // Calculate Vector from geometry (Start to End)
                         const posAttr = obj.geometry.attributes.position;
                         const p0 = new THREE.Vector3().fromBufferAttribute(posAttr, 0).applyMatrix4(obj.matrixWorld);
                         const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, 1).applyMatrix4(obj.matrixWorld);
                         axisVec.subVectors(p1, p0).normalize();
                         
                         // Pivot is the origin of the axis (object position)
                         pivot.copy(obj.position);
                         
                         addMessageToChat('system', `Patterning around Work Axis: ${found.object.name}`);
                    } else {
                        addMessageToChat('system', `⚠️ Axis '${axisStr}' not found. Defaulting to Global Y.`);
                    }
                }

                const angleStep = THREE.MathUtils.degToRad(angleTotal) / count; 
                const startPos = target.position.clone();
                let created = 0;

                for (let i = 1; i < count; i++) {
                    const clone = target.clone();
                    const currentAngle = i * angleStep;
                    
                    // Rotate position around pivot
                    const posRel = startPos.clone().sub(pivot);
                    posRel.applyAxisAngle(axisVec, currentAngle);
                    clone.position.copy(pivot).add(posRel);
                    
                    // Rotate orientation
                    clone.rotateOnWorldAxis(axisVec, currentAngle);
                    
                    clone.name = `${baseName}_c${i}`;
                    clone.userData.filename = clone.name;
                    clone.userData.cmd = cmdString; // Set pattern command
                    appState.scene.add(clone);
                    created++;
                }
                addMessageToChat('system', `Created ${created} copies of <b>${name}</b> in Circular Pattern.`);
                updateFeatureTree();

            } else {
                 addMessageToChat('system', `
                    Usage:<br>
                    <b>/pattern rect [cols] [rows] [dX] [dZ]</b><br>
                    <b>/pattern circ [count] [angle] [axis]</b>
                 `);
            }
        }
    }
};
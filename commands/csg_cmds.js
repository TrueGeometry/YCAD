// commands/csg_cmds.js
import * as THREE from 'three';
import { CSG } from '../csg_lib.js';
import { appState } from '../state.js';
import { addMessageToChat, toggleLoading } from '../ui.js';
import { resolveTarget } from './utils.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree, deleteObject } from '../tree.js';
import { getTaggableObjects } from '../viewer.js';

export const csgCommands = {
    '/extrude': {
        desc: 'Extrude 2D Sketch to 3D (@Sketch height)',
        execute: async (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            
            // Parse height from args
            const args = argRaw.split(/\s+/);
            const heightVal = parseFloat(args.find(a => !isNaN(parseFloat(a)) && !a.startsWith('@'))) || 5.0;

            if (!object) {
                addMessageToChat('system', '⚠️ Please select or mention a sketch object to extrude.');
                return;
            }

            // Check if it has profile data (Polyline, Rect, Circle created in Sketch Mode)
            if (!object.userData.profile || !Array.isArray(object.userData.profile)) {
                addMessageToChat('system', `⚠️ Object '${name}' is not a valid 2D sketch for extrusion.`);
                return;
            }

            if (!object.userData.closed) {
                 addMessageToChat('system', `⚠️ Cannot extrude open polyline. Please close the sketch.`);
                 return;
            }

            addMessageToChat('system', `Extruding ${name} by ${heightVal} units...`);

            // Create Shape
            const shape = new THREE.Shape(object.userData.profile);
            
            // Extrude Settings
            const extrudeSettings = {
                depth: heightVal,
                bevelEnabled: false,
                steps: 1
            };

            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            // Material
            const material = new THREE.MeshStandardMaterial({
                color: 0x6366f1, // Indigo
                roughness: 0.5,
                metalness: 0.1,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `Extrude_${name}`;
            mesh.userData.filename = mesh.name;
            
            // MARK AS PARAMETRIC EXTRUSION
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = 'extrusion';
            mesh.userData.height = heightVal;
            // Copy profile points (clone to ensure independence)
            mesh.userData.profile = object.userData.profile.map(p => ({ x: p.x, y: p.y }));

            // Transform: Match Sketch Group Transform
            // The geometry is created in local XY plane. We need to move it to the sketch's world transform.
            const parent = object.parent;
            if (parent && parent.userData.type === 'Sketch') {
                mesh.position.copy(parent.position);
                mesh.quaternion.copy(parent.quaternion);
                mesh.scale.copy(parent.scale);
            } else {
                mesh.position.copy(object.position);
                mesh.quaternion.copy(object.quaternion);
            }

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            appState.scene.add(mesh);
            
            // Optionally hide sketch
            // object.visible = false; 

            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            
            addMessageToChat('system', `Created 3D Extrusion. Height: ${heightVal}`);
        }
    },

    '/subtract': {
        desc: 'Boolean Subtract (@Target @Tool1 ...)',
        execute: async (argRaw) => {
            await performBoolean('subtract', argRaw);
        }
    },

    '/union': {
        desc: 'Boolean Union (@Obj1 @Obj2 ...)',
        execute: async (argRaw) => {
            await performBoolean('union', argRaw);
        }
    },

    '/union_all': {
        desc: 'Union ALL visible meshes in scene',
        execute: async () => {
             // Gather all valid meshes using a custom traversal that respects visibility hierarchy
             const allMeshes = [];

             const traverseVisible = (object) => {
                 // Stop if this object is hidden (excludes entire branch)
                 if (!object.visible) return;

                 // System filters at Group/Object level
                 if (object.name === 'GridHelper' || object.name === 'Origin' || object.name === 'Work Features') return;
                 if (object.type.includes('Control')) return;

                 if (object.isMesh) {
                     // Mesh-specific filters
                     const isSystem = object.type.includes('Helper') || 
                                      (object.userData && object.userData.type?.startsWith('Work')) ||
                                      (object.parent && (object.parent.name === 'Origin' || object.parent.name === 'Work Features'));
                     
                     if (!isSystem) {
                         allMeshes.push(object);
                     }
                 }
                 
                 // Recurse children
                 if (object.children) {
                     for (let i = 0; i < object.children.length; i++) {
                         traverseVisible(object.children[i]);
                     }
                 }
             };

             // Start traversal from scene
             traverseVisible(appState.scene);

             if (allMeshes.length < 2) {
                 addMessageToChat('system', `⚠️ Need at least 2 visible meshes to union (Found ${allMeshes.length}).`);
                 return;
             }
             
             addMessageToChat('system', `Found ${allMeshes.length} visible meshes. Performing global Union...`);
             await performBoolean('union', '', allMeshes);
        }
    },

    '/intersect': {
        desc: 'Boolean Intersect (@Obj1 @Obj2 ...)',
        execute: async (argRaw) => {
            await performBoolean('intersect', argRaw);
        }
    }
};

async function performBoolean(op, argRaw, explicitObjects = null) {
    let resolvedObjects = [];
    
    if (explicitObjects) {
        resolvedObjects = explicitObjects;
    } else {
        // 1. Resolve Targets - support multiple inputs
        // Extract all mentions (e.g. @Cube @Sphere @Cylinder)
        const mentions = argRaw.match(/@([\w\d_.-]+)/g);
        
        if (!mentions || mentions.length < 2) {
            addMessageToChat('system', `Usage: /${op} @Obj1 @Obj2 ... (requires at least 2 objects)`);
            return;
        }

        const allObjects = getTaggableObjects();
        const seenUUIDs = new Set();
        const missing = [];

        // Map mentions to actual objects
        for (const mention of mentions) {
            const searchName = mention.substring(1).toLowerCase(); // remove @
            // Find exact match first
            const match = allObjects.find(o => o.name.toLowerCase() === searchName);
            
            if (match) {
                if (!seenUUIDs.has(match.object.uuid)) {
                    resolvedObjects.push(match.object);
                    seenUUIDs.add(match.object.uuid);
                }
            } else {
                missing.push(mention);
            }
        }

        if (missing.length > 0) {
            addMessageToChat('system', `⚠️ Could not find: ${missing.join(', ')}`);
            return;
        }
    }

    if (resolvedObjects.length < 2) {
        addMessageToChat('system', '⚠️ Need at least 2 valid distinct objects for boolean operation.');
        return;
    }

    // Validate Meshes
    if (resolvedObjects.some(o => !o.isMesh)) {
         addMessageToChat('system', '⚠️ Boolean operations only work on Meshes.');
         return;
    }

    toggleLoading(true);
    addMessageToChat('system', `Computing ${op.toUpperCase()} of ${resolvedObjects.length} objects...`);

    // Allow UI to render loading state
    await new Promise(r => setTimeout(r, 50));

    try {
        // Start with the first object
        let currentCSG = CSG.fromMesh(resolvedObjects[0]);
        
        // Iterate through the rest
        for (let i = 1; i < resolvedObjects.length; i++) {
            const nextObj = resolvedObjects[i];
            const nextCSG = CSG.fromMesh(nextObj);

            if (op === 'subtract') {
                // Target - Tool1 - Tool2 ...
                currentCSG = currentCSG.subtract(nextCSG);
            }
            else if (op === 'union') {
                // A + B + C ...
                currentCSG = currentCSG.union(nextCSG);
            }
            else if (op === 'intersect') {
                // A intersect B intersect C ...
                currentCSG = currentCSG.intersect(nextCSG);
            }
        }

        const baseObj = resolvedObjects[0];
        const resultMesh = currentCSG.toMesh(baseObj.material.clone());
        
        // Construct a name
        const baseName = resolvedObjects[0].name.replace(/_/g, '');
        let newName = `${op}_${baseName}`;
        if (resolvedObjects.length > 2) {
            newName += `_and_${resolvedObjects.length - 1}_others`;
        } else {
            const secondName = resolvedObjects[1].name.replace(/_/g, '');
            newName += `_${secondName}`;
        }
        
        // Enforce safe filename characters
        newName = newName.replace(/\s+/g, '_');
        resultMesh.name = newName;
        resultMesh.userData.filename = resultMesh.name;
        
        // Cleanup originals
        resolvedObjects.forEach(obj => deleteObject(obj));

        appState.scene.add(resultMesh);
        appState.currentDisplayObject = resultMesh;
        attachTransformControls(resultMesh);
        updateFeatureTree();

        addMessageToChat('system', `Boolean ${op} successful.`);

    } catch (e) {
        console.error(e);
        addMessageToChat('system', `⚠️ Boolean operation failed: ${e.message}`);
    } finally {
        toggleLoading(false);
    }
}
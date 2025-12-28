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
        desc: 'Boolean Subtract (@Target @Tool)',
        execute: async (argRaw) => {
            await performBoolean('subtract', argRaw);
        }
    },

    '/union': {
        desc: 'Boolean Union (@Obj1 @Obj2)',
        execute: async (argRaw) => {
            await performBoolean('union', argRaw);
        }
    },

    '/intersect': {
        desc: 'Boolean Intersect (@Obj1 @Obj2)',
        execute: async (argRaw) => {
            await performBoolean('intersect', argRaw);
        }
    }
};

async function performBoolean(op, argRaw) {
    // 1. Resolve Targets
    // Updated Regex: include . for file extensions
    const mentions = argRaw.match(/@([\w\d_.-]+)/g);
    const objects = getTaggableObjects();
    
    let targetObj = null; // The object being cut (or A)
    let toolObj = null;   // The cutter (or B)

    if (mentions && mentions.length >= 2) {
        // Case: /subtract @Cube @Cylinder
        const match1 = objects.find(o => '@' + o.name.toLowerCase() === mentions[0].toLowerCase());
        const match2 = objects.find(o => '@' + o.name.toLowerCase() === mentions[1].toLowerCase());
        if (match1) targetObj = match1.object;
        if (match2) toolObj = match2.object;
    } else {
        // Case: Select one, mention other, or simple selection assumption not safe for booleans
        addMessageToChat('system', 'Usage: /' + op + ' @Target @Tool');
        return;
    }

    if (!targetObj || !toolObj) {
        addMessageToChat('system', '⚠️ Could not find both objects. Ensure names match exactly.');
        return;
    }

    if (!targetObj.isMesh || !toolObj.isMesh) {
         addMessageToChat('system', '⚠️ Boolean operations only work on Meshes.');
         return;
    }

    toggleLoading(true);
    addMessageToChat('system', `Computing ${op.toUpperCase()}... (This may take a moment)`);

    // Allow UI to render loading state
    await new Promise(r => setTimeout(r, 50));

    try {
        const csgA = CSG.fromMesh(targetObj);
        const csgB = CSG.fromMesh(toolObj);
        let resultCSG;

        if (op === 'subtract') resultCSG = csgA.subtract(csgB);
        else if (op === 'union') resultCSG = csgA.union(csgB);
        else if (op === 'intersect') resultCSG = csgA.intersect(csgB);

        const resultMesh = resultCSG.toMesh(targetObj.material.clone());
        resultMesh.name = `${op}_${targetObj.name}_${toolObj.name}`;
        resultMesh.userData.filename = resultMesh.name;
        
        // Remove operands
        deleteObject(targetObj);
        deleteObject(toolObj);

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
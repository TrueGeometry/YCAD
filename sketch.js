// sketch.js
// Handles 2D sketching on 3D planes (Sketch Mode).

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { findWorkFeature } from './origin.js';
import { updateFeatureTree } from './tree.js';
import { attachTransformControls, setCameraView, fitGeometryView } from './viewer.js';
import { SHAPE_CONFIG } from './commands/primitive_cmds.js';

let sketchState = {
    isActive: false,
    plane: null,
    gridHelper: null,
    sketchGroup: null // The active sketch group being edited
};

export function isSketchMode() {
    return sketchState.isActive;
}

export function initSketchMode(planeName) {
    if (sketchState.isActive) exitSketchMode();

    const plane = findWorkFeature(planeName);
    if (!plane) {
        addMessageToChat('system', `⚠️ Sketch Error: Plane '${planeName}' not found.`);
        return false;
    }

    sketchState.isActive = true;
    sketchState.plane = plane;

    // 1. Create a Sketch Group aligned to this plane
    // The group sits at the plane's position and rotation, so children (lines) are drawn in local XY space.
    const group = new THREE.Group();
    group.name = `Sketch_${plane.name.replace(/\s+/g, '')}_${Date.now().toString().slice(-4)}`;
    group.userData.type = 'Sketch';
    group.userData.planeRef = plane.name;
    
    // Copy Plane Transform
    group.position.copy(plane.position);
    group.quaternion.copy(plane.quaternion);
    
    appState.scene.add(group);
    sketchState.sketchGroup = group;

    // 2. Create Visual Grid Helper for Sketch Context
    const size = 20;
    const divisions = 20;
    const grid = new THREE.GridHelper(size, divisions, 0x00ff00, 0x004400);
    
    // GridHelper is XZ by default. We need it to match the plane's local space (XY usually).
    // WorkPlanes in origin.js are PlaneGeometry.
    // If WorkPlane is XZ, its normal is Y. 
    // We want the grid to lie ON the plane.
    
    // We simply add the grid to the group. Since group matches plane, we just need to rotate grid to match group's local system.
    // WorkPlanes from origin.js:
    // XY Plane (Z normal): default PlaneGeo (XY).
    // GridHelper (XZ). 
    grid.rotation.x = Math.PI / 2; // Rotate Grid to be XY
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    grid.material.depthWrite = false;
    
    group.add(grid);
    sketchState.gridHelper = grid;

    // 3. Align Camera for better view (Look at plane)
    alignCameraToSketch(group);
    
    // 4. Lock View Rotation (Orthogonal Constraint)
    if (appState.controls) {
        appState.controls.enableRotate = false;
        // Ensure damping doesn't drift the view away after locking
        appState.controls.update(); 
    }

    // 5. Show Sketch Controls Panel
    const sketchControls = document.getElementById('sketch-controls');
    if (sketchControls) {
        sketchControls.style.display = 'block';
        if (window.lucide) window.lucide.createIcons({ root: sketchControls });
    }

    addMessageToChat('system', `✏️ <b>Sketch Mode</b> active on ${plane.name}. View Locked.`);
    updateFeatureTree();
    
    return true;
}

export function createSketchShape(type, args) {
    if (!sketchState.isActive || !sketchState.sketchGroup) {
        // Fallback: If not in sketch mode but user types command, try to init on default XY
        if (initSketchMode('XY Plane')) {
            // Proceed
        } else {
            return;
        }
    }

    const configKey = `sketch_${type}`; // e.g., sketch_rect
    const config = SHAPE_CONFIG[configKey];
    
    if (!config) {
        addMessageToChat('system', `⚠️ Unknown sketch shape: ${type}`);
        return;
    }

    // Parse parameters
    const params = {};
    config.keys.forEach((key, index) => {
        params[key] = (args[index] !== undefined && !isNaN(args[index])) 
                      ? args[index] 
                      : config.defaults[index];
    });

    // Generate Geometry (BufferGeometry of lines)
    const geometry = config.factory(params);
    
    // Create Line Object
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const lineObj = new THREE.LineLoop(geometry, material); // LineLoop closes the shape
    
    lineObj.name = `Sketch${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    // Setup Parametric Data
    lineObj.userData.isParametric = true;
    lineObj.userData.shapeType = configKey;
    Object.assign(lineObj.userData, params);

    // Add to Active Sketch Group
    sketchState.sketchGroup.add(lineObj);
    
    // Select it
    appState.currentDisplayObject = lineObj;
    attachTransformControls(lineObj);
    updateFeatureTree();

    addMessageToChat('system', `Created 2D ${type} on sketch plane.`);
}

export function exitSketchMode() {
    if (!sketchState.isActive) return;

    if (sketchState.sketchGroup && sketchState.gridHelper) {
        // Remove the temporary grid helper from the group so it doesn't stay in the model forever
        sketchState.sketchGroup.remove(sketchState.gridHelper);
        if(sketchState.gridHelper.geometry) sketchState.gridHelper.geometry.dispose();
    }
    
    // Hide Sketch Controls Panel
    const sketchControls = document.getElementById('sketch-controls');
    if (sketchControls) {
        sketchControls.style.display = 'none';
    }
    
    // Unlock View Rotation
    if (appState.controls) {
        appState.controls.enableRotate = true;
        addMessageToChat('system', 'View unlocked.');
    }

    sketchState.isActive = false;
    sketchState.plane = null;
    sketchState.gridHelper = null;
    sketchState.sketchGroup = null;

    addMessageToChat('system', 'Sketch Mode exited.');
}

function alignCameraToSketch(group) {
    if (!appState.camera || !appState.controls) return;

    // Move camera to look at the center of the sketch group along its normal
    const center = group.position.clone();
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion).normalize();
    const distance = 20;
    
    const newPos = center.clone().add(normal.multiplyScalar(distance));
    
    // Update Camera
    appState.controls.target.copy(center);
    appState.camera.position.copy(newPos);
    
    // Ensure UP vector is aligned with Plane's Y for intuitive drafting
    // Plane (Group) Local Y axis in World Space:
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion).normalize();
    appState.camera.up.copy(upVec);
    
    appState.camera.lookAt(center);
    appState.camera.updateProjectionMatrix();
    appState.controls.update();
}
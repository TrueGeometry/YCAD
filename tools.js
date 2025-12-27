// tools.js
// Measurement, Wireframe, and Bounding Box tools.

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { attachTransformControls } from './viewer.js';
import { highlightInTree } from './tree.js'; // Import selection sync

const measureLabel = document.getElementById('measure-label');
const designCanvas = document.getElementById('design-canvas');

let currentTool = null;
let isWireframe = false;
let boundsHelper = null;
let measurementPoints = [];
let measurementMarkers = [];
let measurementLines = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function toggleTool(toolName) {
    if (currentTool === toolName) {
        deactivateTools();
        return;
    }
    deactivateTools();
    currentTool = toolName;
    
    // Disable Transform gizmo when measuring
    attachTransformControls(null);
    
    if (toolName === 'distance') {
        document.getElementById('measure-btn').classList.add('active-mode');
        measureLabel.textContent = "Click start point...";
        addMessageToChat('system', 'Distance Mode: Click two points on the model.');
    } else if (toolName === 'angle') {
        document.getElementById('angle-btn').classList.add('active-mode');
        measureLabel.textContent = "Click center point (vertex)...";
        addMessageToChat('system', 'Angle Mode: Click 3 points (Vertex, then two endpoints).');
    }
    
    designCanvas.style.cursor = 'crosshair';
    measureLabel.classList.add('visible');
}

export function deactivateTools() {
    currentTool = null;
    document.getElementById('measure-btn').classList.remove('active-mode');
    document.getElementById('angle-btn').classList.remove('active-mode');
    designCanvas.style.cursor = 'default';
    measureLabel.classList.remove('visible');
    
    measurementMarkers.forEach(marker => appState.scene.remove(marker));
    measurementMarkers = [];
    measurementLines.forEach(line => {
         appState.scene.remove(line);
         if (line.geometry) line.geometry.dispose();
    });
    measurementLines = [];
    measurementPoints = [];
    
    // Re-attach gizmo to current object if it exists
    if (appState.selectedObject) {
        attachTransformControls(appState.selectedObject);
    }
}

export function toggleWireframe() {
    if (!appState.scene) return;
    isWireframe = !isWireframe;
    appState.scene.traverse((child) => {
        if (child.isMesh) child.material.wireframe = isWireframe;
    });
    document.getElementById('wireframe-btn').classList.toggle('active-mode', isWireframe);
}

export function resetWireframe() {
    isWireframe = false;
    document.getElementById('wireframe-btn').classList.remove('active-mode');
}

export function toggleBoundingBox() {
    const target = appState.selectedObject || appState.currentDisplayObject;
    if (!target) return;

    if (boundsHelper) {
        appState.scene.remove(boundsHelper);
        boundsHelper = null;
        document.getElementById('bounds-btn').classList.remove('active-mode');
        addMessageToChat('system', 'Bounding Box hidden.');
        return;
    }
    const box = new THREE.Box3().setFromObject(target);
    boundsHelper = new THREE.Box3Helper(box, 0xffff00);
    appState.scene.add(boundsHelper);
    document.getElementById('bounds-btn').classList.add('active-mode');
    
    const size = new THREE.Vector3();
    box.getSize(size);
    addMessageToChat('system', `Bounds: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
}

export function resetBounds() {
     if (boundsHelper) {
        appState.scene.remove(boundsHelper);
        boundsHelper = null;
        document.getElementById('bounds-btn').classList.remove('active-mode');
    }
}

export function onCanvasClick(event) {
    if (!appState.camera || !appState.scene) return;
    const rect = designCanvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, appState.camera);
    
    // If a tool is active, perform tool logic
    if (currentTool) {
        const intersects = raycaster.intersectObjects(appState.scene.children, true);
        if (intersects.length > 0) {
            const hit = intersects.find(i => i.object.type === 'Mesh' && i.object.visible);
            if (hit) {
                if (currentTool === 'distance') handleDistanceClick(hit.point);
                if (currentTool === 'angle') handleAngleClick(hit.point);
            }
        }
    } else {
        // Selection Logic
        const intersects = raycaster.intersectObjects(appState.scene.children, true);
        
        const hit = intersects.find(i => {
            let obj = i.object;
            
            // 1. Work Features (Plane/Axis/Point) are always selectable
            if (obj.userData && (obj.userData.type === 'WorkPlane' || obj.userData.type === 'WorkAxis' || obj.userData.type === 'WorkPoint')) {
                 return true;
            }

            // 2. Traverse up to find a valid Root Object (Model, Pattern Clone, etc.)
            while(obj) {
                // Check if we hit the Scene root (meaning `obj` is a direct child of Scene)
                if (obj.parent && obj.parent.type === 'Scene') {
                     // Filter out system helpers
                     const n = obj.name || '';
                     const t = obj.type || '';
                     
                     if (n === 'GridHelper' || n === 'Origin' || n === 'Work Features') return false;
                     if (t === 'TransformControls') return false;
                     if (t.includes('Light')) return false;
                     if (t.includes('Helper')) return false;
                     if (t.includes('Camera')) return false;
                     
                     return true; // Valid user object
                }
                
                // Don't select the gizmo parts
                if (obj.type === 'TransformControlsPlane' || obj.type === 'TransformControlsGizmo') return false; 
                
                obj = obj.parent;
            }
            return false;
        });

        if (hit) {
            let target = hit.object;
            
            // Determine the "selectable root" for this hit
            
            // Check if it belongs to a user Model/Group
            let p = target;
            let modelRoot = null;
            while(p && p.parent) {
                if (p.parent.type === 'Scene') {
                     const n = p.name || '';
                     // Ensure it's not a system group
                     if (n !== 'Origin' && n !== 'Work Features' && !p.type.includes('Helper') && !p.type.includes('Control')) {
                         modelRoot = p;
                     }
                     break;
                }
                p = p.parent;
            }

            if (modelRoot) {
                target = modelRoot;
            } else {
                // If no model root found (e.g. Work Feature inside group), traverse up to the Group child.
                let curr = hit.object;
                while (curr.parent && curr.parent.name !== 'Origin' && curr.parent.name !== 'Work Features' && curr.parent.type !== 'Scene') {
                    curr = curr.parent;
                }
                target = curr;
            }
            
            attachTransformControls(target);
            appState.currentDisplayObject = target; // Update "Active" object
            appState.selectedObject = target;       // Update "Selected" object explicitly
            highlightInTree(target);
            
        } else {
            // Clicked empty space: Deselect All
            attachTransformControls(null);
            appState.selectedObject = null;
            // Note: We keep currentDisplayObject as the last loaded model context if needed, 
            // but for editing commands relying on selection, selectedObject being null handles safety.
            highlightInTree(null);
        }
    }
}

// Allow programmatic input for automated testing
export function addMeasurementPoint(point) {
    if (currentTool === 'distance') handleDistanceClick(point);
    else if (currentTool === 'angle') handleAngleClick(point);
}

function createMarker(point, color = 0xff0000) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshBasicMaterial({ color: color }));
    marker.position.copy(point);
    appState.scene.add(marker);
    measurementMarkers.push(marker);
}

function createLine(p1, p2, color = 0xff0000) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), new THREE.LineBasicMaterial({ color: color, linewidth: 2 }));
    appState.scene.add(line);
    measurementLines.push(line);
}

function handleDistanceClick(point) {
    if (measurementPoints.length === 2) deactivateTools();
    if (measurementPoints.length === 2) { 
        measurementPoints = []; 
        measurementMarkers.forEach(m=>appState.scene.remove(m)); 
        measurementMarkers=[]; 
        measurementLines.forEach(l=>appState.scene.remove(l)); 
        measurementLines=[];
    }

    measurementPoints.push(point);
    createMarker(point);

    if (measurementPoints.length === 1) {
        measureLabel.textContent = "Click end point...";
    } else if (measurementPoints.length === 2) {
        const p1 = measurementPoints[0];
        const p2 = measurementPoints[1];
        createLine(p1, p2);
        const dist = p1.distanceTo(p2).toFixed(3);
        measureLabel.textContent = `Distance: ${dist}`;
        addMessageToChat('system', `Measured Distance: ${dist}`);
    }
}

function handleAngleClick(point) {
    if (measurementPoints.length === 3) { 
        measurementPoints = []; 
        measurementMarkers.forEach(m=>appState.scene.remove(m)); 
        measurementMarkers=[]; 
        measurementLines.forEach(l=>appState.scene.remove(l)); 
        measurementLines=[]; 
    }
    measurementPoints.push(point);
    createMarker(point, measurementPoints.length === 1 ? 0xffff00 : 0xff0000);

    if (measurementPoints.length === 1) measureLabel.textContent = "Click first arm point...";
    else if (measurementPoints.length === 2) {
        measureLabel.textContent = "Click second arm point...";
        createLine(measurementPoints[0], measurementPoints[1]);
    } else if (measurementPoints.length === 3) {
        const [v, p1, p2] = measurementPoints;
        createLine(v, p2);
        const v1 = new THREE.Vector3().subVectors(p1, v).normalize();
        const v2 = new THREE.Vector3().subVectors(p2, v).normalize();
        const angle = THREE.MathUtils.radToDeg(v1.angleTo(v2)).toFixed(2);
        measureLabel.textContent = `Angle: ${angle}°`;
        addMessageToChat('system', `Measured Angle: ${angle}°`);
    }
}
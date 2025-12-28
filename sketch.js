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
    sketchGroup: null, // The active sketch group being edited
    // Polyline Tool State
    isDrawing: false,
    drawPoints: [], // THREE.Vector3 array (local coordinates)
    drawMarkers: [], // Visual dots
    tempLine: null, // The line connecting committed points
    cursorLine: null, // The rubber-band line
    autoClose: false // Read from UI
};

export function isSketchMode() {
    return sketchState.isActive;
}

export function isSketchDrawing() {
    return sketchState.isDrawing;
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
    const group = new THREE.Group();
    group.name = `Sketch_${plane.name.replace(/\s+/g, '')}_${Date.now().toString().slice(-4)}`;
    group.userData.type = 'Sketch';
    group.userData.planeRef = plane.name;
    
    // Copy Plane Transform
    group.position.copy(plane.position);
    group.quaternion.copy(plane.quaternion);
    
    appState.scene.add(group);
    sketchState.sketchGroup = group;

    // 2. Create Visual Grid Helper
    const size = 20;
    const divisions = 20;
    const grid = new THREE.GridHelper(size, divisions, 0x00ff00, 0x004400);
    grid.rotation.x = Math.PI / 2; // Rotate Grid to be XY
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    grid.material.depthWrite = false;
    
    group.add(grid);
    sketchState.gridHelper = grid;

    // 3. Align Camera
    alignCameraToSketch(group);
    
    // 4. Lock View Rotation
    if (appState.controls) {
        appState.controls.enableRotate = false;
        appState.controls.update(); 
    }

    // 5. Show Sketch Controls Panel
    const sketchControls = document.getElementById('sketch-controls');
    if (sketchControls) {
        sketchControls.style.display = 'block';
        if (window.lucide) window.lucide.createIcons({ root: sketchControls });
    }

    // Sync Auto-Close State
    const acCheckbox = document.getElementById('sketch-autoclose');
    if (acCheckbox) {
        sketchState.autoClose = acCheckbox.checked;
        acCheckbox.onchange = (e) => sketchState.autoClose = e.target.checked;
    }

    addMessageToChat('system', `✏️ <b>Sketch Mode</b> active on ${plane.name}. View Locked.`);
    updateFeatureTree();
    
    return true;
}

export function promptForEquation() {
    if (!sketchState.isActive) return;

    // Use a simple prompt for now to keep vanilla UI simple
    const input = prompt(
        "Enter Parametric Equations for X(t) and Y(t)\nFormat: xEq, yEq, minT, maxT\nExample: 5*cos(t), 5*sin(t), 0, 6.28", 
        "5 * cos(t), 5 * sin(t), 0, 6.28"
    );

    if (input) {
        const parts = input.split(',').map(s => s.trim());
        if (parts.length >= 2) {
            const xEq = parts[0];
            const yEq = parts[1];
            const minT = parseFloat(parts[2]) || 0;
            const maxT = parseFloat(parts[3]) || 6.28;
            
            createSketchShape('equation', [xEq, yEq, minT, maxT, 100]);
        } else {
            addMessageToChat('system', '⚠️ Invalid format. Use: x(t), y(t), min, max');
        }
    }
}

// --- Manual Polyline Drawing ---

export function togglePolylineTool() {
    if (!sketchState.isActive) return;
    
    if (sketchState.isDrawing) {
        // Cancel if already drawing
        cancelPolylineDraw();
        document.getElementById('sketch-poly-btn').classList.remove('active-mode');
        addMessageToChat('system', 'Polyline tool cancelled.');
    } else {
        sketchState.isDrawing = true;
        sketchState.drawPoints = [];
        document.getElementById('sketch-poly-btn').classList.add('active-mode');
        addMessageToChat('system', 'Polyline Tool: Click points on grid. Double-click or press OK to finish.');
    }
}

// Called from tools.js/events.js when canvas is clicked in sketch mode
export function onSketchClick(event, raycaster) {
    if (!sketchState.isDrawing || !sketchState.sketchGroup) return;

    // Raycast against the Sketch Plane
    // We create a mathematical plane matching the sketch group's transform
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(sketchState.sketchGroup.quaternion);
    const planeConst = -sketchState.sketchGroup.position.dot(normal);
    const mathPlane = new THREE.Plane(normal, planeConst);

    const target = new THREE.Vector3();
    const intersect = raycaster.ray.intersectPlane(mathPlane, target);

    if (intersect) {
        // Convert World Point to Local Point inside sketch group
        const localPoint = target.clone();
        sketchState.sketchGroup.worldToLocal(localPoint);
        // Flatten Z (should be 0 anyway if on plane, but ensure it)
        localPoint.z = 0;

        addPolylinePoint(localPoint);
    }
}

// Called from events.js on mouse move
export function onSketchMove(event, raycaster) {
    if (!sketchState.isDrawing || sketchState.drawPoints.length === 0) return;

    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(sketchState.sketchGroup.quaternion);
    const planeConst = -sketchState.sketchGroup.position.dot(normal);
    const mathPlane = new THREE.Plane(normal, planeConst);
    const target = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(mathPlane, target)) {
        const localPoint = target.clone();
        sketchState.sketchGroup.worldToLocal(localPoint);
        localPoint.z = 0;
        
        updateCursorLine(localPoint);
    }
}

function addPolylinePoint(point) {
    sketchState.drawPoints.push(point);

    // Visual Marker
    const markerGeo = new THREE.CircleGeometry(0.15, 12);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(point);
    sketchState.sketchGroup.add(marker);
    sketchState.drawMarkers.push(marker);

    // Update committed line visual
    if (sketchState.drawPoints.length > 1) {
        if (sketchState.tempLine) {
            sketchState.sketchGroup.remove(sketchState.tempLine);
            sketchState.tempLine.geometry.dispose();
        }
        const geo = new THREE.BufferGeometry().setFromPoints(sketchState.drawPoints);
        sketchState.tempLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2563eb }));
        sketchState.sketchGroup.add(sketchState.tempLine);
    }
    
    // Auto-completion detection (Clicking near start)
    if (sketchState.drawPoints.length > 2) {
        const dist = point.distanceTo(sketchState.drawPoints[0]);
        if (dist < 0.5) { // Snapping tolerance
             // User clicked near start, treat as close loop
             sketchState.drawPoints.pop(); // Remove last duplicate
             finishPolyline(true); 
             return;
        }
    }
    
    // Check Intersection on the fly
    const hasIntersection = checkSelfIntersection(sketchState.drawPoints, sketchState.autoClose && sketchState.drawPoints.length > 2);
    if (hasIntersection) {
         addMessageToChat('system', '<span style="color:orange">⚠️ Self-intersection detected!</span>');
         if (sketchState.tempLine) sketchState.tempLine.material.color.setHex(0xff0000);
    } else {
         if (sketchState.tempLine) sketchState.tempLine.material.color.setHex(0x2563eb);
    }
}

function updateCursorLine(currentPoint) {
    if (sketchState.cursorLine) {
        sketchState.sketchGroup.remove(sketchState.cursorLine);
        sketchState.cursorLine.geometry.dispose();
    }
    
    const lastPoint = sketchState.drawPoints[sketchState.drawPoints.length - 1];
    const points = [lastPoint, currentPoint];
    
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    // Switch to LineDashedMaterial as dashSize/gapSize are invalid on LineBasicMaterial
    sketchState.cursorLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x9ca3af, dashSize: 0.2, gapSize: 0.1 }));
    sketchState.cursorLine.computeLineDistances(); 
    sketchState.sketchGroup.add(sketchState.cursorLine);
}

export function finishPolyline(forceClose = false) {
    if (!sketchState.isDrawing) return;
    
    const points = [...sketchState.drawPoints];
    const isClosed = forceClose || sketchState.autoClose;

    if (points.length < 2) {
        cancelPolylineDraw();
        return;
    }

    if (checkSelfIntersection(points, isClosed)) {
        addMessageToChat('system', '⚠️ Warning: Sketch contains intersecting lines.');
    }

    // Create Final Object
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    let lineObj;
    
    if (isClosed) {
        lineObj = new THREE.LineLoop(geo, mat);
    } else {
        lineObj = new THREE.Line(geo, mat);
    }
    
    lineObj.name = `Polyline_${Date.now().toString().slice(-4)}`;
    lineObj.userData.isParametric = true;
    lineObj.userData.shapeType = 'polyline'; 
    // CRITICAL for Extrusion: Save 2D points (x, y)
    lineObj.userData.profile = points.map(p => new THREE.Vector2(p.x, p.y));
    lineObj.userData.closed = isClosed;

    sketchState.sketchGroup.add(lineObj);
    
    cleanupTempDrawings();
    
    sketchState.isDrawing = false;
    document.getElementById('sketch-poly-btn').classList.remove('active-mode');
    addMessageToChat('system', `Created ${isClosed ? 'Closed' : 'Open'} Polyline.`);
    
    updateFeatureTree();
}

function cancelPolylineDraw() {
    cleanupTempDrawings();
    sketchState.isDrawing = false;
    sketchState.drawPoints = [];
}

function cleanupTempDrawings() {
    if (sketchState.tempLine) {
        sketchState.sketchGroup.remove(sketchState.tempLine);
        sketchState.tempLine = null;
    }
    if (sketchState.cursorLine) {
        sketchState.sketchGroup.remove(sketchState.cursorLine);
        sketchState.cursorLine = null;
    }
    sketchState.drawMarkers.forEach(m => sketchState.sketchGroup.remove(m));
    sketchState.drawMarkers = [];
}

function checkSelfIntersection(points, checkCloseLoop) {
    if (points.length < 3) return false;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        segments.push({ p1: points[i], p2: points[i+1] });
    }
    if (checkCloseLoop) {
        segments.push({ p1: points[points.length-1], p2: points[0] });
    }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 2; j < segments.length; j++) {
            if (checkCloseLoop && i === 0 && j === segments.length - 1) continue;
            if (segmentsIntersect(segments[i], segments[j])) return true;
        }
    }
    return false;
}

function segmentsIntersect(s1, s2) {
    const a = s1.p1, b = s1.p2, c = s2.p1, d = s2.p2;
    const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
}

export function createSketchShape(type, args) {
    if (!sketchState.isActive || !sketchState.sketchGroup) {
        if (initSketchMode('XY Plane')) { } else { return; }
    }

    // Handle legacy mappings or aliases
    let configKey = `sketch_${type}`;
    if (type === 'rect') configKey = 'sketch_rect';
    if (type === 'circle') configKey = 'sketch_circle';
    if (type === 'equation') configKey = 'sketch_equation';

    const config = SHAPE_CONFIG[configKey];
    
    if (!config) {
        addMessageToChat('system', `⚠️ Unknown sketch shape: ${type}`);
        return;
    }

    const params = {};
    config.keys.forEach((key, index) => {
        // Keep string args (like equation strings)
        const def = config.defaults[index];
        const val = args[index];
        if (typeof def === 'string') {
            params[key] = val !== undefined ? val : def;
        } else {
            const fVal = parseFloat(val);
            params[key] = (val !== undefined && !isNaN(fVal)) ? fVal : def;
        }
    });

    const geometry = config.factory(params);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    // Use LineLoop for closed shapes, Line for open
    const isClosed = (type === 'rect' || type === 'circle' || type === 'equation'); // Equation usually open but loop works
    const lineObj = isClosed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
    
    lineObj.name = `Sketch${type.charAt(0).toUpperCase() + type.slice(1)}`;
    lineObj.userData.isParametric = true;
    lineObj.userData.shapeType = configKey;
    Object.assign(lineObj.userData, params);

    // Generate Profile Data for Extrusion
    if (type === 'rect') {
        const halfW = params.width / 2;
        const halfH = params.height / 2;
        lineObj.userData.profile = [
            new THREE.Vector2(-halfW, -halfH),
            new THREE.Vector2(halfW, -halfH),
            new THREE.Vector2(halfW, halfH),
            new THREE.Vector2(-halfW, halfH)
        ];
        lineObj.userData.closed = true;
    } else if (type === 'circle') {
        // Approximate circle with points
        const curve = new THREE.EllipseCurve(0, 0, params.radius, params.radius, 0, 2 * Math.PI, false, 0);
        lineObj.userData.profile = curve.getPoints(64);
        lineObj.userData.closed = true;
    } else if (type === 'equation') {
        // Convert BufferGeometry points to Profile
        const pos = geometry.attributes.position;
        const points = [];
        for(let i=0; i<pos.count; i++) {
            points.push(new THREE.Vector2(pos.getX(i), pos.getY(i)));
        }
        lineObj.userData.profile = points;
        lineObj.userData.closed = true; // Assume closed for extrusion for now, or open?
        // Let's assume loop for safety if user wants to extrude
    }

    sketchState.sketchGroup.add(lineObj);
    appState.currentDisplayObject = lineObj;
    attachTransformControls(lineObj);
    updateFeatureTree();

    addMessageToChat('system', `Created 2D ${type} on sketch plane.`);
}

export function exitSketchMode() {
    if (sketchState.isDrawing) cancelPolylineDraw();
    if (!sketchState.isActive) return;

    if (sketchState.sketchGroup && sketchState.gridHelper) {
        sketchState.sketchGroup.remove(sketchState.gridHelper);
        if(sketchState.gridHelper.geometry) sketchState.gridHelper.geometry.dispose();
    }
    
    const sketchControls = document.getElementById('sketch-controls');
    if (sketchControls) {
        sketchControls.style.display = 'none';
    }
    
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
    const center = group.position.clone();
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion).normalize();
    const distance = 20;
    const newPos = center.clone().add(normal.multiplyScalar(distance));
    appState.controls.target.copy(center);
    appState.camera.position.copy(newPos);
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion).normalize();
    appState.camera.up.copy(upVec);
    appState.camera.lookAt(center);
    appState.camera.updateProjectionMatrix();
    appState.controls.update();
}
// origin.js
// Handles default Origin geometry (Planes, Axes, Points) and Work Geometry.

import * as THREE from 'three';
import { appState } from './state.js';
import { updateFeatureTree } from './tree.js';
import { addMessageToChat } from './ui.js';

export function initOrigin() {
    let originGroup = appState.scene.getObjectByName("Origin");
    if (originGroup) return;

    originGroup = new THREE.Group();
    originGroup.name = "Origin";
    originGroup.userData.isSystem = true; 

    // Materials
    const planeMat = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00, 
        transparent: true, 
        opacity: 0.15, 
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const planeEdgeMat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4 });

    // Helper to create planes
    const createPlane = (name, normalAxis) => {
        const size = 15;
        const geo = new THREE.PlaneGeometry(size, size);
        const mesh = new THREE.Mesh(geo, planeMat.clone());
        
        // Add border
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, planeEdgeMat);
        mesh.add(line);

        if (normalAxis === 'x') mesh.rotation.y = Math.PI / 2;
        if (normalAxis === 'y') mesh.rotation.x = Math.PI / 2;
        
        mesh.name = name;
        mesh.userData.type = "WorkPlane";
        mesh.userData.isFixed = true; // Prevent movement
        mesh.visible = true; // Visible by default
        return mesh;
    };

    // Helper to create axes
    const createAxis = (name, dir, colorHex) => {
        const length = 50; 
        const points = [dir.clone().multiplyScalar(-length), dir.clone().multiplyScalar(length)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colorHex }));
        line.name = name;
        line.userData.type = "WorkAxis";
        line.userData.isFixed = true; // Prevent movement
        line.visible = true; // Visible by default
        return line;
    };

    // Add Elements matching the reference image order roughly
    originGroup.add(createPlane("YZ Plane", 'x'));
    originGroup.add(createPlane("XZ Plane", 'y'));
    originGroup.add(createPlane("XY Plane", 'z'));

    originGroup.add(createAxis("X Axis", new THREE.Vector3(1,0,0), 0xff0000));
    originGroup.add(createAxis("Y Axis", new THREE.Vector3(0,1,0), 0x00ff00));
    originGroup.add(createAxis("Z Axis", new THREE.Vector3(0,0,1), 0x0000ff));

    // Center Point
    const ptGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const ptMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow dot
    const point = new THREE.Mesh(ptGeo, ptMat);
    point.name = "Center Point";
    point.userData.type = "WorkPoint";
    point.userData.isFixed = true; // Prevent movement
    point.visible = true; // Visible by default
    originGroup.add(point);

    appState.scene.add(originGroup);
}

export function toggleOrigin() {
    const originGroup = appState.scene.getObjectByName("Origin");
    if (originGroup) {
        originGroup.visible = !originGroup.visible;
        const btn = document.getElementById('origin-btn');
        if(btn) btn.classList.toggle('active-mode', originGroup.visible);
        
        addMessageToChat('system', `Origin visibility: ${originGroup.visible ? 'ON' : 'OFF'}`);
    }
}

// Helper to find features loosely
export function findWorkFeature(name) {
    const origin = appState.scene.getObjectByName("Origin");
    const wfGroup = appState.scene.getObjectByName("Work Features");
    
    // Normalize input name: "XY" -> "xy"
    let clean = name.toLowerCase().replace(/_/g, ' ').trim();
    
    // Handle aliases
    if(clean === 'xy') clean = 'xy plane';
    if(clean === 'yz') clean = 'yz plane';
    if(clean === 'xz') clean = 'xz plane';
    if(clean === 'x') clean = 'x axis';
    if(clean === 'y') clean = 'y axis';
    if(clean === 'z') clean = 'z axis';

    // Search
    let found = null;
    if (origin) {
        found = origin.children.find(c => c.name.toLowerCase() === clean || c.name.toLowerCase().replace(/\s/g,'') === clean.replace(/\s/g,''));
    }
    if (!found && wfGroup) {
        found = wfGroup.children.find(c => c.name.toLowerCase() === clean || c.name.toLowerCase().replace(/\s/g,'') === clean.replace(/\s/g,''));
    }
    return found;
}

function addToWorkFeatures(obj) {
    let wfGroup = appState.scene.getObjectByName("Work Features");
    if (!wfGroup) {
        wfGroup = new THREE.Group();
        wfGroup.name = "Work Features";
        appState.scene.add(wfGroup);
    }
    wfGroup.add(obj);
    updateFeatureTree();
}

export function createOffsetPlane(basePlaneName, offset) {
    const base = findWorkFeature(basePlaneName);
    if (!base || base.userData.type !== 'WorkPlane') return null;

    const newPlane = base.clone();
    newPlane.name = `${base.name} Offset ${offset}`;
    newPlane.userData.type = 'WorkPlane';
    // User created planes are not fixed by default (can be moved manually if needed)
    delete newPlane.userData.isFixed; 
    newPlane.visible = true;
    
    // Apply local offset along normal
    newPlane.translateZ(parseFloat(offset));
    
    addToWorkFeatures(newPlane);
    return newPlane;
}

export function createOffsetAxis(baseAxisName, offsetDirection, offsetDist) {
    // Normalize name lookup (handle "X Axis", "XAxis", etc.)
    const cleanName = baseAxisName.toLowerCase().replace(/\s/g, '').replace(/axis/g, '') + ' axis';
    const base = findWorkFeature(cleanName);
    
    if (!base || base.userData.type !== 'WorkAxis') return null;

    const newAxis = base.clone();
    newAxis.material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    
    newAxis.name = `${base.name} Offset ${offsetDirection.toUpperCase()}${offsetDist}`;
    newAxis.userData.type = 'WorkAxis';
    delete newAxis.userData.isFixed;
    newAxis.visible = true;
    
    const dist = parseFloat(offsetDist);
    const offsetVec = new THREE.Vector3();
    const dir = offsetDirection.toLowerCase();
    
    if (dir === 'x') offsetVec.set(dist, 0, 0);
    else if (dir === 'y') offsetVec.set(0, dist, 0);
    else if (dir === 'z') offsetVec.set(0, 0, dist);

    newAxis.position.add(offsetVec);
    newAxis.updateMatrixWorld();

    addToWorkFeatures(newAxis);
    return newAxis;
}

export function createRotatedPlane(basePlaneName, axisName, angleDeg) {
    const base = findWorkFeature(basePlaneName);
    const axis = findWorkFeature(axisName);

    if (!base || base.userData.type !== 'WorkPlane') return null;
    if (!axis || axis.userData.type !== 'WorkAxis') return null;

    const newPlane = base.clone();
    newPlane.name = `${base.name} Rot ${angleDeg}°`;
    newPlane.userData.type = 'WorkPlane';
    delete newPlane.userData.isFixed;
    newPlane.visible = true;

    const angleRad = THREE.MathUtils.degToRad(parseFloat(angleDeg));

    // Determine Axis Vector and Point (Pivot)
    const axisVec = new THREE.Vector3(0, 0, 1); // Default
    
    // Get direction from object transform
    if (axis.name.toLowerCase().includes('x axis')) axisVec.set(1, 0, 0);
    else if (axis.name.toLowerCase().includes('y axis')) axisVec.set(0, 1, 0);
    else if (axis.name.toLowerCase().includes('z axis')) axisVec.set(0, 0, 1);
    else {
        // Fallback: extract from world matrix
        const posAttr = axis.geometry.attributes.position;
        const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, 0).applyMatrix4(axis.matrixWorld);
        const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, 1).applyMatrix4(axis.matrixWorld);
        axisVec.subVectors(v1, v0).normalize();
    }
    
    const axisPos = axis.position.clone();

    // Rotate Around Axis logic:
    // 1. Move to Origin relative to pivot
    newPlane.position.sub(axisPos);
    // 2. Rotate
    const rotMat = new THREE.Matrix4().makeRotationAxis(axisVec, angleRad);
    newPlane.applyMatrix4(rotMat);
    // 3. Move back
    newPlane.position.add(axisPos);

    addToWorkFeatures(newPlane);
    return newPlane;
}

export function createRotatedAxis(baseAxisName, pivotAxisName, angleDeg) {
    const base = findWorkFeature(baseAxisName);
    const pivot = findWorkFeature(pivotAxisName); // The axis we rotate AROUND

    if (!base || base.userData.type !== 'WorkAxis') return null;
    if (!pivot || pivot.userData.type !== 'WorkAxis') return null;

    const newAxis = base.clone();
    newAxis.material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    newAxis.name = `${base.name} Rot ${angleDeg}°`;
    newAxis.userData.type = 'WorkAxis';
    delete newAxis.userData.isFixed;
    newAxis.visible = true;

    const angleRad = THREE.MathUtils.degToRad(parseFloat(angleDeg));
    
    // Determine Pivot Vector
    const pivotVec = new THREE.Vector3(0,1,0);
    if (pivot.name.toLowerCase().includes('x axis')) pivotVec.set(1, 0, 0);
    else if (pivot.name.toLowerCase().includes('y axis')) pivotVec.set(0, 1, 0);
    else if (pivot.name.toLowerCase().includes('z axis')) pivotVec.set(0, 0, 1);
    else {
        const posAttr = pivot.geometry.attributes.position;
        const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, 0).applyMatrix4(pivot.matrixWorld);
        const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, 1).applyMatrix4(pivot.matrixWorld);
        pivotVec.subVectors(v1, v0).normalize();
    }
    
    const pivotPos = pivot.position.clone();

    // Rotate
    newAxis.position.sub(pivotPos);
    const rotMat = new THREE.Matrix4().makeRotationAxis(pivotVec, angleRad);
    newAxis.applyMatrix4(rotMat);
    newAxis.position.add(pivotPos);

    addToWorkFeatures(newAxis);
    return newAxis;
}
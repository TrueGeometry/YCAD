// properties.js
// Physics and Material estimation.

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { toggleSectionMode, isSectionMode } from './section.js';

const propertiesControls = document.getElementById('properties-controls');
const densityInput = document.getElementById('density-input');

export let isPropertiesMode = false;
let comHelper = null;

export function togglePropertiesMode() {
    isPropertiesMode = !isPropertiesMode;
    if(isSectionMode) toggleSectionMode();
    document.getElementById('props-btn').classList.toggle('active-mode', isPropertiesMode);
    propertiesControls.classList.toggle('visible', isPropertiesMode);
    if(isPropertiesMode) {
        addMessageToChat('system', 'Property estimation tool active.');
    } else {
        resetProperties();
    }
}

export function resetProperties() {
    isPropertiesMode = false;
    document.getElementById('props-btn').classList.remove('active-mode');
    propertiesControls.classList.remove('visible');
    if (comHelper) {
        appState.scene.remove(comHelper);
        if(comHelper.geometry) comHelper.geometry.dispose();
        comHelper = null;
    }
}

export function computePhysicalProperties(targetObject = null) {
    const obj = targetObject || appState.currentDisplayObject;
    if (!obj) return null;
    
    let totalVolume = 0;
    let totalArea = 0;
    let moment = new THREE.Vector3(0, 0, 0);
    
    obj.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const geometry = child.geometry;
            const matrixWorld = child.matrixWorld;
            const posAttribute = geometry.attributes.position;
            const index = geometry.index;
            if (posAttribute) {
                const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
                const processTriangle = (a, b, c) => {
                    p1.fromBufferAttribute(posAttribute, a).applyMatrix4(matrixWorld);
                    p2.fromBufferAttribute(posAttribute, b).applyMatrix4(matrixWorld);
                    p3.fromBufferAttribute(posAttribute, c).applyMatrix4(matrixWorld);
                    
                    // Signed volume of tetrahedron formed by triangle and origin
                    const vTet = p1.dot(p2.cross(p3)) / 6.0;
                    totalVolume += vTet;
                    
                    // Centroid of tetrahedron
                    const cTet = new THREE.Vector3().addVectors(p1, p2).add(p3).multiplyScalar(0.25);
                    
                    moment.add(cTet.multiplyScalar(vTet));

                    // Surface Area
                     const edge1 = new THREE.Vector3().subVectors(p2, p1);
                     const edge2 = new THREE.Vector3().subVectors(p3, p1);
                     totalArea += 0.5 * new THREE.Vector3().crossVectors(edge1, edge2).length();
                };
                if (index) {
                    for (let i = 0; i < index.count; i += 3) processTriangle(index.getX(i), index.getY(i), index.getZ(i));
                } else {
                    for (let i = 0; i < posAttribute.count; i += 3) processTriangle(i, i + 1, i + 2);
                }
            }
        }
    });
    
    const absVolume = Math.abs(totalVolume);
    const density = parseFloat(densityInput.value);
    
    let com = new THREE.Vector3(0,0,0);
    if (Math.abs(totalVolume) > 1e-9) {
        com.copy(moment).divideScalar(totalVolume);
    }

    return { 
        volume: absVolume, 
        area: totalArea, 
        density: density, 
        mass: absVolume * density,
        centerOfMass: com 
    };
}

export function showPhysicalProperties() {
    const props = computePhysicalProperties();
    if (!props) { addMessageToChat('system', 'No model loaded.'); return; }
    
    // Visualize Center of Mass
    if (comHelper) {
        appState.scene.remove(comHelper);
        if(comHelper.geometry) comHelper.geometry.dispose();
    }
    
    // Create a visual marker for COM (Sphere + Axes)
    const comGroup = new THREE.Group();
    comGroup.position.copy(props.centerOfMass);
    
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false, transparent: true, opacity: 0.8 })
    );
    comGroup.add(sphere);
    
    // Small axes at COM
    const axesSize = 1.0;
    const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), axesSize, 0xff0000);
    const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), axesSize, 0x00ff00);
    const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), axesSize, 0x0000ff);
    comGroup.add(xAxis);
    comGroup.add(yAxis);
    comGroup.add(zAxis);

    comGroup.renderOrder = 999;
    appState.scene.add(comGroup);
    comHelper = comGroup;

    addMessageToChat('system', `
        <b>Estimated Properties:</b><br>
        Volume: ${props.volume.toFixed(2)} units³<br>
        Surface Area: ${props.area.toFixed(2)} units²<br>
        Mass: ${(props.mass).toFixed(2)} g<br>
        <b>Center of Mass:</b><br>
        X: ${props.centerOfMass.x.toFixed(3)}<br>
        Y: ${props.centerOfMass.y.toFixed(3)}<br>
        Z: ${props.centerOfMass.z.toFixed(3)}<br>
        <span style="font-size:0.8em; color:gray;">(Indicated by magenta sphere)</span>
    `);
}
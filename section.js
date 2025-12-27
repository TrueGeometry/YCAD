// section.js
// Clipping plane and section view logic.

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { togglePropertiesMode, isPropertiesMode } from './properties.js';

const sectionControls = document.getElementById('section-controls');
const sectXBtn = document.getElementById('sect-x');
const sectYBtn = document.getElementById('sect-y');
const sectZBtn = document.getElementById('sect-z');
const sectFlipBtn = document.getElementById('sect-flip');
const sectSlider = document.getElementById('sect-slider');

export let isSectionMode = false;
export let sectionPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
let sectionHelper;
let sectionAxis = 'x';
let sectionInverted = false;
let modelBounds = null;

export function toggleSectionMode() {
    if (!appState.currentDisplayObject) return;
    
    // Close other incompatible modes
    if(isPropertiesMode) togglePropertiesMode();
    
    isSectionMode = !isSectionMode;
    
    if (isSectionMode) {
        document.getElementById('section-btn').classList.add('active-mode');
        sectionControls.classList.add('visible');
        updateSectionAxis('x');
        appState.currentDisplayObject.traverse(c => { if (c.isMesh) c.material.side = THREE.DoubleSide; });
        modelBounds = new THREE.Box3().setFromObject(appState.currentDisplayObject);
        updateSliderBounds();
        appState.renderer.clippingPlanes = [sectionPlane];
        if(!sectionHelper) {
            sectionHelper = new THREE.PlaneHelper(sectionPlane, 10, 0xffff00);
            appState.scene.add(sectionHelper);
        }
        addMessageToChat('system', 'Cross-section view active.');
    } else {
        document.getElementById('section-btn').classList.remove('active-mode');
        sectionControls.classList.remove('visible');
        appState.renderer.clippingPlanes = [];
        if(sectionHelper) { appState.scene.remove(sectionHelper); sectionHelper = null; }
        addMessageToChat('system', 'Cross-section disabled.');
    }
}

export function resetSection() {
    isSectionMode = false;
    document.getElementById('section-btn').classList.remove('active-mode');
    sectionControls.classList.remove('visible');
    if (appState.renderer) appState.renderer.clippingPlanes = [];
    if (sectionHelper && appState.scene) {
        appState.scene.remove(sectionHelper);
        sectionHelper = null;
    }
}

export function updateSectionAxis(axis) {
    sectionAxis = axis;
    sectXBtn.classList.toggle('active', axis === 'x');
    sectYBtn.classList.toggle('active', axis === 'y');
    sectZBtn.classList.toggle('active', axis === 'z');
    
    const center = new THREE.Vector3();
    if(modelBounds) modelBounds.getCenter(center);
    sectionInverted = false;
    sectFlipBtn.classList.remove('active');
    const normal = new THREE.Vector3(0,0,0);
    normal[axis] = -1; 
    sectionPlane.normal.copy(normal);
    sectionPlane.constant = - center.dot(normal);
    updateSliderBounds();
}

export function updateSliderBounds() {
    if(!modelBounds) return;
    sectSlider.min = modelBounds.min[sectionAxis] - 1;
    sectSlider.max = modelBounds.max[sectionAxis] + 1;
    const center = new THREE.Vector3();
    modelBounds.getCenter(center);
    sectSlider.value = center[sectionAxis];
    updateSectionPosition();
}

export function updateSectionPosition() {
     const val = parseFloat(sectSlider.value);
     const normalComponent = sectionPlane.normal[sectionAxis];
     sectionPlane.constant = -1 * normalComponent * val;
}

export function toggleSectionFlip() {
    sectionInverted = !sectionInverted;
    sectFlipBtn.classList.toggle('active', sectionInverted);
    sectionPlane.normal.negate();
    sectionPlane.constant *= -1; 
}
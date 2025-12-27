// annotation.js
// Handles 3D text annotations attached to objects.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';

let annotations = []; // Local track of active annotation objects
let areAnnotationsVisible = true;

export function addAnnotation(object, text) {
    if (!object) return;

    // Calculate center of the object to point to
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
        box.getCenter(center);
    } else {
        center.copy(object.position);
    }

    // Create HTML Structure
    // <div class="annotation-container">
    //    <div class="annotation-dot"></div>
    //    <div class="annotation-content">TEXT</div>
    // </div>
    const wrapper = document.createElement('div');
    wrapper.className = 'annotation-container';

    const dot = document.createElement('div');
    dot.className = 'annotation-dot';
    wrapper.appendChild(dot);
    
    // Optional: Connecting Line could be simulated with a div, but CSS transform on content is simpler for now.
    // We will use CSS to offset the content and draw a border/line.
    
    const content = document.createElement('div');
    content.className = 'annotation-content';
    content.textContent = text;
    wrapper.appendChild(content);

    // Create CSS2D Object
    const label = new CSS2DObject(wrapper);
    label.position.copy(center);
    
    // We attach the label directly to the scene so it doesn't rotate WITH the object's local transform 
    // (which might flip text upside down if the object is rotated).
    // However, if the object moves, we need the label to follow.
    // Best approach: Add to the object, but CSS2D objects always face screen anyway.
    object.add(label);
    
    annotations.push(label);
    
    // Respect current visibility state
    if (!areAnnotationsVisible) {
        label.visible = false;
    }

    addMessageToChat('system', `Annotated <b>${object.name}</b> with "${text}".`);
}

export function toggleAnnotations(state) {
    // state can be 'on', 'off', or undefined (toggle)
    if (state === 'on') areAnnotationsVisible = true;
    else if (state === 'off') areAnnotationsVisible = false;
    else areAnnotationsVisible = !areAnnotationsVisible;

    annotations.forEach(label => {
        label.visible = areAnnotationsVisible;
    });

    addMessageToChat('system', `Annotations are now ${areAnnotationsVisible ? 'VISIBLE' : 'HIDDEN'}.`);
}

export function clearAnnotations() {
    annotations.forEach(label => {
        if (label.parent) label.parent.remove(label);
    });
    annotations = [];
    addMessageToChat('system', 'All annotations cleared.');
}
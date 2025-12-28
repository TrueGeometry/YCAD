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

    // Calculate center of the object to point to (World Space)
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
        box.getCenter(center);
    } else {
        object.getWorldPosition(center);
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
    
    // Convert the calculated World Center to the Object's Local Space
    // This is necessary because we add the label as a child of the object (so it moves with it).
    // If we just used 'center', it would be treated as a local offset, which is wrong if the object isn't at (0,0,0).
    object.worldToLocal(center);
    label.position.copy(center);
    
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
// history.js
// Handles Undo/Redo functionality by snapshotting the user content of the scene.

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { attachTransformControls, getTaggableObjects } from './viewer.js';
import { updateFeatureTree } from './tree.js';

/**
 * Helper to identify system objects that should not be snapshotted or removed.
 */
function isSystemObject(child) {
    if (!child) return false;
    
    // Explicit reference check
    if (appState.transformControls && child === appState.transformControls) return true;
    
    // Name checks
    if (child.name === 'GridHelper' || child.name === 'Origin' || child.name === 'Work Features') return true;
    
    // Type checks
    if (child.type) {
        if (child.type.includes('Light')) return true;
        if (child.type.includes('Camera')) return true;
        if (child.type.includes('Control')) return true;
    }

    // Constructor name check (TransformControls usually has type 'Object3D' but constructor name is distinct)
    if (child.constructor && child.constructor.name === 'TransformControls') return true;

    return false;
}

/**
 * Pushes the current scene state to the Undo stack.
 * Call this BEFORE performing a destructive action (move, delete, add).
 */
export function pushUndoState() {
    if (appState.isReplaying) return; // Don't track history during session replay

    const contentRoot = new THREE.Group();
    
    // 1. Identify User Content to Save
    // We strictly avoid saving System objects (Lights, Camera, Grid, Controls)
    // We clone user objects into a temporary root to serialize them
    appState.scene.traverse((child) => {
        if (child.parent !== appState.scene) return; // Only direct children of scene

        if (!isSystemObject(child)) {
            // Clone the object to detach from scene hierarchy for serialization
            // clone() is usually shallow for geometry/material, which is good for memory
            try {
                const clone = child.clone();
                contentRoot.add(clone);
            } catch (e) {
                console.warn("Failed to clone object for undo stack:", child.name, e);
            }
        }
    });

    const json = contentRoot.toJSON();
    
    // Push to stack
    appState.undoStack.push(json);
    
    // Limit stack size
    if (appState.undoStack.length > appState.maxUndoSteps) {
        appState.undoStack.shift();
    }

    // Clear Redo stack on new action
    appState.redoStack = [];
}

/**
 * Restores the state from JSON.
 */
function restoreState(json) {
    const loader = new THREE.ObjectLoader();
    
    // Parse the JSON into a Three.js object tree
    loader.parse(json, (loadedRoot) => {
        
        // 1. Clear existing User Content from Scene
        const toRemove = [];
        appState.scene.traverse((child) => {
            if (child.parent !== appState.scene) return;
            if (!isSystemObject(child)) {
                toRemove.push(child);
            }
        });

        toRemove.forEach(child => {
            appState.scene.remove(child);
            // Optional: Dispose geometry/material to prevent leaks
            // if (child.geometry) child.geometry.dispose();
        });

        // 2. Add Restored Content
        // loadedRoot is the Group we created in pushUndoState. 
        // We move its children back to the scene.
        while(loadedRoot.children.length > 0) {
            const child = loadedRoot.children[0];
            appState.scene.add(child); // This moves it from loadedRoot to scene
            
            // Re-enable shadows if lost during serialization
            child.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        }

        // 3. Cleanup State
        attachTransformControls(null); // Detach gizmo to avoid ghost references
        appState.selectedObject = null;
        appState.currentDisplayObject = null;

        // Try to re-find a logical current object (e.g. last added)
        const taggables = getTaggableObjects();
        if (taggables.length > 0) {
            appState.currentDisplayObject = taggables[taggables.length - 1].object;
        }

        updateFeatureTree();
    });
}

export function performUndo() {
    if (appState.undoStack.length === 0) {
        addMessageToChat('system', 'Nothing to Undo.');
        return;
    }

    // 1. Save CURRENT state to Redo Stack
    // We reuse push logic but direct to redoStack
    const currentContent = new THREE.Group();
    appState.scene.traverse((child) => {
        if (child.parent !== appState.scene) return;
        if (!isSystemObject(child)) {
            try {
                currentContent.add(child.clone());
            } catch (e) { console.warn(e); }
        }
    });
    appState.redoStack.push(currentContent.toJSON());

    // 2. Pop from Undo
    const prevState = appState.undoStack.pop();

    // 3. Restore
    restoreState(prevState);
    addMessageToChat('system', '↩️ Undid last action.');
}

export function performRedo() {
    if (appState.redoStack.length === 0) {
        addMessageToChat('system', 'Nothing to Redo.');
        return;
    }

    // 1. Save CURRENT state to Undo Stack
    const currentContent = new THREE.Group();
    appState.scene.traverse((child) => {
        if (child.parent !== appState.scene) return;
        if (!isSystemObject(child)) {
            try {
                currentContent.add(child.clone());
            } catch(e) { console.warn(e); }
        }
    });
    appState.undoStack.push(currentContent.toJSON());

    // 2. Pop from Redo
    const nextState = appState.redoStack.pop();

    // 3. Restore
    restoreState(nextState);
    addMessageToChat('system', '↪️ Redid action.');
}
// commands/utils.js
// Shared helpers for command modules.

import { appState } from '../state.js';
import { getTaggableObjects } from '../viewer.js';

export function resolveTarget(argRaw) {
    let targetName = null;
    
    // 1. Check for explicit @mention (e.g., /delete @Cube_1)
    const match = argRaw ? argRaw.match(/@([\w\d_-]+)/) : null;
    if (match) {
        targetName = match[1];
    }

    let targetObj = null;
    let targetNameDisplay = "";

    if (targetName) {
        // Resolve by Name
        const objects = getTaggableObjects();
        const found = objects.find(o => o.name.toLowerCase() === targetName.toLowerCase());
        if (found) {
            targetObj = found.object;
            targetNameDisplay = found.name;
        }
    } else {
        // 2. Resolve by Selection State
        // Priority: Explicitly selected object (gizmo attached) -> Last loaded root object
        targetObj = appState.selectedObject || appState.currentDisplayObject;
        
        if (targetObj) {
            targetNameDisplay = targetObj.userData.filename || targetObj.name || "Object";
        }
    }

    return { object: targetObj, name: targetNameDisplay };
}
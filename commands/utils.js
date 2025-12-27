// commands/utils.js
// Shared helpers for command modules.

import { appState } from '../state.js';
import { getTaggableObjects } from '../viewer.js';

export function resolveTarget(argRaw) {
    let targetName = null;
    const match = argRaw.match(/@([\w\d_-]+)/);
    if (match) {
        targetName = match[1];
    }

    let targetObj = null;
    let targetNameDisplay = "";

    if (targetName) {
        const objects = getTaggableObjects();
        const found = objects.find(o => o.name.toLowerCase() === targetName.toLowerCase());
        if (found) {
            targetObj = found.object;
            targetNameDisplay = found.name;
        }
    } else {
        targetObj = appState.currentDisplayObject; // Default to selected
        if (targetObj) targetNameDisplay = targetObj.userData.filename || targetObj.name;
    }

    return { object: targetObj, name: targetNameDisplay };
}
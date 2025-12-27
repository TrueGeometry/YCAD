// recorder.js
// Handles recording user actions and restoring sessions.

import { appState } from './state.js';
import { executeCommand } from './commands.js';
import { setCameraView, fitGeometryView, applyTheme, setTransformMode } from './viewer.js';
import { toggleTool, toggleWireframe, toggleBoundingBox } from './tools.js';
import { toggleSectionMode, updateSectionAxis, toggleSectionFlip } from './section.js';
import { togglePropertiesMode } from './properties.js';
import { toggleFeatureTree } from './tree.js';
import { toggleCollisions } from './collisions.js';
import { toggleOrigin } from './origin.js';
import { addMessageToChat, toggleLoading } from './ui.js';
import { applyStateToObject } from './loader.js';

// --- Recording ---

export function recordAction(type, payload) {
    if (appState.isReplaying) return;

    const action = {
        timestamp: Date.now(),
        type: type, // 'cmd', 'view', 'tool', 'transform', 'theme', 'misc'
        payload: payload
    };

    appState.actionLog.push(action);
    console.debug(`[Recorder] Recorded: ${type}`, payload);
}

export function downloadSession() {
    const sessionData = {
        sessionId: appState.sessionId,
        createdAt: new Date().toISOString(),
        log: appState.actionLog
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `design_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    addMessageToChat('system', 'Session log saved to Downloads.');
}

// --- Restoring ---

export function uploadAndRestoreSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const sessionData = JSON.parse(event.target.result);
                if (sessionData.log && Array.isArray(sessionData.log)) {
                    restoreSession(sessionData.log);
                } else {
                    addMessageToChat('system', '⚠️ Invalid session file format.');
                }
            } catch (err) {
                console.error(err);
                addMessageToChat('system', '⚠️ Error parsing session file.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

async function restoreSession(log) {
    addMessageToChat('system', '🔄 Restoring Session...');
    toggleLoading(true);
    appState.isReplaying = true;

    // Reset Scene via reload command equivalent (clearing logic handled in executeCommand usually, 
    // but here we just process the log linearly. Ideally, the log starts with a load command).
    
    // Clear current log to avoid duplication if we save again immediately
    appState.actionLog = [];

    try {
        for (const action of log) {
            await replayAction(action);
            // Small delay to allow UI/Three.js to catch up visually
            await new Promise(r => setTimeout(r, 100)); 
        }
        addMessageToChat('system', '✅ Session Restored Successfully.');
    } catch (e) {
        console.error(e);
        addMessageToChat('system', `⚠️ Error during restore: ${e.message}`);
    } finally {
        appState.isReplaying = false;
        toggleLoading(false);
        // Re-populate log with the actions we just replayed so they are saved if exported again
        appState.actionLog = log; 
    }
}

async function replayAction(action) {
    const { type, payload } = action;

    switch (type) {
        case 'cmd':
            // Execute text commands (includes /add, /move via chat, /pattern, etc.)
            await executeCommand(payload); 
            break;

        case 'view':
            if (payload === 'fit') fitGeometryView();
            else setCameraView(payload);
            break;

        case 'tool':
            if (payload === 'wireframe') toggleWireframe();
            else if (payload === 'bounds') toggleBoundingBox();
            else if (payload === 'section') toggleSectionMode();
            else if (payload === 'props') togglePropertiesMode();
            else if (payload === 'tree') toggleFeatureTree();
            else if (payload === 'collision') toggleCollisions();
            else if (payload === 'origin') toggleOrigin();
            else toggleTool(payload); // distance, angle
            break;
        
        case 'section_axis':
            updateSectionAxis(payload);
            break;
        
        case 'section_flip':
            toggleSectionFlip();
            break;

        case 'theme':
            applyTheme(payload);
            break;
            
        case 'mode':
            setTransformMode(payload); // translate/rotate
            break;

        case 'manual_transform':
            // Restore position/rotation/scale after a drag operation
            if (appState.currentDisplayObject && payload.uuid === appState.currentDisplayObject.uuid) {
                const { position, rotation, scale } = payload.transform;
                // Convert simple objects back to updates
                appState.currentDisplayObject.position.set(position.x, position.y, position.z);
                appState.currentDisplayObject.rotation.set(rotation.x, rotation.y, rotation.z);
                appState.currentDisplayObject.scale.set(scale.x, scale.y, scale.z);
                appState.currentDisplayObject.updateMatrixWorld(true);
            }
            break;

        default:
            console.warn('Unknown action type during replay:', type);
    }
}
// recorder.js
// Handles recording user actions and restoring sessions.

import { appState } from './state.js';
import { executeCommand } from './commands.js';
import { setCameraView, fitGeometryView, applyTheme, setTransformMode } from './viewer.js';
import { toggleTool, toggleWireframe, toggleBoundingBox } from './tools.js';
import { toggleSectionMode, updateSectionAxis, toggleSectionFlip } from './section.js';
import { togglePropertiesMode } from './properties.js';
import { toggleFeatureTree, updateFeatureTree } from './tree.js';
import { toggleCollisions } from './collisions.js';
import { toggleOrigin } from './origin.js';
import { addMessageToChat, toggleLoading } from './ui.js';
import { applyStateToObject } from './loader.js';
import { getBackendHost } from './utils.js';
import { getSceneStructure } from './report.js';
import { captureAnnotatedImage } from './capture.js';

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

export async function saveToCloud() {
    addMessageToChat('system', 'Saving to cloud...');
    toggleLoading(true);

    try {
        // 1. Capture Data
        const snapshot = captureAnnotatedImage(); // Returns Data URL
        const tree = getSceneStructure();
        const log = appState.actionLog;
        const sessionId = appState.sessionId || 'session_' + Date.now();

        const payload = {
            sessionId,
            createdAt: new Date().toISOString(),
            log,
            tree,
            snapshot
        };

        // 2. Send to Server
        const backendUrl = getBackendHost();
        const response = await fetch(`${backendUrl}/agi/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json().catch(() => ({}));
            const serverId = resData.id || sessionId;
            addMessageToChat('system', `✅ Saved to cloud successfully. <br><span style="font-size:0.8em; color:gray;">ID: ${serverId}</span>`);
        } else {
            throw new Error(`Server responded with ${response.status} ${response.statusText}`);
        }

    } catch (e) {
        console.error("Cloud Save Error:", e);
        addMessageToChat('system', `⚠️ Cloud save failed: ${e.message}`);
    } finally {
        toggleLoading(false);
    }
}

// --- Restoring / Rebuilding ---

function clearSceneForRebuild() {
    const toRemove = [];
    appState.scene.traverse(c => {
        if (c.parent === appState.scene) {
             // Logic to identify user objects (negation of system objects)
             const isSystem = (c.name === 'GridHelper' || c.name === 'Origin' || c.name === 'Work Features' || 
                               c.type.includes('Light') || c.type.includes('Camera') || c.type.includes('Control') || 
                               (c.userData && c.userData.isSystem));
             if (!isSystem) toRemove.push(c);
        }
    });
    toRemove.forEach(c => {
        appState.scene.remove(c);
        if(c.geometry) c.geometry.dispose();
    });
    // Reset pointers
    appState.currentDisplayObject = null;
    appState.selectedObject = null;
    if(appState.transformControls) appState.transformControls.detach();
    updateFeatureTree();
}

export async function rebuildCurrentSession() {
    if (appState.actionLog.length === 0) {
        addMessageToChat('system', 'No history to rebuild.');
        return;
    }
    
    addMessageToChat('system', '🔨 <b>Rebuilding Scene...</b>');
    toggleLoading(true);
    
    // Clear Scene
    clearSceneForRebuild();
    
    // Replay
    const log = [...appState.actionLog];
    appState.isReplaying = true;
    
    try {
        for (const action of log) {
            // Skip View updates during rebuild to make it faster and stay focused
            if (action.type === 'view') continue; 
            
            await replayAction(action);
            // Minimal delay for stability
            await new Promise(r => setTimeout(r, 10)); 
        }
        addMessageToChat('system', '✅ Rebuild Complete.');
    } catch (e) {
        console.error(e);
        addMessageToChat('system', `⚠️ Rebuild error: ${e.message}`);
    } finally {
        appState.isReplaying = false;
        toggleLoading(false);
    }
}

export function uploadAndRestoreSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt'; // Allow JSON and TXT
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            
            // 1. Try Session JSON
            try {
                const sessionData = JSON.parse(text);
                if (sessionData.log && Array.isArray(sessionData.log)) {
                    restoreSession(sessionData.log);
                    return; // Success as JSON
                }
            } catch (err) {
                // Ignore JSON parse error, fall through to script processing
            }

            // 2. Try Command Script (Line-by-line)
            const lines = text.split(/\r?\n/);
            const commands = lines
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//')); // Ignore comments/empty

            if (commands.length > 0) {
                addMessageToChat('system', `📜 <b>Running Script: ${file.name}</b>`);
                toggleLoading(true);
                appState.isReplaying = true; // Don't record these actions into history during playback

                try {
                    for (const cmd of commands) {
                        // Only execute lines that look like commands
                        if (cmd.startsWith('/')) {
                            addMessageToChat('system', `> ${cmd}`);
                            await executeCommand(cmd);
                            // Small delay for UI updates/animations between steps
                            await new Promise(r => setTimeout(r, 200));
                        }
                    }
                    addMessageToChat('system', '✅ Script execution finished.');
                } catch (e) {
                    console.error(e);
                    addMessageToChat('system', `⚠️ Script execution stopped: ${e.message}`);
                } finally {
                    appState.isReplaying = false;
                    toggleLoading(false);
                }
            } else {
                addMessageToChat('system', '⚠️ File appears empty or invalid.');
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

    // Reset Scene logic for restore (ensure clean slate)
    clearSceneForRebuild();
    
    // Clear current log to avoid duplication if we save again immediately
    appState.actionLog = [];

    try {
        for (const action of log) {
            await replayAction(action);
            // Small delay to allow UI/Three.js to catch up visually
            await new Promise(r => setTimeout(r, 50)); 
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
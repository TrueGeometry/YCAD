// commands/export_cmds.js
import * as THREE from 'three';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { appState } from '../state.js';
import { addMessageToChat, toggleLoading } from '../ui.js';
import { resolveTarget } from './utils.js';

// Helper to download Blob
function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Check if an object is a valid user object (not system helper)
function isValid(obj) {
    if (!obj.visible) return false;
    
    // System names
    if (obj.name === 'GridHelper' || obj.name === 'Origin' || obj.name === 'Work Features') return false;
    
    // System types
    if (obj.type.includes('Camera') || obj.type.includes('Light') || obj.type.includes('Control')) return false;
    
    // User Data flags
    if (obj.userData && (obj.userData.isSystem || obj.userData.type?.startsWith('Work'))) return false;
    
    // Specific exclusions
    if (obj.constructor && obj.constructor.name === 'TransformControls') return false;

    return true;
}

// Determine what to export based on argument or selection
function getTargets(argRaw) {
    const arg = argRaw ? argRaw.toLowerCase().trim() : '';
    
    // Explicit Scene Export
    if (arg === 'scene' || arg === 'all' || arg === '@scene') {
        return getSceneRoot();
    }

    // Resolve specific target (Selection or @Mention)
    const { object, name } = resolveTarget(argRaw);
    
    if (object) {
        // If a specific object is selected/mentioned, export it
        return { root: object, name: name || 'object' };
    }

    // Fallback: If nothing specified and nothing selected, export Scene
    return getSceneRoot();
}

function getSceneRoot() {
    const root = new THREE.Group();
    root.name = "Scene_Export";
    
    // Clone valid children into a temporary group to export them together
    appState.scene.children.forEach(c => {
        if (isValid(c)) {
            // We clone to avoid modifying the actual scene structure during export
            root.add(c.clone());
        }
    });
    
    // Check if empty
    if (root.children.length === 0) {
        return { root: null, name: 'scene' };
    }
    
    return { root: root, name: 'scene' };
}

export const exportCommands = {
    '/export_obj': {
        desc: 'Export to OBJ (@Target or "all")',
        execute: (argRaw) => {
            const { root, name } = getTargets(argRaw);
            
            if (!root) {
                addMessageToChat('system', '⚠️ Nothing to export.');
                return;
            }

            addMessageToChat('system', `Exporting <b>${name}</b> to OBJ...`);
            toggleLoading(true);

            // Delay to allow UI update
            setTimeout(() => {
                try {
                    const exporter = new OBJExporter();
                    const result = exporter.parse(root);
                    const blob = new Blob([result], { type: 'text/plain' });
                    download(blob, `${name}_${Date.now()}.obj`);
                    addMessageToChat('system', '✅ OBJ export started.');
                } catch (e) {
                    console.error(e);
                    addMessageToChat('system', '⚠️ Export failed.');
                } finally {
                    toggleLoading(false);
                }
            }, 50);
        }
    },

    '/export_glb': {
        desc: 'Export to GLB (@Target or "all")',
        execute: (argRaw) => {
            const { root, name } = getTargets(argRaw);
            
            if (!root) {
                addMessageToChat('system', '⚠️ Nothing to export.');
                return;
            }

            addMessageToChat('system', `Exporting <b>${name}</b> to GLB...`);
            toggleLoading(true);

            setTimeout(() => {
                try {
                    const exporter = new GLTFExporter();
                    exporter.parse(root, (gltf) => {
                        const blob = new Blob([gltf], { type: 'application/octet-stream' });
                        download(blob, `${name}_${Date.now()}.glb`);
                        addMessageToChat('system', '✅ GLB export started.');
                        toggleLoading(false);
                    }, (err) => {
                        console.error(err);
                        addMessageToChat('system', '⚠️ Export failed.');
                        toggleLoading(false);
                    }, { binary: true });
                } catch (e) {
                    console.error(e);
                    addMessageToChat('system', '⚠️ Export error.');
                    toggleLoading(false);
                }
            }, 50);
        }
    },

    '/export_stl': {
        desc: 'Export to STL (@Target or "all")',
        execute: (argRaw) => {
            const { root, name } = getTargets(argRaw);
            
            if (!root) {
                addMessageToChat('system', '⚠️ Nothing to export.');
                return;
            }

            addMessageToChat('system', `Exporting <b>${name}</b> to STL...`);
            toggleLoading(true);

            setTimeout(() => {
                try {
                    const exporter = new STLExporter();
                    const result = exporter.parse(root, { binary: true });
                    const blob = new Blob([result], { type: 'application/octet-stream' });
                    download(blob, `${name}_${Date.now()}.stl`);
                    addMessageToChat('system', '✅ STL export started.');
                } catch (e) {
                    console.error(e);
                    addMessageToChat('system', '⚠️ Export failed. STL requires meshes.');
                } finally {
                    toggleLoading(false);
                }
            }, 50);
        }
    }
};
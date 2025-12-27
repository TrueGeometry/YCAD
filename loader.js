// loader.js
// Handles loading GLBs and applying transforms.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { appState } from './state.js';
import { addMessageToChat, toggleLoading, updateInitialStateButton, addModelHistorySpan } from './ui.js';
import { deactivateTools, resetBounds, resetWireframe } from './tools.js';
import { resetSection } from './section.js';
import { resetProperties } from './properties.js';
import { getFilenameFromUrl } from './utils.js';
import { attachTransformControls, fitGeometryView } from './viewer.js';
import { updateFeatureTree } from './tree.js'; // Import update function

const gltfLoader = new GLTFLoader();

export async function loadAndDisplayGLB(url, mode = 'replace') {
    const isAppend = mode === 'add';
    
    addMessageToChat('system', isAppend ? 'Adding 3D model to scene...' : 'Loading 3D model...');
    toggleLoading(true);
    let loadedSuccessfully = false;

    try {
        const gltf = await gltfLoader.loadAsync(url);
        const filename = getFilenameFromUrl(url);

        // Handle "Replace" mode
        if (!isAppend) {
            // Remove existing meshes (except grid/lights)
            const toRemove = [];
            appState.scene.traverse(c => {
                if (c.name === "loaded_glb" || c.name === "fallback_cube") toRemove.push(c);
            });
            toRemove.forEach(c => {
                appState.scene.remove(c);
                if(c.geometry) c.geometry.dispose();
            });

            appState.currentDisplayObject = null;
            attachTransformControls(null); // Detach gizmo
            
            // Reset Tools only on full replace
            deactivateTools();
            resetWireframe();
            resetBounds();
            resetSection();
            resetProperties();
        }

        const loadedModel = gltf.scene;
        
        // --- Auto-Scaling & Centering ---
        const box = new THREE.Box3().setFromObject(loadedModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        if (!isAppend) {
            // If replacing, center at 0,0,0
            const maxSize = Math.max(size.x, size.y, size.z);
            const desiredSize = 8.0;
            let scaleFactor = (maxSize > 0) ? desiredSize / maxSize : 1.0;

            loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
            // Recalculate box after scale
            box.setFromObject(loadedModel);
            box.getCenter(center);
            loadedModel.position.sub(center);
        } else {
             // If Appending, keep scale but maybe offset slightly so they don't overlap perfectly
             const maxSize = Math.max(size.x, size.y, size.z);
             if (maxSize > 50 || maxSize < 0.1) {
                  const scaleFactor = 8.0 / maxSize;
                  loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
             }
             loadedModel.position.x += 2; // Offset
        }

        loadedModel.name = "loaded_glb";
        
        // Store Metadata for Reports
        loadedModel.userData.sourceUrl = url;
        loadedModel.userData.filename = filename;
        
        // Enable shadows/casting for all meshes in the model
        loadedModel.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance material if it looks too flat (optional)
                if (child.material && child.material.envMapIntensity < 1) {
                    child.material.envMapIntensity = 1.0; 
                }
            }
        });

        appState.scene.add(loadedModel);
        appState.currentDisplayObject = loadedModel;

        // Select the new object immediately and enable Move mode
        attachTransformControls(loadedModel);
        if (appState.transformControls) appState.transformControls.setMode('translate');

        // History / State tracking
        if (!isAppend) {
             appState.initialObjectState = {
                 position: { x: loadedModel.position.x, y: loadedModel.position.y, z: loadedModel.position.z },
                 rotation: { x: THREE.MathUtils.radToDeg(loadedModel.rotation.x), y: THREE.MathUtils.radToDeg(loadedModel.rotation.y), z: THREE.MathUtils.radToDeg(loadedModel.rotation.z) },
                 scale: { x: loadedModel.scale.x, y: loadedModel.scale.y, z: loadedModel.scale.z }
             };
             appState.currentObjectState = JSON.parse(JSON.stringify(appState.initialObjectState));
             appState.historyStates.length = 0; 
             appState.historyStates.push(JSON.parse(JSON.stringify(appState.initialObjectState)));
             
             const modelHistoryEntry = {
                 url: url,
                 name: `${filename}`,
                 index: appState.historyStates.length
             };

             updateInitialStateButton(modelHistoryEntry);
             if (appState.historyStates.length > 1) {
                addModelHistorySpan(modelHistoryEntry);
             }
        }
         
        addMessageToChat('system', isAppend ? 'Model added to scene.' : '3D model loaded.');
        loadedSuccessfully = true;
        
        // Update Feature Tree
        updateFeatureTree();

        // Fit view to the entire assembly
        setTimeout(() => fitGeometryView(), 100);

    } catch (error) {
        console.error("Error loading GLB:", error);
        addMessageToChat('agent', `⚠️ Error loading 3D model: ${error.message || 'Unknown error'}`);
        if (!isAppend) createInitialCube();
    } finally {
         toggleLoading(false);
         return loadedSuccessfully;
    }
}

export function createInitialCube() {
     if (appState.currentDisplayObject) return;
     
     // Modern "Pion Blue" metallic cube
     const geometry = new THREE.BoxGeometry(4, 4, 4);
     const material = new THREE.MeshPhysicalMaterial({ 
         color: 0x3b82f6, // Blue-500
         metalness: 0.1, 
         roughness: 0.2,
         clearcoat: 1.0,
         clearcoatRoughness: 0.1,
         envMapIntensity: 1.5
     });
     
     const cube = new THREE.Mesh(geometry, material);
     cube.name = "fallback_cube";
     cube.userData.filename = "Default Cube";
     cube.userData.sourceUrl = "Generated";
     cube.castShadow = true;
     cube.receiveShadow = true;
     
     appState.scene.add(cube);
     appState.currentDisplayObject = cube;
     attachTransformControls(cube);
     
     appState.initialObjectState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
     appState.currentObjectState = JSON.parse(JSON.stringify(appState.initialObjectState));
     appState.historyStates[0] = JSON.parse(JSON.stringify(appState.initialObjectState));
     
     updateInitialStateButton({ url: null, name: 'Basic Cube', index: 0 });
     updateFeatureTree();
     
     // Center view on the new cube
     setTimeout(() => fitGeometryView(), 50);
}

export function applyStateToObject(state) {
     if (!appState.currentDisplayObject || !state) return;
     const pos = state.position || { x: 0, y: 0, z: 0 };
     const rot = state.rotation || { x: 0, y: 0, z: 0 };
     const sca = state.scale || { x: 1, y: 1, z: 1 };
     const minScale = 0.01;

     appState.currentDisplayObject.position.set(pos.x, pos.y, pos.z);
     appState.currentDisplayObject.rotation.set(THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), THREE.MathUtils.degToRad(rot.z));
     appState.currentDisplayObject.scale.set(Math.max(minScale, sca.x), Math.max(minScale, sca.y), Math.max(minScale, sca.z));
}

export function updateDesign(params) {
     if (!appState.currentDisplayObject) {
         addMessageToChat('agent', '⚠️ Cannot apply parameters, no 3D object is loaded.');
         return null;
     }
     const newState = JSON.parse(JSON.stringify(appState.currentObjectState));
     newState.position.x = parseFloat(params.x ?? newState.position.x);
     newState.position.y = parseFloat(params.y ?? newState.position.y);
     newState.position.z = parseFloat(params.z ?? newState.position.z);
     newState.rotation.x = parseFloat(params.rot_x ?? newState.rotation.x);
     newState.rotation.y = parseFloat(params.rot_y ?? newState.rotation.y);
     newState.rotation.z = parseFloat(params.rot_z ?? newState.rotation.z);
     newState.scale.x = parseFloat(params.scale_x ?? newState.scale.x);
     newState.scale.y = parseFloat(params.scale_y ?? newState.scale.y);
     newState.scale.z = parseFloat(params.scale_z ?? newState.scale.z);

     applyStateToObject(newState);
     appState.currentObjectState = newState;
     return appState.currentObjectState;
}
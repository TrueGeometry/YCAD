// viewer.js
// Handles Three.js Scene, Camera, and Renderer.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'; // Import CSS2D
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { appState } from './state.js';
import { loadAndDisplayGLB } from './loader.js';
import { initCollisions, onDragStart, onDragMove, onDragEnd } from './collisions.js'; 
import { initOrigin } from './origin.js';
import { recordAction } from './recorder.js'; 
import { pushUndoState } from './history.js'; // Import History

const designCanvas = document.getElementById('design-canvas');
const displayArea = document.getElementById('design-display-area');

export const defaultGlbUrl = "https://s3-us-west-2.amazonaws.com/pion.truegeometry.com/geometryProgram//tmp/TGREC-da7882e70302eccc0b9e3537fb04a82c.glb";

const THEMES = {
    studio: {
        name: 'Studio',
        background: 0xf8f9fa,
        ambientColor: 0xffffff,
        ambientIntensity: 0.7,
        dirColor: 0xffffff,
        dirIntensity: 1.5,
        gridColor: 0x888888,
        gridOpacity: 0.2
    },
    dark: {
        name: 'Dark',
        background: 0x111827, // Gray 900
        ambientColor: 0x374151,
        ambientIntensity: 1.2,
        dirColor: 0xffffff,
        dirIntensity: 0.8,
        gridColor: 0x4b5563,
        gridOpacity: 0.2
    },
    midnight: {
        name: 'Midnight',
        background: 0x0f172a, // Slate 900
        ambientColor: 0x1e293b,
        ambientIntensity: 1.5,
        dirColor: 0x38bdf8, // Sky 400
        dirIntensity: 1.2,
        gridColor: 0x334155,
        gridOpacity: 0.4
    },
    sunset: {
        name: 'Sunset',
        background: 0xfff7ed, // Orange 50
        ambientColor: 0xffedd5,
        ambientIntensity: 0.9,
        dirColor: 0xf97316, // Orange 500
        dirIntensity: 1.0,
        gridColor: 0xfdba74,
        gridOpacity: 0.3
    }
};

export async function initThreeJS() {
    appState.scene = new THREE.Scene();

    // High Quality Render Settings
    appState.renderer = new THREE.WebGLRenderer({ 
        canvas: designCanvas, 
        antialias: true, 
        preserveDrawingBuffer: true
    });
    appState.renderer.setSize(displayArea.clientWidth, displayArea.clientHeight);
    appState.renderer.setPixelRatio(window.devicePixelRatio);
    appState.renderer.localClippingEnabled = true;
    
    // Shadows and Tone Mapping
    appState.renderer.shadowMap.enabled = true;
    appState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    appState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    appState.renderer.toneMappingExposure = 1.0;

    // --- CSS2D Renderer (Annotations) ---
    appState.labelRenderer = new CSS2DRenderer();
    appState.labelRenderer.setSize(displayArea.clientWidth, displayArea.clientHeight);
    appState.labelRenderer.domElement.style.position = 'absolute';
    appState.labelRenderer.domElement.style.top = '0px';
    appState.labelRenderer.domElement.style.pointerEvents = 'none'; // allow clicks to pass through
    displayArea.appendChild(appState.labelRenderer.domElement);

    try {
        const environment = new RoomEnvironment();
        const pmremGen = new THREE.PMREMGenerator( appState.renderer );
        appState.scene.environment = pmremGen.fromScene( environment ).texture;
        environment.dispose();
        pmremGen.dispose();
    } catch (e) { console.error(e); }

    const aspect = displayArea.clientWidth / displayArea.clientHeight;
    // Initial setup: Height = 20 units
    appState.camera = new THREE.OrthographicCamera(-10*aspect, 10*aspect, 10, -10, 0.1, 1000);
    appState.camera.position.set(8, 7, 12);
    appState.camera.lookAt(0, 0, 0);

    // --- Lighting Setup ---
    appState.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    appState.scene.add(appState.lights.ambient);

    appState.lights.directional = new THREE.DirectionalLight(0xffffff, 1.5);
    appState.lights.directional.position.set(10, 15, 10);
    appState.lights.directional.castShadow = true;
    appState.lights.directional.shadow.mapSize.width = 2048;
    appState.lights.directional.shadow.mapSize.height = 2048;
    appState.lights.directional.shadow.camera.near = 0.5;
    appState.lights.directional.shadow.camera.far = 50;
    appState.lights.directional.shadow.bias = -0.0005;
    
    // Expand shadow frustum for larger scenes
    const d = 20;
    appState.lights.directional.shadow.camera.left = -d;
    appState.lights.directional.shadow.camera.right = d;
    appState.lights.directional.shadow.camera.top = d;
    appState.lights.directional.shadow.camera.bottom = -d;
    
    appState.scene.add(appState.lights.directional);

    // --- Controls ---
    appState.controls = new OrbitControls(appState.camera, appState.renderer.domElement);
    appState.controls.enableDamping = true;
    appState.controls.dampingFactor = 0.05;

    // --- Transform Controls (Modernized) ---
    appState.transformControls = new TransformControls(appState.camera, appState.renderer.domElement);
    appState.transformControls.size = 0.8; // Sleeker size
    appState.transformControls.space = 'world';
    
    // Disable OrbitControls while dragging the gizmo
    appState.transformControls.addEventListener('dragging-changed', function (event) {
        appState.controls.enabled = !event.value;
        if (event.value) {
            // Drag START
            // Push Undo State here so we can undo this manual transform later
            pushUndoState();
            
            onDragStart(); // Collision start
        } else {
            // Drag END
            onDragEnd(); // Collision end
            
            // --- RECORD MANUAL TRANSFORM ---
            // When drag ends, record the new state of the object so it can be replayed.
            if (appState.currentDisplayObject && !appState.isReplaying) {
                const obj = appState.currentDisplayObject;
                recordAction('manual_transform', {
                    uuid: obj.uuid,
                    name: obj.name, // Helpful for debugging log
                    transform: {
                        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
                    }
                });
            }
        }
    });

    appState.transformControls.addEventListener('change', function () {
         if (appState.transformControls.dragging) onDragMove();
    });

    appState.scene.add(appState.transformControls);
    
    // Initialize Collision System elements
    initCollisions();

    // --- Grid ---
    const gridHelper = new THREE.GridHelper(40, 40, 0x888888, 0x888888);
    gridHelper.name = "GridHelper"; 
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.2;
    gridHelper.position.y = -0.01; // Avoid z-fight with floor objects
    appState.scene.add(gridHelper);
    appState.lights.grid = gridHelper;

    // --- Origin System ---
    initOrigin();

    // Apply Default Theme
    applyTheme('studio');

    // Initial Load
    await loadAndDisplayGLB(defaultGlbUrl);
    animate();
}

export function applyTheme(themeKey) {
    const theme = THEMES[themeKey] || THEMES['studio'];
    
    if (appState.scene) appState.scene.background = new THREE.Color(theme.background);
    
    if (appState.lights.ambient) {
        appState.lights.ambient.color.setHex(theme.ambientColor);
        appState.lights.ambient.intensity = theme.ambientIntensity;
    }
    
    if (appState.lights.directional) {
        appState.lights.directional.color.setHex(theme.dirColor);
        appState.lights.directional.intensity = theme.dirIntensity;
    }

    if (appState.lights.grid) {
        appState.lights.grid.material.color.setHex(theme.gridColor);
        appState.lights.grid.material.opacity = theme.gridOpacity;
        appState.lights.grid.material.needsUpdate = true;
    }
}

export function setTransformMode(mode) {
    if (appState.transformControls) {
        appState.transformControls.setMode(mode);
        // Highlight active button
        const transBtn = document.getElementById('translate-btn');
        const rotBtn = document.getElementById('rotate-btn');
        if (transBtn) transBtn.classList.toggle('active-mode', mode === 'translate');
        if (rotBtn) rotBtn.classList.toggle('active-mode', mode === 'rotate');
    }
}

export function attachTransformControls(object) {
    if (appState.transformControls) {
        if (object) {
            appState.selectedObject = object; // Select it regardless of fixed state
            
            if (!object.userData.isFixed) {
                appState.transformControls.attach(object);
                appState.transformControls.visible = true; // Ensure visible
            } else {
                appState.transformControls.detach();
                // If fixed, we effectively hide the gizmo functionality
            }
        } else {
            appState.transformControls.detach();
            appState.selectedObject = null;
        }
    }
}

export function onWindowResize() {
     if (!appState.camera || !appState.renderer || !displayArea) return;
     const width = displayArea.clientWidth;
     const height = displayArea.clientHeight;
     if (width === 0 || height === 0) return;
     
     // Correct resize for OrthographicCamera
     const aspect = width / height;
     const frustumHeight = 20; 
     
     appState.camera.left = -frustumHeight * aspect / 2;
     appState.camera.right = frustumHeight * aspect / 2;
     appState.camera.top = frustumHeight / 2;
     appState.camera.bottom = -frustumHeight / 2;
     
     appState.camera.updateProjectionMatrix();
     appState.renderer.setSize(width, height);
     
     if (appState.labelRenderer) {
         appState.labelRenderer.setSize(width, height);
     }
}

export function animate() {
    requestAnimationFrame(animate);
    if (appState.controls) appState.controls.update();
    if (appState.renderer && appState.scene && appState.camera) {
        appState.renderer.render(appState.scene, appState.camera);
        if (appState.labelRenderer) {
            appState.labelRenderer.render(appState.scene, appState.camera);
        }
    }
}

export function setCameraView(view) {
    if (!appState.camera || !appState.controls) return;
    
    const distance = 15;
    appState.controls.target.set(0, 0, 0);

    switch (view) {
        case 'front': 
            appState.camera.up.set(0, 1, 0);
            appState.camera.position.set(0, 0, distance); 
            break;
        case 'side': 
            appState.camera.up.set(0, 1, 0);
            appState.camera.position.set(distance, 0, 0); 
            break;
        case 'top': 
            appState.camera.up.set(0, 0, -1);
            appState.camera.position.set(0, distance, 0); 
            break;
        case 'iso': 
            appState.camera.up.set(0, 1, 0);
            appState.camera.position.set(distance, distance, distance); 
            break;
    }
    
    appState.camera.lookAt(0, 0, 0);
    appState.controls.update();
}

export function getTaggableObjects() {
    const list = [];
    if (!appState.scene) return list;
    
    appState.scene.traverse((child) => {
        // Filter out invisible objects to handle hidden demo geometry
        if (!child.visible) return;

        // Exclude internal helpers and system objects
        if (child.name === 'GridHelper' || child.name === 'Origin' || child.name === 'Work Features') return;
        if (child.type.includes('Light') || child.type.includes('Camera') || child.type.includes('Control')) return;
        if (child.type === 'LineSegments' || child.type === 'Line') return;

        // Interactive Roots
        // 1. Loaded GLB Root
        if (child.name === 'loaded_glb' || child.name === 'fallback_cube') {
             let rawName = child.userData.filename || child.name || 'Object';
             list.push({ name: rawName.replace(/\s+/g, '_'), uuid: child.uuid, object: child });
             // Continue traversal to find children if any are interactive (though roots usually suffice)
        }
        
        // 2. Parametric Shapes (direct children meshes)
        if (child.userData && child.userData.isParametric) {
             let rawName = child.name;
             list.push({ name: rawName.replace(/\s+/g, '_'), uuid: child.uuid, object: child });
        }

        // 3. Clones and Patterns (often just Meshes or Groups added to scene)
        if (child.parent === appState.scene && (child.isMesh || child.isGroup)) {
             // Avoid adding duplicates if already caught by loaded_glb check
             if (child.name !== 'loaded_glb' && child.name !== 'fallback_cube' && (!child.userData || !child.userData.isParametric)) {
                 let rawName = child.name || 'Object';
                 list.push({ name: rawName.replace(/\s+/g, '_'), uuid: child.uuid, object: child });
             }
        }
    });
    
    // Also explicitly add Work Features, checking visibility
    const origin = appState.scene.getObjectByName("Origin");
    if(origin && origin.visible) {
        origin.children.forEach(c => {
             if (c.visible) list.push({ name: c.name.replace(/\s+/g, '_'), uuid: c.uuid, object: c });
        });
    }
    const wf = appState.scene.getObjectByName("Work Features");
    if(wf && wf.visible) {
        wf.children.forEach(c => {
             if (c.visible) list.push({ name: c.name.replace(/\s+/g, '_'), uuid: c.uuid, object: c });
        });
    }

    return list;
}

export function fitGeometryView() {
    if (!appState.camera || !appState.controls || !appState.scene) return;

    const box = new THREE.Box3();
    let hasContent = false;

    appState.scene.children.forEach(child => {
        if ((child.name === 'loaded_glb' || child.name === 'fallback_cube') && child.visible) {
             child.updateMatrixWorld(true);
             const objBox = new THREE.Box3().setFromObject(child);
             if (!objBox.isEmpty()) {
                 box.union(objBox);
                 hasContent = true;
             }
        }
    });

    if (!hasContent || box.isEmpty()) return;

    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const direction = new THREE.Vector3().subVectors(appState.camera.position, appState.controls.target).normalize();
    const distance = 50; 
    
    appState.controls.target.copy(center);
    appState.camera.position.copy(center).add(direction.multiplyScalar(distance));
    
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const diameter = sphere.radius * 2 || 1;
    
    const frustumHeight = 20; 
    const aspect = (appState.camera.right - appState.camera.left) / (appState.camera.top - appState.camera.bottom);
    
    const padding = 0.8; 
    const zoomForHeight = frustumHeight / diameter;
    const zoomForWidth = (frustumHeight * aspect) / diameter;
    
    let newZoom = Math.min(zoomForHeight, zoomForWidth) * padding;
    newZoom = Math.min(Math.max(newZoom, 0.1), 100);
    
    appState.camera.zoom = newZoom;
    appState.camera.updateProjectionMatrix();
    appState.controls.update();
}
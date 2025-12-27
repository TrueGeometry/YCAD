// viewer.js
// Handles Three.js Scene, Camera, and Renderer.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { appState } from './state.js';
import { loadAndDisplayGLB } from './loader.js';
import { initCollisions, onDragStart, onDragMove, onDragEnd } from './collisions.js'; 
import { initOrigin } from './origin.js'; // Import Origin init

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
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true // Reduces z-fighting
    });
    appState.renderer.setSize(displayArea.clientWidth, displayArea.clientHeight);
    appState.renderer.setPixelRatio(window.devicePixelRatio);
    appState.renderer.localClippingEnabled = true;
    
    // Shadows and Tone Mapping
    appState.renderer.shadowMap.enabled = true;
    appState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    appState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    appState.renderer.toneMappingExposure = 1.0;

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
        if (event.value) onDragStart();
        else onDragEnd();
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
        // GridHelper uses vertex colors, need to traverse or recreate to change line colors perfectly, 
        // but setting material color tints it.
        // For cleaner look, we recreate or just tint. Tint is easier.
        appState.lights.grid.material.needsUpdate = true;
    }

    // Update Gizmo Colors? 
    // TransformControls are fairly standard, but we can ensure they pop against the bg.
}

export function setTransformMode(mode) {
    if (appState.transformControls) {
        appState.transformControls.setMode(mode);
        // Highlight active button
        document.getElementById('translate-btn').classList.toggle('active-mode', mode === 'translate');
        document.getElementById('rotate-btn').classList.toggle('active-mode', mode === 'rotate');
    }
}

export function attachTransformControls(object) {
    if (appState.transformControls) {
        if (object) {
            appState.transformControls.attach(object);
            appState.selectedObject = object;
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
     const frustumHeight = 20; // Maintain consistent vertical scale
     
     appState.camera.left = -frustumHeight * aspect / 2;
     appState.camera.right = frustumHeight * aspect / 2;
     appState.camera.top = frustumHeight / 2;
     appState.camera.bottom = -frustumHeight / 2;
     
     appState.camera.updateProjectionMatrix();
     appState.renderer.setSize(width, height);
}

export function animate() {
    requestAnimationFrame(animate);
    if (appState.controls) appState.controls.update();
    if (appState.renderer && appState.scene && appState.camera) appState.renderer.render(appState.scene, appState.camera);
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
        // 1. Content Roots (Loaded Models)
        const isModel = child.name === 'loaded_glb' || child.name === 'fallback_cube';
        
        // 2. Work Features (Planes, Axes, Points)
        // Check for specific userData types assigned in origin.js
        const isWorkFeature = child.userData && (
            child.userData.type === 'WorkPlane' || 
            child.userData.type === 'WorkAxis' || 
            child.userData.type === 'WorkPoint'
        );

        if (isModel || isWorkFeature) {
             let rawName = child.userData.filename || child.name || 'Object';
             
             // Sanitize for @mention (No spaces allowed in simple regex match)
             // Replace spaces with underscores
             const taggableName = rawName.replace(/\s+/g, '_');
             
             list.push({
                 name: taggableName, // This is what matches @Name
                 uuid: child.uuid,
                 object: child
             });
        }
    });
    return list;
}

export function fitGeometryView() {
    if (!appState.camera || !appState.controls || !appState.scene) return;

    const box = new THREE.Box3();
    let hasContent = false;

    // Check strict content roots (loaded_glb and fallback_cube)
    // This ignores helpers like Grid, Gizmos, Lights
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
    
    // 1. Move Camera Target to Center
    // We want to preserve the viewing angle but center the object.
    const direction = new THREE.Vector3().subVectors(appState.camera.position, appState.controls.target).normalize();
    const distance = 50; // Arbitrary safe distance for Ortho camera
    
    appState.controls.target.copy(center);
    appState.camera.position.copy(center).add(direction.multiplyScalar(distance));
    
    // 2. Adjust Zoom
    // Use bounding sphere diameter for a safe fit regardless of rotation
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const diameter = sphere.radius * 2 || 1;
    
    const frustumHeight = 20; // Fixed vertical units in our setup (see initThreeJS and onWindowResize)
    // Calculate aspect ratio from current camera frustum planes
    const aspect = (appState.camera.right - appState.camera.left) / (appState.camera.top - appState.camera.bottom);
    
    const padding = 0.8; // 0.8 means object takes 80% of screen
    
    // Determine zoom required to fit the diameter in both height and width
    // Visible Height = frustumHeight / zoom
    // Visible Width = (frustumHeight * aspect) / zoom
    
    const zoomForHeight = frustumHeight / diameter;
    const zoomForWidth = (frustumHeight * aspect) / diameter;
    
    let newZoom = Math.min(zoomForHeight, zoomForWidth) * padding;
    
    // Clamp zoom to reasonable limits (100 allows for very small objects)
    newZoom = Math.min(Math.max(newZoom, 0.1), 100);
    
    appState.camera.zoom = newZoom;
    appState.camera.updateProjectionMatrix();
    appState.controls.update();
}
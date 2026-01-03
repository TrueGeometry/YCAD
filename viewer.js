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
import { initOrigin, updateOriginScale } from './origin.js'; // Added updateOriginScale
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

    // --- Initialize Secondary Cameras for Split View ---
    const frustumSize = 20;
    // Top View Camera
    appState.cameraTop = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2, 
        frustumSize / 2, -frustumSize / 2, 
        0.1, 1000
    );
    appState.cameraTop.position.set(0, 50, 0);
    appState.cameraTop.up.set(0, 0, -1);
    appState.cameraTop.lookAt(0, 0, 0);

    // Front View Camera
    appState.cameraFront = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2, 
        frustumSize / 2, -frustumSize / 2, 
        0.1, 1000
    );
    appState.cameraFront.position.set(0, 0, 50);
    appState.cameraFront.up.set(0, 1, 0);
    appState.cameraFront.lookAt(0, 0, 0);

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

export function toggleSplitView() {
    appState.isSplitView = !appState.isSplitView;
    const btn = document.getElementById('split-view-btn');
    const overlay = document.getElementById('viewport-overlays');
    
    if (btn) btn.classList.toggle('active-mode', appState.isSplitView);
    if (overlay) overlay.style.display = appState.isSplitView ? 'block' : 'none';
    
    // Update camera aspects immediately
    onWindowResize();

    if (appState.isSplitView) {
        syncOrthoCameras();
    } else {
        appState.renderer.setScissorTest(false);
    }
}

function syncOrthoCameras() {
    if (!appState.camera || !appState.cameraTop || !appState.cameraFront) return;
    
    // Match zoom scale of main camera roughly, or auto-fit
    // Here we sync zoom if possible, or just re-fit view
    // Ortho zoom is simple multiplier.
    
    const zoom = appState.camera.zoom;
    appState.cameraTop.zoom = zoom;
    appState.cameraTop.updateProjectionMatrix();
    appState.cameraFront.zoom = zoom;
    appState.cameraFront.updateProjectionMatrix();
    
    // Look at same target as controls
    const target = appState.controls.target;
    appState.cameraTop.position.set(target.x, target.y + 50, target.z);
    appState.cameraTop.lookAt(target);
    
    appState.cameraFront.position.set(target.x, target.y, target.z + 50);
    appState.cameraFront.lookAt(target);
}

export function onWindowResize() {
     if (!appState.camera || !appState.renderer || !displayArea) return;
     const width = displayArea.clientWidth;
     const height = displayArea.clientHeight;
     if (width === 0 || height === 0) return;
     
     // 1. Correct resize for Main Camera (Orthographic)
     // In split view, the main camera takes up only the left half (width / 2)
     // We must calculate aspect ratio based on this EFFECTIVE width to prevent distortion.
     const effectiveWidth = appState.isSplitView ? width / 2 : width;
     const mainAspect = effectiveWidth / height;
     const frustumHeight = 20; 
     
     appState.camera.left = -frustumHeight * mainAspect / 2;
     appState.camera.right = frustumHeight * mainAspect / 2;
     appState.camera.top = frustumHeight / 2;
     appState.camera.bottom = -frustumHeight / 2;
     appState.camera.updateProjectionMatrix();
     
     // 2. Update secondary cameras aspect (Top/Front)
     // They occupy quadrants: (width/2) x (height/2). 
     // Aspect = (w/2) / (h/2) = w/h
     if (appState.cameraTop && appState.cameraFront) {
         const fullAspect = width / height; 
         
         [appState.cameraTop, appState.cameraFront].forEach(cam => {
             cam.left = -frustumHeight * fullAspect / 2;
             cam.right = frustumHeight * fullAspect / 2;
             cam.top = frustumHeight / 2;
             cam.bottom = -frustumHeight / 2;
             cam.updateProjectionMatrix();
         });
     }

     appState.renderer.setSize(width, height);
     
     if (appState.labelRenderer) {
         appState.labelRenderer.setSize(width, height);
     }
}

export function animate() {
    requestAnimationFrame(animate);
    if (appState.controls) appState.controls.update();
    
    if (appState.renderer && appState.scene && appState.camera) {
        
        const width = displayArea.clientWidth;
        const height = displayArea.clientHeight;

        if (appState.isSplitView) {
            appState.renderer.setScissorTest(true);
            
            // 1. Main View (Left Half)
            // Scissor: x, y, w, h (y is from bottom)
            appState.renderer.setScissor(0, 0, width / 2, height);
            appState.renderer.setViewport(0, 0, width / 2, height);
            appState.renderer.setClearColor(0x000000, 0); // Transparent (use CSS bg) or inherit
            // Adjust camera aspect for left half
            // NOTE: Ortho camera handles aspect via frustum planes in resize, not just aspect prop.
            // Visually we just render into the rect.
            appState.renderer.render(appState.scene, appState.camera);
            
            // Render Labels/Annotations only on main view?
            if (appState.labelRenderer) {
                // CSS2D doesn't support scissors natively. It overlays the whole div.
                // We keep it rendering using the main camera, which matches the left view transform roughly if aspect matches.
                // However, CSS2D overlay will float over everything.
                appState.labelRenderer.render(appState.scene, appState.camera);
            }

            // 2. Top View (Top Right Quadrant)
            // x = width/2, y = height/2
            appState.renderer.setScissor(width / 2, height / 2, width / 2, height / 2);
            appState.renderer.setViewport(width / 2, height / 2, width / 2, height / 2);
            // Slight background tint to distinguish
            appState.renderer.setClearColor(new THREE.Color(0xf0fdf4), 1); // Light Green tint
            appState.renderer.render(appState.scene, appState.cameraTop);

            // 3. Front View (Bottom Right Quadrant)
            // x = width/2, y = 0
            appState.renderer.setScissor(width / 2, 0, width / 2, height / 2);
            appState.renderer.setViewport(width / 2, 0, width / 2, height / 2);
            appState.renderer.setClearColor(new THREE.Color(0xeff6ff), 1); // Light Blue tint
            appState.renderer.render(appState.scene, appState.cameraFront);
            
            // Reset background for next frame main render
            // The main render relies on scene.background usually.
            // setClearColor overrides if no background texture.
            if (appState.scene.background) {
                appState.renderer.setClearColor(0x000000, 0);
            }

        } else {
            appState.renderer.setScissorTest(false);
            appState.renderer.setViewport(0, 0, width, height);
            appState.renderer.render(appState.scene, appState.camera);
            if (appState.labelRenderer) {
                appState.labelRenderer.render(appState.scene, appState.camera);
            }
        }
    }
}

// Helper: Get Bounding Box of all visible user content
function getVisibleBounds() {
    const box = new THREE.Box3();
    let hasContent = false;

    if (!appState.scene) return { box, hasContent };

    appState.scene.traverse(child => {
        if (child.visible && (child.isMesh || child.isGroup)) {
             // Exclude system
             if (child.name === 'GridHelper' || child.name === 'Origin' || child.name === 'Work Features') return;
             if (child.type.includes('Control') || child.type.includes('Camera') || child.type.includes('Light')) return;
             
             // System flag check
             if (child.userData && child.userData.isSystem) return;
             
             const objBox = new THREE.Box3().setFromObject(child);
             if (!objBox.isEmpty()) {
                 box.union(objBox);
                 hasContent = true;
             }
        }
    });
    return { box, hasContent };
}

export function setCameraView(view) {
    if (!appState.camera || !appState.controls) return;
    
    // 1. Get Scene Bounds to Center Camera
    const { box, hasContent } = getVisibleBounds();
    const center = hasContent ? new THREE.Vector3() : new THREE.Vector3(0,0,0);
    
    if (hasContent && !box.isEmpty()) {
        box.getCenter(center);
    }

    // 2. Set Target to Center of Object(s)
    appState.controls.target.copy(center);

    // 3. Determine Orientation Vector
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0); // Default Up

    switch (view) {
        case 'front': dir.set(0, 0, 1); break;
        case 'back':  dir.set(0, 0, -1); break;
        case 'right': 
        case 'side':  dir.set(1, 0, 0); break;
        case 'left':  dir.set(-1, 0, 0); break;
        case 'top':   dir.set(0, 1, 0); up.set(0, 0, -1); break;
        case 'bottom':dir.set(0, -1, 0); up.set(0, 0, 1); break;
        case 'iso':   dir.set(1, 1, 1).normalize(); break;
        default:      dir.set(0, 0, 1); break; // Default Front
    }

    // 4. Set Camera Position (Center + Direction)
    // Note: The distance will be adjusted by fitGeometryView immediately after.
    // We just need to establish the vector.
    appState.camera.position.copy(center).add(dir);
    appState.camera.up.copy(up);
    appState.camera.lookAt(center);
    
    appState.controls.update();
    
    // 5. Fit View (Handles Zoom, Near/Far clipping, and Distance)
    fitGeometryView();
    
    // Sync split cameras if active
    if (appState.isSplitView) syncOrthoCameras();
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
        
        // Exclude Lines UNLESS they are Parametric Sketches (have userData.isParametric)
        // Fixed: Include LineSegments so MakerJS geometries are selectable/taggable
        const isSketch = (child.type === 'Line' || child.type === 'LineLoop' || child.type === 'LineSegments') && child.userData && child.userData.isParametric;

        if (!isSketch && (child.type === 'LineSegments' || child.type === 'Line' || child.type === 'LineLoop')) return;

        // Interactive Roots
        // 1. Loaded GLB Root
        if (child.name === 'loaded_glb' || child.name === 'fallback_cube') {
             let rawName = child.userData.filename || child.name || 'Object';
             list.push({ name: rawName.replace(/\s+/g, '_'), uuid: child.uuid, object: child });
             // Continue traversal to find children if any are interactive (though roots usually suffice)
        }
        
        // 2. Parametric Shapes (direct children meshes OR sketches)
        if (child.userData && child.userData.isParametric) {
             // Prioritize userData.filename, especially if renamed via /tag_last
             let rawName = child.userData.filename || child.name; 
             list.push({ name: rawName.replace(/\s+/g, '_'), uuid: child.uuid, object: child });
        }

        // 3. Clones and Patterns (often just Meshes or Groups added to scene)
        if (child.parent === appState.scene && (child.isMesh || child.isGroup)) {
             // Avoid adding duplicates if already caught by loaded_glb check
             if (child.name !== 'loaded_glb' && child.name !== 'fallback_cube' && (!child.userData || !child.userData.isParametric)) {
                 let rawName = child.userData.filename || child.name || 'Object';
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

export function fitGeometryView(manualSize = null) {
    if (!appState.camera || !appState.controls || !appState.scene) return;

    // Use shared helper
    const { box, hasContent } = getVisibleBounds();

    if ((!hasContent || box.isEmpty()) && !manualSize) return;

    const center = new THREE.Vector3();
    if (!box.isEmpty()) box.getCenter(center);
    
    // Determine target Radius/Size
    let radius = 10;
    if (manualSize) {
        radius = parseFloat(manualSize) / 2.0;
    } else {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        radius = sphere.radius;
    }
    
    if (radius <= 0.001) radius = 1;

    // 1. Position Camera
    // Move camera back along its current vector relative to target
    // We want the camera to be comfortably outside the bounding sphere.
    const currentDir = new THREE.Vector3().subVectors(appState.camera.position, appState.controls.target).normalize();
    if (currentDir.lengthSq() < 0.1) currentDir.set(0, 0, 1); 
    
    // Distance calculation: Ensure we are far enough to not clip "Near" plane if we reset it.
    // For Ortho, placement distance doesn't affect perspective, but it does affect Near/Far clipping.
    // We place camera far away and set Planes to cover the object.
    const distance = Math.max(50, radius * 4);
    
    const newPos = center.clone().add(currentDir.multiplyScalar(distance));
    appState.camera.position.copy(newPos);
    appState.controls.target.copy(center);
    
    // 2. Adjust Planes dynamically for large objects
    // Near must be small positive. Far must be large enough to see past the object.
    // Object spans [center - radius] to [center + radius].
    // Camera is at [center + distance].
    // Depth needed is approx distance + radius.
    appState.camera.near = 0.1;
    appState.camera.far = distance + radius * 10 + 1000; // Generous buffer
    
    // 3. Adjust Zoom (Frustum Size)
    const frustumHeight = 20; // The base frustum height used in onWindowResize
    const diameter = radius * 2;
    
    // Calculate aspect ratio
    const width = displayArea.clientWidth;
    const height = displayArea.clientHeight;
    const effectiveWidth = appState.isSplitView ? width / 2 : width;
    const aspect = effectiveWidth / height;
    
    const padding = 0.8; // fit within 80% of screen
    
    const zoomForHeight = frustumHeight / diameter;
    const zoomForWidth = (frustumHeight * aspect) / diameter;
    
    let newZoom = Math.min(zoomForHeight, zoomForWidth) * padding;
    
    // Clamp zoom to prevent degenerate values
    newZoom = Math.min(Math.max(newZoom, 0.0001), 100);
    
    appState.camera.zoom = newZoom;
    appState.camera.updateProjectionMatrix();
    appState.controls.update();
    
    // 4. Update Origin Scale to match scene size
    updateOriginScale(radius);
    
    if (appState.isSplitView) syncOrthoCameras();
}
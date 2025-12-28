// collisions.js
// Handles precise collision detection using BVH (Bounding Volume Hierarchy).

import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';

// Extend Three.js geometry with BVH functionality
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

let isEnabled = false;
let warningEl = null;

// Store meshes for the duration of a drag
let movingMeshes = [];
let staticMeshes = [];
let staticBoxes = []; // Optimization: Broadphase boxes

export function initCollisions() {
    warningEl = document.getElementById('collision-warning');
}

export function toggleCollisions() {
    isEnabled = !isEnabled;
    const btn = document.getElementById('collision-btn');
    if (btn) btn.classList.toggle('active-mode', isEnabled);
    
    if (isEnabled) {
        addMessageToChat('system', 'Collision Warning enabled. Using high-precision mesh detection.');
    } else {
        addMessageToChat('system', 'Collision Warning disabled.');
        if (warningEl) warningEl.style.display = 'none';
    }
}

function getMeshes(object) {
    const meshes = [];
    object.traverse(child => {
        if (child.isMesh && child.visible) meshes.push(child);
    });
    return meshes;
}

// Called when Drag Starts
export function onDragStart() {
    if (!isEnabled || !appState.currentDisplayObject) return;
    
    movingMeshes = [];
    staticMeshes = [];
    staticBoxes = []; // Clear broadphase cache
    
    const movingRoot = appState.currentDisplayObject;
    const movingUuid = movingRoot.uuid;

    // 1. Identify Moving Meshes
    movingMeshes = getMeshes(movingRoot);
    
    // Ensure BVH for moving meshes
    movingMeshes.forEach(mesh => {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundsTree) {
             mesh.geometry.computeBoundsTree();
        }
    });

    // 2. Identify Static Meshes
    appState.scene.traverse((node) => {
        if (!node.isMesh || !node.visible) return;
        
        // Exclude moving object hierarchy
        let p = node;
        let isMoving = false;
        while(p) {
            if (p.uuid === movingUuid) { isMoving = true; break; }
            p = p.parent;
        }
        if (isMoving) return;

        // Exclude Controls/Helpers
        let isControl = false;
        let curr = node;
        while(curr) {
            if (curr.type === 'TransformControls' || 
                curr.type === 'TransformControlsGizmo' || 
                curr.type === 'TransformControlsPlane') {
                isControl = true;
                break;
            }
            if (appState.transformControls && curr === appState.transformControls) {
                isControl = true;
                break;
            }
            curr = curr.parent;
        }
        if (isControl) return;
        if (node.type === 'GridHelper' || node.name === 'GridHelper') return;
        if (node.type === 'Box3Helper' || node.type === 'PlaneHelper' || node.type === 'Line') return;

        // Exclude Work Geometry / Origin (Planes, Axes, Points)
        if (node.userData && (node.userData.type === 'WorkPlane' || node.userData.type === 'WorkAxis' || node.userData.type === 'WorkPoint')) return;
        
        // Exclude specific system groups by parent name if userData isn't sufficient
        if (node.parent && (node.parent.name === 'Origin' || node.parent.name === 'Work Features')) return;
        
        // Also exclude the default origin center point mesh if it's just a Mesh
        if (node.name === 'Center Point') return;

        // It is a static mesh
        staticMeshes.push(node);
    });

    // 3. Prepare Static Meshes (Compute BVH and AABB for broadphase)
    staticMeshes.forEach(mesh => {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundsTree) {
            mesh.geometry.computeBoundsTree();
        }
        // Cache World AABB for fast broadphase
        const box = new THREE.Box3().setFromObject(mesh);
        staticBoxes.push({ mesh, box });
    });
}

// Called when Object Moves (every frame during drag)
export function onDragMove() {
    if (!isEnabled || movingMeshes.length === 0 || staticMeshes.length === 0) return;
    if (!warningEl) return;

    let isColliding = false;
    
    // Check every moving mesh against every static mesh
    // Optimization: Check Broadphase AABB first
    
    for (const mover of movingMeshes) {
        // Calculate mover world box once per frame
        const moverBox = new THREE.Box3().setFromObject(mover);

        for (const staticObj of staticBoxes) {
            
            // Broadphase: AABB Overlap
            if (moverBox.intersectsBox(staticObj.box)) {
                
                // Narrowphase: BVH Intersection
                const staticMesh = staticObj.mesh;
                
                // Transform staticMesh into mover's local space
                // Matrix = MoverWorldInverse * StaticWorld
                const transformMatrix = new THREE.Matrix4()
                    .copy(mover.matrixWorld)
                    .invert()
                    .multiply(staticMesh.matrixWorld);
                
                if (mover.geometry.boundsTree && staticMesh.geometry.boundsTree) {
                    // Check intersection
                     const hit = mover.geometry.boundsTree.intersectsGeometry(
                        staticMesh.geometry, // PASS THE GEOMETRY, NOT THE TREE
                        transformMatrix
                    );
                    
                    if (hit) {
                        isColliding = true;
                        break; 
                    }
                }
            }
        }
        if (isColliding) break;
    }
    
    warningEl.style.display = isColliding ? 'block' : 'none';
}

// Called when Drag Ends
export function onDragEnd() {
    if (warningEl) warningEl.style.display = 'none';
}
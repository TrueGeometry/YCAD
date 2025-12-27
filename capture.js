// capture.js
// Handles capturing images from the Three.js scene

import * as THREE from 'three';
import { appState } from './state.js';

// Helper to draw labels on a 2D canvas over the 3D render
function drawLabels(ctx, targets, camera, width, height) {
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';
    
    targets.forEach(obj => {
        if (!obj.visible) return;
        const name = obj.userData.filename || obj.name;
        
        const box = new THREE.Box3().setFromObject(obj);
        if (box.isEmpty()) return;
        
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const screenPos = center.clone().project(camera);
        // Check Visibility (NDC z should be -1 to 1)
        if (Math.abs(screenPos.z) > 1) return;

        // Convert to Pixels
        const x = (screenPos.x * 0.5 + 0.5) * width;
        const y = -(screenPos.y * 0.5 - 0.5) * height;

        // Bounds Check (looser to allow labels near edge)
        if (x < -50 || x > width + 50 || y < -50 || y > height + 50) return;

        // Label Position (Offset)
        const offsetX = 30;
        const offsetY = -30;
        let labelX = x + offsetX;
        let labelY = y + offsetY;

        const textMetrics = ctx.measureText(name);
        const padding = 8;
        const textWidth = textMetrics.width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 24;

        // Draw Line/Arrow
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(labelX, labelY + boxHeight/2); 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dot at Object
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6'; // Blue dot
        ctx.fill();
        ctx.stroke();

        // Draw Label Background
        ctx.fillStyle = 'rgba(31, 41, 55, 0.85)'; // Dark gray
        ctx.strokeStyle = '#3b82f6'; // Blue border
        ctx.lineWidth = 1;

        // Simple rounded rect path
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(labelX + r, labelY);
        ctx.lineTo(labelX + boxWidth - r, labelY);
        ctx.quadraticCurveTo(labelX + boxWidth, labelY, labelX + boxWidth, labelY + r);
        ctx.lineTo(labelX + boxWidth, labelY + boxHeight - r);
        ctx.quadraticCurveTo(labelX + boxWidth, labelY + boxHeight, labelX + boxWidth - r, labelY + boxHeight);
        ctx.lineTo(labelX + r, labelY + boxHeight);
        ctx.quadraticCurveTo(labelX, labelY + boxHeight, labelX, labelY + boxHeight - r);
        ctx.lineTo(labelX, labelY + r);
        ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, labelX + padding, labelY + boxHeight/2);
    });
}

// Internal snapshot function that handles isolation, framing, rendering, and annotating
function takeSnapshot({ targetsToIsolate, targetsToAnnotate, fitCamera }) {
    if (!appState.renderer || !appState.scene || !appState.camera) return null;

    const { renderer, scene, camera, controls } = appState;
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;

    // 1. Backup State
    const originalCamPos = camera.position.clone();
    const originalCamRot = camera.rotation.clone();
    const originalCamZoom = camera.zoom;
    const originalTarget = controls.target.clone();
    const originalVisibilities = new Map();
    const originalGizmoVisible = appState.transformControls ? appState.transformControls.visible : false;
    const grid = scene.getObjectByName("GridHelper");
    const originalGridVisible = grid ? grid.visible : false;

    // 2. Isolate Targets (Hide everything else)
    if (targetsToIsolate && targetsToIsolate.length > 0) {
        if (appState.transformControls) appState.transformControls.visible = false;
        if (grid) grid.visible = false;

        // We want to hide "Content Roots" (loaded models) that don't contain our targets.
        // And ensure our targets are visible.
        
        scene.traverse(obj => {
             // Identify Content Roots by name convention from loader.js
             if (obj.parent === scene && (obj.name === 'loaded_glb' || obj.name === 'fallback_cube')) {
                 if (!originalVisibilities.has(obj)) originalVisibilities.set(obj, obj.visible);
                 obj.visible = false;
             }
        });

        // Show targets and their parents
        targetsToIsolate.forEach(target => {
            let curr = target;
            while(curr && curr !== scene) {
                // If we hid this object (it was a root), or its parent, restore visibility
                // Note: we only stored visibility for roots, but setting true is safe.
                curr.visible = true;
                curr = curr.parent;
            }
        });
    }

    // 3. Frame Camera
    if (fitCamera && targetsToIsolate && targetsToIsolate.length > 0) {
        const box = new THREE.Box3();
        targetsToIsolate.forEach(t => box.expandByObject(t));
        
        if (!box.isEmpty()) {
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 2;
            
            // Set View
            const dist = maxDim * 2.0;
            camera.position.set(center.x + dist, center.y + dist, center.z + dist);
            camera.lookAt(center);
            
            // Adjust Zoom for Orthographic Camera
            const currentFrustumHeight = (camera.top - camera.bottom);
            const targetHeight = maxDim * 1.5;
            camera.zoom = currentFrustumHeight / targetHeight;
            camera.updateProjectionMatrix();
        }
    }

    // 4. Render 3D Scene
    renderer.render(scene, camera);

    // 5. Create Composite Canvas (3D Render + 2D Annotations)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw 3D Render
    ctx.drawImage(renderer.domElement, 0, 0);
    
    // Draw Annotations
    if (targetsToAnnotate && targetsToAnnotate.length > 0) {
        drawLabels(ctx, targetsToAnnotate, camera, width, height);
    }

    const dataUrl = canvas.toDataURL('image/png');

    // 6. Restore State
    camera.position.copy(originalCamPos);
    camera.rotation.copy(originalCamRot);
    camera.zoom = originalCamZoom;
    controls.target.copy(originalTarget);
    camera.updateProjectionMatrix();

    if (appState.transformControls) appState.transformControls.visible = originalGizmoVisible;
    if (grid) grid.visible = originalGridVisible;

    originalVisibilities.forEach((visible, obj) => {
        obj.visible = visible;
    });
    
    // Re-render main scene to avoid flicker
    renderer.render(scene, camera);

    return dataUrl;
}

export function captureAnnotatedImage() {
    // Identify all visible "Content Roots" for annotation context
    const targets = [];
    appState.scene.traverse((child) => {
        if ((child.name === 'loaded_glb' || child.name === 'fallback_cube') && child.visible) {
            targets.push(child);
        }
    });
    
    return takeSnapshot({
        targetsToIsolate: null, // Don't hide anything
        targetsToAnnotate: targets,
        fitCamera: false
    });
}

export function captureComponentSnapshot(targetObject) {
    return takeSnapshot({
        targetsToIsolate: [targetObject],
        targetsToAnnotate: [targetObject],
        fitCamera: true
    });
}

export function captureGroupSnapshot(targetObjects) {
    return takeSnapshot({
        targetsToIsolate: targetObjects,
        targetsToAnnotate: targetObjects,
        fitCamera: true
    });
}

// report.js
// Generates engineering reports for Assembly and individual components.

import * as THREE from 'three';
import { appState } from './state.js';
import { addMessageToChat } from './ui.js';
import { computePhysicalProperties } from './properties.js';
import { isSectionMode, sectionPlane } from './section.js';

export function getSceneStructure() {
    const structure = [];
    if (!appState.scene) return structure;

    appState.scene.traverse((child) => {
        // Filter for top-level interactive objects that the user has loaded or created
        if (child.name === 'loaded_glb' || child.name === 'fallback_cube') {
            // Calculate World Bounding Box
            const box = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            // Format Rotation to degrees for readability
            const rot = {
                x: parseFloat(THREE.MathUtils.radToDeg(child.rotation.x).toFixed(2)),
                y: parseFloat(THREE.MathUtils.radToDeg(child.rotation.y).toFixed(2)),
                z: parseFloat(THREE.MathUtils.radToDeg(child.rotation.z).toFixed(2))
            };

            // Format Position
            const pos = {
                 x: parseFloat(child.position.x.toFixed(4)),
                 y: parseFloat(child.position.y.toFixed(4)),
                 z: parseFloat(child.position.z.toFixed(4))
            };

            // Dimensions
            const dims = {
                width: parseFloat(size.x.toFixed(4)),
                height: parseFloat(size.y.toFixed(4)),
                depth: parseFloat(size.z.toFixed(4))
            };

            // Physical Properties
            const physics = computePhysicalProperties(child);
            const physical_props = physics ? {
                mass: parseFloat(physics.mass.toFixed(2)),
                volume: parseFloat(physics.volume.toFixed(2)),
                surface_area: parseFloat(physics.area.toFixed(2)),
                center_of_mass: {
                    x: parseFloat(physics.centerOfMass.x.toFixed(4)),
                    y: parseFloat(physics.centerOfMass.y.toFixed(4)),
                    z: parseFloat(physics.centerOfMass.z.toFixed(4))
                }
            } : null;

            // Custom Properties (User Data)
            const custom_props = {};
            if (child.userData) {
                Object.keys(child.userData).forEach(key => {
                    // Filter internal keys
                    if (key !== 'filename' && key !== 'sourceUrl') {
                        custom_props[key] = child.userData[key];
                    }
                });
            }

            structure.push({
                component_name: child.userData.filename || child.name,
                position_world: pos,
                orientation_deg: rot,
                bounding_box_dims: dims,
                physical_properties: physical_props,
                custom_properties: custom_props
            });
        }
    });
    return structure;
}

export function generateReport() {
    const models = [];
    appState.scene.traverse((child) => {
        // Collect root objects of loaded files
        if (child.name === 'loaded_glb' || child.name === 'fallback_cube') {
            models.push(child);
        }
    });

    if (models.length === 0) {
         addMessageToChat('system', 'Cannot generate report: No models loaded.');
         return;
    }
    addMessageToChat('system', 'Generating Comprehensive Data Sheet...');

    const { camera, scene, renderer, controls } = appState;

    // --- State Backup ---
    const originalCameraPos = camera.position.clone();
    const originalCameraRot = camera.rotation.clone();
    const originalCameraZoom = camera.zoom;
    const originalControlsTarget = controls.target.clone();
    const originalClipping = renderer.clippingPlanes;
    
    // Helpers to hide
    const grid = scene.getObjectByName("GridHelper");
    const wasGridVisible = grid ? grid.visible : true;
    if(grid) grid.visible = false;
    
    if(appState.transformControls) appState.transformControls.visible = false;

    // --- Capture Function ---
    const capture = (target, offset, lookAt, withSection) => {
        camera.position.copy(target).add(offset);
        camera.lookAt(lookAt);
        camera.updateProjectionMatrix();
        
        if(withSection) {
             // For simplicity in report, force double side on everything visible
             scene.traverse(c => { if(c.isMesh && c.visible) c.material.side = THREE.DoubleSide; });
             if (sectionPlane.normal.lengthSq() === 0) sectionPlane.normal.set(1,0,0);
             renderer.clippingPlanes = [sectionPlane];
        } else {
            renderer.clippingPlanes = [];
        }

        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
    };

    // --- 1. Assembly Calculation & Snapshots ---
    
    // Ensure all models visible for assembly view
    models.forEach(m => m.visible = true);
    
    // Compute Assembly Bounding Box
    const assemblyBox = new THREE.Box3();
    models.forEach(m => assemblyBox.expandByObject(m));
    const assemblyCenter = new THREE.Vector3();
    assemblyBox.getCenter(assemblyCenter);
    const assemblySize = new THREE.Vector3();
    assemblyBox.getSize(assemblySize);
    const maxDim = Math.max(assemblySize.x, assemblySize.y, assemblySize.z) || 10;
    const dist = maxDim * 1.5; 

    // Capture Assembly Images
    const assemblyImgs = {
        iso: capture(assemblyCenter, new THREE.Vector3(dist, dist, dist), assemblyCenter, false),
        top: capture(assemblyCenter, new THREE.Vector3(0, dist, 0), assemblyCenter, false),
        front: capture(assemblyCenter, new THREE.Vector3(0, 0, dist), assemblyCenter, false),
        side: capture(assemblyCenter, new THREE.Vector3(dist, 0, 0), assemblyCenter, false)
    };

    // Calculate Combined Properties
    let totalMass = 0;
    let totalVolume = 0;
    let combinedCom = new THREE.Vector3(0,0,0);
    const componentData = [];

    for (const model of models) {
        const props = computePhysicalProperties(model);
        if(props) {
            totalMass += props.mass;
            totalVolume += props.volume;
            // Weighted COM (props.centerOfMass is in World Coordinates)
            combinedCom.add(props.centerOfMass.clone().multiplyScalar(props.mass));
            
            componentData.push({
                name: model.userData.filename || model.name,
                url: model.userData.sourceUrl || "N/A",
                props: props,
                object: model,
                // Capture Transform Data
                position: model.position.clone(),
                rotation: model.rotation.clone()
            });
        }
    }

    if(totalMass > 0) combinedCom.divideScalar(totalMass);

    // --- 2. Calculate Distances and Orientation Strings ---
    componentData.forEach(comp => {
        comp.distToGlobalCOM = comp.props.centerOfMass.distanceTo(combinedCom);
        comp.rotDeg = {
            x: THREE.MathUtils.radToDeg(comp.rotation.x),
            y: THREE.MathUtils.radToDeg(comp.rotation.y),
            z: THREE.MathUtils.radToDeg(comp.rotation.z)
        };
    });

    // --- 3. Generate Tables HTML ---

    const bomTableRows = componentData.map(c => `
        <tr>
            <td>${c.name}</td>
            <td style="font-size:0.8em; color:#666;">${c.url}</td>
            <td>${c.props.mass.toFixed(2)}</td>
        </tr>
    `).join('');

    const placementTableRows = componentData.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.position.x.toFixed(2)}, ${c.position.y.toFixed(2)}, ${c.position.z.toFixed(2)}</td>
            <td>${c.rotDeg.x.toFixed(1)}°, ${c.rotDeg.y.toFixed(1)}°, ${c.rotDeg.z.toFixed(1)}°</td>
            <td>${c.distToGlobalCOM.toFixed(3)}</td>
        </tr>
    `).join('');


    // --- 4. Component Individual Snapshots & HTML ---
    
    const componentSectionsHTML = componentData.map((comp, index) => {
        // Isolate Component
        models.forEach(m => m.visible = false);
        comp.object.visible = true;

        // Auto-Fit Camera to Component
        const box = new THREE.Box3().setFromObject(comp.object);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        const cDist = Math.max(size.x, size.y, size.z) * 1.5 || 10;

        const imgIso = capture(center, new THREE.Vector3(cDist, cDist, cDist), center, false);
        const imgTop = capture(center, new THREE.Vector3(0, cDist, 0), center, false);
        const imgFront = capture(center, new THREE.Vector3(0, 0, cDist), center, false);
        const imgSide = capture(center, new THREE.Vector3(cDist, 0, 0), center, false);

        // Render Custom Properties if any
        let customPropsHTML = '';
        if (comp.object.userData) {
            const props = Object.entries(comp.object.userData)
                .filter(([k]) => k !== 'filename' && k !== 'sourceUrl')
                .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
                .join('');
            
            if (props) {
                customPropsHTML = `
                <h3 style="margin-top:20px;">Custom Properties</h3>
                <table>${props}</table>
                `;
            }
        }

        return `
            <div class="page-break"></div>
            <div class="header">
                <div><h2>Component: ${comp.name}</h2></div>
                <div style="font-size:12px; color:#666;">Source: ${comp.url}</div>
            </div>
            <div class="grid-container">
                 <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="view-card"><img src="${imgIso}"><div class="view-label">Isometric</div></div>
                    <div class="view-card">
                        <div class="ortho-grid">
                            <div></div><div><img src="${imgTop}"><div class="view-label">Top</div></div>
                            <div><img src="${imgFront}"><div class="view-label">Front</div></div>
                            <div><img src="${imgSide}"><div class="view-label">Side</div></div>
                        </div>
                    </div>
                </div>
                <div>
                     <h3>Physical Properties</h3>
                     <table>
                        <tr><th>Material Density</th><td>${comp.props.density} g/cm³</td></tr>
                        <tr><th>Volume</th><td>${comp.props.volume.toFixed(2)} cm³</td></tr>
                        <tr><th>Mass</th><td><strong>${comp.props.mass.toFixed(2)} g</strong></td></tr>
                        <tr><th>Center of Mass (World)</th><td>${comp.props.centerOfMass.x.toFixed(2)}, ${comp.props.centerOfMass.y.toFixed(2)}, ${comp.props.centerOfMass.z.toFixed(2)}</td></tr>
                        <tr><th>Distance to Assy COM</th><td>${comp.distToGlobalCOM.toFixed(3)} units</td></tr>
                        <tr><th>Bounding Box</th><td>${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}</td></tr>
                     </table>
                     
                     ${customPropsHTML}

                     <h3 style="margin-top:20px;">Placement</h3>
                     <table>
                        <tr><th>Origin (World)</th><td>${comp.position.x.toFixed(2)}, ${comp.position.y.toFixed(2)}, ${comp.position.z.toFixed(2)}</td></tr>
                        <tr><th>Rotation</th><td>${comp.rotDeg.x.toFixed(1)}°, ${comp.rotDeg.y.toFixed(1)}°, ${comp.rotDeg.z.toFixed(1)}°</td></tr>
                     </table>
                </div>
            </div>
        `;
    }).join('');


    // --- Cleanup & Restore ---
    models.forEach(m => m.visible = true); // Show all again
    if(grid) grid.visible = wasGridVisible;
    if(appState.transformControls) appState.transformControls.visible = true;
    renderer.clippingPlanes = originalClipping;
    camera.position.copy(originalCameraPos);
    camera.rotation.copy(originalCameraRot);
    camera.zoom = originalCameraZoom;
    controls.target.copy(originalControlsTarget);
    camera.updateProjectionMatrix();
    controls.update();


    // --- Generate HTML ---
    const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Assembly Data Sheet</title>
            <style>
                body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; max-width: 1200px; margin: 0 auto; }
                h1, h2, h3 { color: #2c3e50; margin-top: 0; }
                .header { border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                .view-card { border: 1px solid #eee; padding: 10px; border-radius: 4px; background: #fafafa; }
                .view-card img { width: 100%; height: auto; display: block; mix-blend-mode: multiply; }
                .view-label { font-size: 12px; font-weight: bold; color: #7f8c8d; text-align: center; margin-top: 5px;}
                .ortho-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e0e0e0; }
                .page-break { page-break-before: always; height: 1px; margin: 20px 0; border-top: 1px dashed #ccc; }
                @media print { .print-btn { display: none; } .page-break { border: none; } }
            </style>
        </head>
        <body>
            <!-- Assembly Section -->
            <div class="header">
                <div><h1>Assembly Data Sheet</h1></div>
                <div style="text-align:right">Date: ${new Date().toLocaleDateString()}<br>Project: ${appState.globalTxtValue || 'Untitled'}</div>
            </div>
            
            <div class="grid-container">
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="view-card"><img src="${assemblyImgs.iso}"><div class="view-label">Assembly Isometric</div></div>
                    <div class="view-card">
                        <div class="ortho-grid">
                            <div></div><div><img src="${assemblyImgs.top}"><div class="view-label">Top</div></div>
                            <div><img src="${assemblyImgs.front}"><div class="view-label">Front</div></div>
                            <div><img src="${assemblyImgs.side}"><div class="view-label">Side</div></div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3>Bill of Materials</h3>
                    <table>
                        <thead>
                            <tr style="background:#f8f9fa;"><th>Component</th><th>Source</th><th>Mass (g)</th></tr>
                        </thead>
                        <tbody>
                            ${bomTableRows}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight:bold; background:#eef;"><td>TOTAL</td><td></td><td>${totalMass.toFixed(2)} g</td></tr>
                        </tfoot>
                    </table>

                    <h3 style="margin-top:20px;">Component Placement & Orientation</h3>
                    <table>
                         <thead>
                            <tr style="background:#f8f9fa;">
                                <th>Component</th>
                                <th>Position (X, Y, Z)</th>
                                <th>Rotation (X, Y, Z)</th>
                                <th>Dist to Assy COM</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${placementTableRows}
                        </tbody>
                    </table>
                    
                    <h3 style="margin-top:20px;">Global Properties</h3>
                    <table>
                        <tr><th>Total Volume</th><td>${totalVolume.toFixed(2)} cm³</td></tr>
                        <tr><th>Total Mass</th><td>${totalMass.toFixed(2)} g</td></tr>
                        <tr><th>Global Center of Mass</th><td>X:${combinedCom.x.toFixed(2)}, Y:${combinedCom.y.toFixed(2)}, Z:${combinedCom.z.toFixed(2)}</td></tr>
                        <tr><th>Assembly Bounds</th><td>${assemblySize.x.toFixed(2)} x ${assemblySize.y.toFixed(2)} x ${assemblySize.z.toFixed(2)}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Individual Components -->
            ${componentSectionsHTML}

            <button class="print-btn" onclick="window.print()" style="padding:10px 20px; background:#2c3e50; color:white; border:none; cursor:pointer; position:fixed; bottom:20px; right:20px; box-shadow:0 2px 10px rgba(0,0,0,0.2);">Print PDF</button>
        </body>
        </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportContent);
        reportWindow.document.close();
    } else {
        addMessageToChat('system', '⚠️ Pop-up blocked.');
    }
}
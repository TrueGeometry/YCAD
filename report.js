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
        if (isValidReportObject(child)) {
            const box = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const rot = {
                x: parseFloat(THREE.MathUtils.radToDeg(child.rotation.x).toFixed(2)),
                y: parseFloat(THREE.MathUtils.radToDeg(child.rotation.y).toFixed(2)),
                z: parseFloat(THREE.MathUtils.radToDeg(child.rotation.z).toFixed(2))
            };

            const pos = {
                 x: parseFloat(child.position.x.toFixed(4)),
                 y: parseFloat(child.position.y.toFixed(4)),
                 z: parseFloat(child.position.z.toFixed(4))
            };

            const dims = {
                width: parseFloat(size.x.toFixed(4)),
                height: parseFloat(size.y.toFixed(4)),
                depth: parseFloat(size.z.toFixed(4))
            };

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

            const custom_props = {};
            if (child.userData) {
                Object.keys(child.userData).forEach(key => {
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

function isValidReportObject(child) {
    if (child.parent !== appState.scene) return false;
    
    if (child.name === 'Origin' || child.name === 'Work Features') return false;
    if (child.type.includes('Light') || child.type.includes('Camera')) return false;
    if (child.type === 'GridHelper' || child.type.includes('Control')) return false;

    if (child.name === 'loaded_glb' || child.name === 'fallback_cube') return true;
    if (child.userData && child.userData.isParametric) return true;
    
    if (child.isMesh || child.isGroup) return true;
    
    return false;
}

export function generateReport(targetObject = null) {
    const rawModels = [];
    
    // 1. Collect Valid Models
    if (targetObject) {
        rawModels.push(targetObject);
    } else {
        appState.scene.traverse((child) => {
            if (isValidReportObject(child)) {
                rawModels.push(child);
            }
        });
    }

    if (rawModels.length === 0) {
         addMessageToChat('system', 'Cannot generate report: No models found.');
         return;
    }

    addMessageToChat('system', targetObject ? 'Generating Component Report...' : 'Generating Assembly Report...');

    const { camera, scene, renderer, controls } = appState;

    // --- State Backup ---
    const originalCameraPos = camera.position.clone();
    const originalCameraRot = camera.rotation.clone();
    const originalCameraZoom = camera.zoom;
    const originalControlsTarget = controls.target.clone();
    const originalClipping = renderer.clippingPlanes;
    
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
             scene.traverse(c => { if(c.isMesh && c.visible) c.material.side = THREE.DoubleSide; });
             if (sectionPlane.normal.lengthSq() === 0) sectionPlane.normal.set(1,0,0);
             renderer.clippingPlanes = [sectionPlane];
        } else {
            renderer.clippingPlanes = [];
        }

        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
    };

    // --- Grouping Logic (Identify Patterns and Unique Components) ---
    const groups = {}; // Key: BaseName

    // Regex to detect pattern suffixes: _c1, _1_2
    const patternSuffixRegex = /[_](?:\d+_\d+|c\d+)$/;

    rawModels.forEach(model => {
        const name = model.userData.filename || model.name;
        // Strip suffix to find base name
        const baseName = name.replace(patternSuffixRegex, '');
        
        if (!groups[baseName]) {
            groups[baseName] = {
                name: baseName,
                instances: [],
                isPattern: false,
                patternType: 'Individual'
            };
        }
        groups[baseName].instances.push(model);
        
        // If the name has a suffix different from base, it's a pattern instance
        if (name !== baseName) {
            groups[baseName].isPattern = true;
            
            // Detect Type
            if (name.includes('_c')) groups[baseName].patternType = 'Circular';
            else if (name.match(/_\d+_\d+/)) groups[baseName].patternType = 'Rectangular';
            else groups[baseName].patternType = 'Array/Copy';
        }
        // Also if we have multiple instances with same base name but no suffix (duplicates),
        // we effectively treat them as a group in BOM, though not strictly a "Pattern".
    });

    // --- 1. Main Assembly View ---
    
    // Hide everything not in report
    scene.traverse(c => {
         if(c.parent === scene && isValidReportObject(c)) c.visible = false;
    });
    // Show only target models
    rawModels.forEach(m => m.visible = true);
    
    // Compute Assembly Bounding Box
    const mainBox = new THREE.Box3();
    rawModels.forEach(m => mainBox.expandByObject(m));
    const mainCenter = new THREE.Vector3();
    if (mainBox.isEmpty()) mainCenter.set(0,0,0); else mainBox.getCenter(mainCenter);
    const mainSize = new THREE.Vector3();
    if (mainBox.isEmpty()) mainSize.set(1,1,1); else mainBox.getSize(mainSize);
    
    const maxDim = Math.max(mainSize.x, mainSize.y, mainSize.z) || 10;
    const dist = maxDim * 1.5; 

    const mainImgs = {
        iso: capture(mainCenter, new THREE.Vector3(dist, dist, dist), mainCenter, false),
        top: capture(mainCenter, new THREE.Vector3(0, dist, 0), mainCenter, false),
        front: capture(mainCenter, new THREE.Vector3(0, 0, dist), mainCenter, false),
        side: capture(mainCenter, new THREE.Vector3(dist, 0, 0), mainCenter, false)
    };

    // --- Process Groups for Data ---
    let totalMass = 0;
    let totalVolume = 0;
    let combinedCom = new THREE.Vector3(0,0,0);
    const groupDataList = [];

    Object.values(groups).forEach(g => {
        const rep = g.instances[0]; // Representative for properties
        const props = computePhysicalProperties(rep);
        
        if (props) {
            const grpMass = props.mass * g.instances.length;
            const grpVol = props.volume * g.instances.length;
            totalMass += grpMass;
            totalVolume += grpVol;
            
            // For COM, average the COM of all instances weighted by mass
            g.instances.forEach(inst => {
                const p = computePhysicalProperties(inst);
                if (p) combinedCom.add(p.centerOfMass.multiplyScalar(p.mass));
            });

            groupDataList.push({
                name: g.name,
                count: g.instances.length,
                isPattern: g.isPattern,
                patternType: g.patternType,
                repObject: rep,
                props: props, // Unit props
                totalMass: grpMass,
                sourceUrl: rep.userData.sourceUrl || "N/A"
            });
        }
    });

    if(totalMass > 0) combinedCom.divideScalar(totalMass);


    // --- HTML Generators ---

    const generateBOMRows = (data) => data.map(g => `
        <tr>
            <td>${g.name}</td>
            <td>${g.count}</td>
            <td style="font-size:0.8em; color:#666;">${g.sourceUrl}</td>
            <td>${g.props.mass.toFixed(2)}</td>
            <td><strong>${g.totalMass.toFixed(2)}</strong></td>
        </tr>
    `).join('');

    // Generate Pattern Section
    // Only show groups that are flagged as patterns or have > 1 count
    const patternsData = groupDataList.filter(g => g.isPattern || g.count > 1);
    
    let patternsHTML = '';
    if (!targetObject && patternsData.length > 0) {
        const patternRows = patternsData.map(g => `
            <tr>
                <td>${g.name}</td>
                <td>${g.patternType}</td>
                <td>${g.count}</td>
            </tr>
        `).join('');

        patternsHTML = `
            <div style="margin-top:40px; border-top:2px solid #eee; padding-top:20px;">
                <h3 style="color:#2c3e50;">Pattern Groups & Configurations</h3>
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;"><th>Base Component</th><th>Pattern Type</th><th>Instance Count</th></tr>
                    </thead>
                    <tbody>
                        ${patternRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // --- Component Detail Sheets ---
    // Generate one sheet per GROUP (using representative)
    const componentSectionsHTML = groupDataList.map((g) => {
        const comp = g.repObject;
        
        // Isolate Representative
        rawModels.forEach(m => m.visible = false);
        comp.visible = true;

        const box = new THREE.Box3().setFromObject(comp);
        const center = new THREE.Vector3(); box.getCenter(center);
        const size = new THREE.Vector3(); box.getSize(size);
        const cDist = Math.max(size.x, size.y, size.z) * 1.5 || 10;

        const imgIso = capture(center, new THREE.Vector3(cDist, cDist, cDist), center, false);
        const imgTop = capture(center, new THREE.Vector3(0, cDist, 0), center, false);
        const imgFront = capture(center, new THREE.Vector3(0, 0, cDist), center, false);
        const imgSide = capture(center, new THREE.Vector3(cDist, 0, 0), center, false);

        let customPropsHTML = '';
        if (comp.userData) {
            const pRows = Object.entries(comp.userData)
                .filter(([k]) => k !== 'filename' && k !== 'sourceUrl' && k !== 'isParametric')
                .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
                .join('');
            if (pRows) customPropsHTML = `<h4 style="margin-top:10px;">Custom Properties</h4><table>${pRows}</table>`;
        }

        const rotDeg = {
             x: THREE.MathUtils.radToDeg(comp.rotation.x),
             y: THREE.MathUtils.radToDeg(comp.rotation.y),
             z: THREE.MathUtils.radToDeg(comp.rotation.z)
        };

        return `
            <div class="page-break"></div>
            <div class="header">
                <div><h2>Component Detail: ${g.name}</h2></div>
                <div style="font-size:12px; color:#666;">Quantity: ${g.count}</div>
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
                     <h3>Physical Properties (Per Unit)</h3>
                     <table>
                        <tr><th>Material Density</th><td>${g.props.density} g/cm³</td></tr>
                        <tr><th>Volume</th><td>${g.props.volume.toFixed(2)} cm³</td></tr>
                        <tr><th>Mass</th><td><strong>${g.props.mass.toFixed(2)} g</strong></td></tr>
                        <tr><th>Dimensions</th><td>${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}</td></tr>
                     </table>
                     
                     ${customPropsHTML}

                     <h4 style="margin-top:20px;">Reference Placement (Instance 1)</h4>
                     <table>
                        <tr><th>Position</th><td>${comp.position.x.toFixed(2)}, ${comp.position.y.toFixed(2)}, ${comp.position.z.toFixed(2)}</td></tr>
                        <tr><th>Rotation</th><td>${rotDeg.x.toFixed(1)}°, ${rotDeg.y.toFixed(1)}°, ${rotDeg.z.toFixed(1)}°</td></tr>
                     </table>
                </div>
            </div>
        `;
    }).join('');

    // --- Cleanup & Restore ---
    scene.traverse(c => {
         if(c.parent === scene && isValidReportObject(c)) c.visible = true;
    });
    if(grid) grid.visible = wasGridVisible;
    if(appState.transformControls) appState.transformControls.visible = true;
    renderer.clippingPlanes = originalClipping;
    camera.position.copy(originalCameraPos);
    camera.rotation.copy(originalCameraRot);
    camera.zoom = originalCameraZoom;
    controls.target.copy(originalControlsTarget);
    camera.updateProjectionMatrix();
    controls.update();

    // --- Build Body ---
    let bodyContent = '';
    
    if (targetObject) {
        // Single Component Mode (just the details for that one object/group)
        bodyContent = componentSectionsHTML;
    } else {
        bodyContent = `
            <div class="header">
                <div><h1>Assembly Data Sheet</h1></div>
                <div style="text-align:right">Date: ${new Date().toLocaleDateString()}<br>Project: ${appState.globalTxtValue || 'Untitled'}</div>
            </div>
            
            <div class="grid-container">
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="view-card"><img src="${mainImgs.iso}"><div class="view-label">Assembly Isometric</div></div>
                    <div class="view-card">
                        <div class="ortho-grid">
                            <div></div><div><img src="${mainImgs.top}"><div class="view-label">Top</div></div>
                            <div><img src="${mainImgs.front}"><div class="view-label">Front</div></div>
                            <div><img src="${mainImgs.side}"><div class="view-label">Side</div></div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3>Bill of Materials</h3>
                    <table>
                        <thead>
                            <tr style="background:#f8f9fa;"><th>Component</th><th>Qty</th><th>Source</th><th>Unit Mass (g)</th><th>Total Mass (g)</th></tr>
                        </thead>
                        <tbody>
                            ${generateBOMRows(groupDataList)}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight:bold; background:#eef;"><td>TOTAL</td><td></td><td></td><td></td><td>${totalMass.toFixed(2)} g</td></tr>
                        </tfoot>
                    </table>

                    ${patternsHTML}

                    <h3 style="margin-top:20px;">Global Properties</h3>
                    <table>
                        <tr><th>Total Volume</th><td>${totalVolume.toFixed(2)} cm³</td></tr>
                        <tr><th>Total Mass</th><td>${totalMass.toFixed(2)} g</td></tr>
                        <tr><th>Global Center of Mass</th><td>X:${combinedCom.x.toFixed(2)}, Y:${combinedCom.y.toFixed(2)}, Z:${combinedCom.z.toFixed(2)}</td></tr>
                        <tr><th>Assembly Bounds</th><td>${mainSize.x.toFixed(2)} x ${mainSize.y.toFixed(2)} x ${mainSize.z.toFixed(2)}</td></tr>
                    </table>
                </div>
            </div>

            ${componentSectionsHTML}
        `;
    }

    const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Engineering Report</title>
            <style>
                body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; max-width: 1200px; margin: 0 auto; }
                h1, h2, h3, h4 { color: #2c3e50; margin-top: 0; }
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
            ${bodyContent}
            <button class="print-btn" onclick="window.print()" style="padding:10px 20px; background:#2c3e50; color:white; border:none; cursor:pointer; position:fixed; bottom:20px; right:20px; box-shadow:0 2px 10px rgba(0,0,0,0.2);">Print PDF</button>
        </body>
        </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportContent);
        reportWindow.document.close();
    } else {
        addMessageToChat('system', '⚠️ Pop-up blocked. Allow popups to see report.');
    }
}
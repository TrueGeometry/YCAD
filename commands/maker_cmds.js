// commands/maker_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { initSketchMode } from '../sketch.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree } from '../tree.js';

// --- 1. Robust Loader with 'require' Shim ---
async function ensureMakerJS() {
    if (window.makerjs) return true;

    addMessageToChat('system', '⏳ Loading Maker.js...');

    // Shim 'require' so Maker.js can find its dependencies in the browser
    if (!window.require) {
        window.require = function(name) {
            if (name === 'bezier-js') return window.Bezier;
            if (name === 'opentype.js') return window.opentype;
            return {};
        };
    }

    // Load Script Helper
    const load = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = (e) => {
            console.error(`Failed to load ${src}`, e);
            reject(e);
        };
        document.head.appendChild(s);
    });

    try {
        // Load dependencies in order
        if (!window.Bezier) await load('https://cdn.jsdelivr.net/npm/bezier-js@2/bezier.js');
        if (!window.opentype) await load('https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js');
        await load('https://cdn.jsdelivr.net/npm/makerjs@0/target/js/browser.maker.js');

        // Final check
        if (window.makerjs || (window.require && window.require('makerjs'))) {
            if (!window.makerjs) window.makerjs = window.require('makerjs');
            addMessageToChat('system', '✅ Maker.js Ready.');
            return true;
        }
        throw new Error("Maker.js failed to initialize object.");
    } catch (e) {
        console.error("MakerJS Init Error:", e);
        addMessageToChat('system', '❌ Error loading Maker.js libraries.');
        return false;
    }
}

// --- 2. Geometry Converter (Manual Recursion) ---
// Replaces makerjs.model.walk to avoid context errors and ensure reliability
function convertToThreeGeometry(model) {
    const segments = [];

    function recurse(currentModel, originX, originY) {
        // 1. Process Paths in this model
        if (currentModel.paths) {
            for (const key in currentModel.paths) {
                const path = currentModel.paths[key];
                if (!path) continue;

                if (path.type === 'line') {
                    const start = path.origin || [0, 0];
                    const end = path.end || [0, 0];
                    segments.push(
                        new THREE.Vector3(start[0] + originX, start[1] + originY, 0),
                        new THREE.Vector3(end[0] + originX, end[1] + originY, 0)
                    );
                } 
                else if (path.type === 'arc' || path.type === 'circle') {
                    const start = path.origin || [0, 0]; // For arc/circle, origin is center
                    const cx = start[0] + originX;
                    const cy = start[1] + originY;
                    const r = path.radius;
                    
                    let sAng = path.startAngle || 0;
                    let eAng = path.endAngle || 360;
                    
                    // Fix full circles or wrapping
                    if (path.type === 'circle') { sAng = 0; eAng = 360; }
                    if (eAng < sAng) eAng += 360;

                    const steps = 16; // Segment resolution
                    for (let i = 0; i < steps; i++) {
                        const t1 = sAng + (eAng - sAng) * (i / steps);
                        const t2 = sAng + (eAng - sAng) * ((i + 1) / steps);
                        
                        const a1 = THREE.MathUtils.degToRad(t1);
                        const a2 = THREE.MathUtils.degToRad(t2);
                        
                        segments.push(
                            new THREE.Vector3(cx + r * Math.cos(a1), cy + r * Math.sin(a1), 0),
                            new THREE.Vector3(cx + r * Math.cos(a2), cy + r * Math.sin(a2), 0)
                        );
                    }
                }
            }
        }

        // 2. Recurse into Sub-Models
        if (currentModel.models) {
            for (const key in currentModel.models) {
                const sub = currentModel.models[key];
                if (!sub) continue;
                
                // Accumulate origin offset
                const subOrigin = sub.origin || [0, 0];
                recurse(sub, originX + subOrigin[0], originY + subOrigin[1]);
            }
        }
    }

    // Start recursion
    if (model) recurse(model, 0, 0);
    
    return segments;
}

// --- 3. Command Definition ---
export const makerCommands = {
    '/makerjs': {
        desc: 'Run Maker.js generator. Usage: /makerjs gear [teeth] [radius]',
        execute: async (argRaw, cmdString) => {
            if (!await ensureMakerJS()) return;

            const args = argRaw.trim().split(/\s+/);
            const type = args[0] ? args[0].toLowerCase() : '';
            
            // 1. Ensure Sketch Mode
            const sketchControls = document.getElementById('sketch-controls');
            if (!sketchControls || sketchControls.style.display === 'none') {
                initSketchMode('XY Plane');
            }

            let model = null;
            let name = "MakerPart";
            
            // Explicitly track profile points for Extrusion compatibility
            // This ensures robust profile data even if findChains struggles with topology
            let explicitProfile = [];

            // 2. Generate Model based on type
            if (type === 'gear') {
                const teeth = parseInt(args[1]) || 12;
                const radius = parseFloat(args[2]) || 50; 
                
                addMessageToChat('system', `Generating Gear: ${teeth} teeth, R=${radius}`);
                
                // Create a simple parametric gear using basic MakerJS paths
                model = { paths: {} };
                const outerR = radius;
                const innerR = radius * 0.8;
                const toRad = (deg) => deg * Math.PI / 180;
                
                for(let i=0; i<teeth; i++) {
                    const angle = 360/teeth;
                    const aStart = i * angle;
                    const aMid = aStart + angle/2;
                    const aEnd = aStart + angle;
                    
                    // Tooth points (Polar to Cartesian)
                    const p1 = [outerR * Math.cos(toRad(aStart)), outerR * Math.sin(toRad(aStart))];
                    const p2 = [outerR * Math.cos(toRad(aMid)), outerR * Math.sin(toRad(aMid))];
                    const p3 = [innerR * Math.cos(toRad(aMid)), innerR * Math.sin(toRad(aMid))];
                    const p4 = [innerR * Math.cos(toRad(aEnd)), innerR * Math.sin(toRad(aEnd))];
                    
                    // Add paths (Unique IDs)
                    model.paths[`t_${i}_1`] = new window.makerjs.paths.Line(p1, p2);
                    model.paths[`t_${i}_2`] = new window.makerjs.paths.Line(p2, p3);
                    model.paths[`t_${i}_3`] = new window.makerjs.paths.Line(p3, p4);
                    // Close the gap to next tooth
                    const pNext = [outerR * Math.cos(toRad(aEnd)), outerR * Math.sin(toRad(aEnd))];
                    model.paths[`t_${i}_4`] = new window.makerjs.paths.Line(p4, pNext);

                    // Accumulate Profile Points
                    explicitProfile.push({x: p1[0], y: p1[1]});
                    explicitProfile.push({x: p2[0], y: p2[1]});
                    explicitProfile.push({x: p3[0], y: p3[1]});
                    explicitProfile.push({x: p4[0], y: p4[1]});
                }
                
                // Add center hole (This is a separate loop, handled by findChains or ignore for main profile)
                model.models = { hole: new window.makerjs.models.Ring(radius * 0.2, radius * 0.1) };
                name = `Gear_${teeth}`;
            } 
            else if (type === 'boltcircle') {
                const count = parseInt(args[1]) || 6;
                const r = parseFloat(args[2]) || 20;
                const holeR = parseFloat(args[3]) || 2;
                model = new window.makerjs.models.BoltCircle(r, holeR, count);
                name = `BoltCircle_${count}`;
            }
            else {
                addMessageToChat('system', 'Available types: gear, boltcircle');
                return;
            }

            // 3. Convert to Three.js LineSegments
            const segments = convertToThreeGeometry(model);
            
            if (segments.length === 0) {
                addMessageToChat('system', '⚠️ No geometry generated.');
                console.warn("MakerJS model yielded 0 segments:", model);
                return;
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(segments);
            const material = new THREE.LineBasicMaterial({ color: 0xff00ff }); // Magenta
            const mesh = new THREE.LineSegments(geometry, material);
            
            mesh.name = name;
            mesh.userData.filename = name;
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = 'maker_sketch';
            mesh.userData.cmd = cmdString;

            // 4. Attach Profile Data for Extrusion
            // Use explicit profile if generated (Gear), otherwise try automated detection
            if (explicitProfile.length > 0) {
                mesh.userData.profile = explicitProfile;
                mesh.userData.closed = true;
            } 
            else {
                // Automated fallback for other MakerJS models
                try {
                    if (window.makerjs.model && window.makerjs.model.findChains) {
                        const chains = window.makerjs.model.findChains(model);
                        if (chains && chains.length > 0) {
                            let bestProfile = [];
                            let maxLen = 0;

                            chains.forEach(chain => {
                                // Extract points with resolution. Spacing = 1 unit.
                                const pts = window.makerjs.chain.toPoints(chain, 1.0);
                                if (pts && pts.length > maxLen) {
                                    maxLen = pts.length;
                                    // Convert [x,y] array to {x,y} objects
                                    bestProfile = pts.map(p => ({x: p[0], y: p[1]}));
                                }
                            });

                            if (bestProfile.length > 2) {
                                mesh.userData.profile = bestProfile;
                                mesh.userData.closed = true; 
                            }
                        }
                    }
                } catch(e) {
                    console.warn("[MakerJS] Failed to extract profile:", e);
                }
            }

            // Add to scene
            let sketchGroup = null;
            appState.scene.traverse(c => { if(c.userData.type === 'Sketch') sketchGroup = c; });
            
            if (sketchGroup) {
                sketchGroup.add(mesh);
            } else {
                appState.scene.add(mesh);
            }

            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            
            addMessageToChat('system', `✅ Created ${name}`);
        }
    }
};
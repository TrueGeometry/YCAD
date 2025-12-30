// commands/csg_cmds.js
import * as THREE from 'three';
import { CSG } from '../csg_lib.js';
import { appState } from '../state.js';
import { addMessageToChat, toggleLoading } from '../ui.js';
import { resolveTarget } from './utils.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree, deleteObject } from '../tree.js';
import { getTaggableObjects } from '../viewer.js';

export const csgCommands = {
    '/extrude': {
        desc: 'Extrude 2D Sketch to 3D (@Sketch height)',
        execute: async (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            
            // Parse height from args
            const args = argRaw.split(/\s+/);
            const heightVal = parseFloat(args.find(a => !isNaN(parseFloat(a)) && !a.startsWith('@'))) || 5.0;

            if (!object) {
                addMessageToChat('system', '⚠️ Please select or mention a sketch object to extrude.');
                return;
            }

            // Check if it has profile data (Polyline, Rect, Circle created in Sketch Mode)
            if (!object.userData.profile || !Array.isArray(object.userData.profile)) {
                addMessageToChat('system', `⚠️ Object '${name}' is not a valid 2D sketch for extrusion.`);
                return;
            }

            if (!object.userData.closed) {
                 addMessageToChat('system', `⚠️ Cannot extrude open polyline. Please close the sketch.`);
                 return;
            }

            addMessageToChat('system', `Extruding ${name} by ${heightVal} units...`);

            // Create Shape
            const shape = new THREE.Shape(object.userData.profile);
            
            // Extrude Settings
            const extrudeSettings = {
                depth: heightVal,
                bevelEnabled: false,
                steps: 1
            };

            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            // Material
            const material = new THREE.MeshStandardMaterial({
                color: 0x6366f1, // Indigo
                roughness: 0.5,
                metalness: 0.1,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `Extrude_${name}`;
            mesh.userData.filename = mesh.name;
            
            // MARK AS PARAMETRIC EXTRUSION
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = 'extrusion';
            mesh.userData.height = heightVal;
            // Copy profile points (clone to ensure independence)
            mesh.userData.profile = object.userData.profile.map(p => ({ x: p.x, y: p.y }));

            // Transform: Match Sketch Group Transform
            // The geometry is created in local XY plane. We need to move it to the sketch's world transform.
            const parent = object.parent;
            if (parent && parent.userData.type === 'Sketch') {
                mesh.position.copy(parent.position);
                mesh.quaternion.copy(parent.quaternion);
                mesh.scale.copy(parent.scale);
            } else {
                mesh.position.copy(object.position);
                mesh.quaternion.copy(object.quaternion);
            }

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            appState.scene.add(mesh);
            
            // Optionally hide sketch
            // object.visible = false; 

            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            
            addMessageToChat('system', `Created 3D Extrusion. Height: ${heightVal}`);
        }
    },

    '/sweep': {
        desc: 'Sweep sketches (@S1 @S2 @Path [align:x|y|z] [twist:deg])',
        execute: async (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const mentions = [];
            const sweepOptions = { align: null, twist: 0 };

            args.forEach(arg => {
                if (arg.startsWith('@')) {
                    mentions.push(arg);
                } else if (arg.toLowerCase().startsWith('align:')) {
                    const axis = arg.split(':')[1].toLowerCase();
                    if (axis === 'x') sweepOptions.align = new THREE.Vector3(1,0,0);
                    if (axis === 'y') sweepOptions.align = new THREE.Vector3(0,1,0);
                    if (axis === 'z') sweepOptions.align = new THREE.Vector3(0,0,1);
                } else if (arg.toLowerCase().startsWith('twist:')) {
                    sweepOptions.twist = parseFloat(arg.split(':')[1]) || 0;
                }
            });

            if (mentions.length < 2) {
                addMessageToChat('system', '⚠️ Usage: /sweep @Section1 [@Section2 ...] @GuideCurve [align:z] [twist:90]');
                return;
            }

            const allObjects = getTaggableObjects();
            const resolved = mentions.map(m => {
                const name = m.substring(1).toLowerCase();
                const found = allObjects.find(o => o.name.toLowerCase() === name);
                return found ? found.object : null;
            });

            if (resolved.includes(null)) {
                addMessageToChat('system', '⚠️ Could not resolve all objects.');
                return;
            }

            // Assumption: Last object is the Guide Path
            const pathObj = resolved[resolved.length - 1];
            const sections = resolved.slice(0, resolved.length - 1);

            toggleLoading(true);
            addMessageToChat('system', `Generating Sweep with ${sections.length} sections...`);

            // Delay for UI update
            await new Promise(r => setTimeout(r, 50));

            try {
                const mesh = generateSweptMesh(pathObj, sections, sweepOptions);
                if (mesh) {
                    appState.scene.add(mesh);
                    appState.currentDisplayObject = mesh;
                    attachTransformControls(mesh);
                    updateFeatureTree();
                    addMessageToChat('system', `✅ Created Swept Blend Geometry.`);
                }
            } catch (e) {
                console.error(e);
                addMessageToChat('system', `⚠️ Sweep failed: ${e.message}`);
            } finally {
                toggleLoading(false);
            }
        }
    },

    '/subtract': {
        desc: 'Boolean Subtract (@Target @Tool1 ...)',
        execute: async (argRaw) => {
            await performBoolean('subtract', argRaw);
        }
    },

    '/union': {
        desc: 'Boolean Union (@Obj1 @Obj2 ...)',
        execute: async (argRaw) => {
            await performBoolean('union', argRaw);
        }
    },

    '/union_all': {
        desc: 'Union ALL visible meshes in scene',
        execute: async () => {
             // Gather all valid meshes using a custom traversal that respects visibility hierarchy
             const allMeshes = [];

             const traverseVisible = (object) => {
                 // Stop if this object is hidden (excludes entire branch)
                 if (!object.visible) return;

                 // System filters at Group/Object level
                 if (object.name === 'GridHelper' || object.name === 'Origin' || object.name === 'Work Features') return;
                 if (object.type.includes('Control')) return;

                 if (object.isMesh) {
                     // Mesh-specific filters
                     const isSystem = object.type.includes('Helper') || 
                                      (object.userData && object.userData.type?.startsWith('Work')) ||
                                      (object.parent && (object.parent.name === 'Origin' || object.parent.name === 'Work Features'));
                     
                     if (!isSystem) {
                         allMeshes.push(object);
                     }
                 }
                 
                 // Recurse children
                 if (object.children) {
                     for (let i = 0; i < object.children.length; i++) {
                         traverseVisible(object.children[i]);
                     }
                 }
             };

             // Start traversal from scene
             traverseVisible(appState.scene);

             if (allMeshes.length < 2) {
                 addMessageToChat('system', `⚠️ Need at least 2 visible meshes to union (Found ${allMeshes.length}).`);
                 return;
             }
             
             addMessageToChat('system', `Found ${allMeshes.length} visible meshes. Performing global Union...`);
             await performBoolean('union', '', allMeshes);
        }
    },

    '/intersect': {
        desc: 'Boolean Intersect (@Obj1 @Obj2 ...)',
        execute: async (argRaw) => {
            await performBoolean('intersect', argRaw);
        }
    }
};

async function performBoolean(op, argRaw, explicitObjects = null) {
    let resolvedObjects = [];
    
    if (explicitObjects) {
        resolvedObjects = explicitObjects;
    } else {
        // 1. Resolve Targets - support multiple inputs
        // Extract all mentions (e.g. @Cube @Sphere @Cylinder)
        const mentions = argRaw.match(/@([\w\d_.-]+)/g);
        
        if (!mentions || mentions.length < 2) {
            addMessageToChat('system', `Usage: /${op} @Obj1 @Obj2 ... (requires at least 2 objects)`);
            return;
        }

        const allObjects = getTaggableObjects();
        const seenUUIDs = new Set();
        const missing = [];

        // Map mentions to actual objects
        for (const mention of mentions) {
            const searchName = mention.substring(1).toLowerCase(); // remove @
            // Find exact match first
            const match = allObjects.find(o => o.name.toLowerCase() === searchName);
            
            if (match) {
                if (!seenUUIDs.has(match.object.uuid)) {
                    resolvedObjects.push(match.object);
                    seenUUIDs.add(match.object.uuid);
                }
            } else {
                missing.push(mention);
            }
        }

        if (missing.length > 0) {
            addMessageToChat('system', `⚠️ Could not find: ${missing.join(', ')}`);
            return;
        }
    }

    if (resolvedObjects.length < 2) {
        addMessageToChat('system', '⚠️ Need at least 2 valid distinct objects for boolean operation.');
        return;
    }

    // Validate Meshes
    if (resolvedObjects.some(o => !o.isMesh)) {
         addMessageToChat('system', '⚠️ Boolean operations only work on Meshes.');
         return;
    }

    toggleLoading(true);
    addMessageToChat('system', `Computing ${op.toUpperCase()} of ${resolvedObjects.length} objects...`);

    // Allow UI to render loading state
    await new Promise(r => setTimeout(r, 50));

    try {
        // Start with the first object
        let currentCSG = CSG.fromMesh(resolvedObjects[0]);
        
        // Iterate through the rest
        for (let i = 1; i < resolvedObjects.length; i++) {
            const nextObj = resolvedObjects[i];
            const nextCSG = CSG.fromMesh(nextObj);

            if (op === 'subtract') {
                // Target - Tool1 - Tool2 ...
                currentCSG = currentCSG.subtract(nextCSG);
            }
            else if (op === 'union') {
                // A + B + C ...
                currentCSG = currentCSG.union(nextCSG);
            }
            else if (op === 'intersect') {
                // A intersect B intersect C ...
                currentCSG = currentCSG.intersect(nextCSG);
            }
        }

        const baseObj = resolvedObjects[0];
        const resultMesh = currentCSG.toMesh(baseObj.material.clone());
        
        // Construct a name
        const baseName = resolvedObjects[0].name.replace(/_/g, '');
        let newName = `${op}_${baseName}`;
        if (resolvedObjects.length > 2) {
            newName += `_and_${resolvedObjects.length - 1}_others`;
        } else {
            const secondName = resolvedObjects[1].name.replace(/_/g, '');
            newName += `_${secondName}`;
        }
        
        // Enforce safe filename characters
        newName = newName.replace(/\s+/g, '_');
        resultMesh.name = newName;
        resultMesh.userData.filename = resultMesh.name;
        
        // Cleanup originals
        resolvedObjects.forEach(obj => deleteObject(obj));

        appState.scene.add(resultMesh);
        appState.currentDisplayObject = resultMesh;
        attachTransformControls(resultMesh);
        updateFeatureTree();

        addMessageToChat('system', `Boolean ${op} successful.`);

    } catch (e) {
        console.error(e);
        addMessageToChat('system', `⚠️ Boolean operation failed: ${e.message}`);
    } finally {
        toggleLoading(false);
    }
}

// --- SWEEP HELPERS ---

function generateSweptMesh(pathObj, sectionObjs, options = {}) {
    // 1. Extract Path Curve
    const points = getPointsFromObject(pathObj);
    if (!points || points.length < 2) throw new Error("Invalid guide path. Needs at least 2 points.");
    
    // Create CatmullRom Curve
    const curve = new THREE.CatmullRomCurve3(points);
    // Use centripetal to avoid loops in sharp corners
    curve.curveType = 'centripetal'; 
    curve.tension = 0.5;

    // 2. Prepare Sections (Resample to uniform count)
    const sampleCount = 64;
    const profiles = sectionObjs.map(obj => {
        if (!obj.userData.profile) throw new Error(`Section ${obj.name} is not a valid sketch.`);
        return resampleProfile(obj.userData.profile, sampleCount);
    });

    // 3. Generate Geometry
    const steps = 100; // Segments along path
    const vertices = [];
    const indices = [];
    
    // Frenet Frame Vectors
    const normal = new THREE.Vector3();
    const binormal = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const pos = new THREE.Vector3();
    
    // Track previous for Parallel Transport
    let prevBinormal = new THREE.Vector3(0, 1, 0); 
    
    // Loop through steps (Rings)
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Curve Frame
        curve.getPointAt(t, pos);
        curve.getTangentAt(t, tangent).normalize();
        
        if (options.align) {
            // FIXED ALIGNMENT MODE
            // Force one axis to be perpendicular to tangent and align axis
            // This prevents banking (rolling) relative to the align axis
            const alignAxis = options.align.clone();
            
            // Calculate a vector perpendicular to both Tangent and AlignAxis
            // This vector will lie in the normal plane
            const vec = new THREE.Vector3().crossVectors(tangent, alignAxis);
            
            if (vec.lengthSq() < 0.0001) {
                // Singularity: Tangent is parallel to Align Axis.
                // Fallback to previous frame or arbitrary
                if (i > 0) vec.copy(prevBinormal); 
                else vec.set(1, 0, 0); // Arbitrary fallback
            }
            
            binormal.copy(vec).normalize();
            normal.crossVectors(binormal, tangent).normalize(); // Create orthogonal normal
            
        } else {
            // PARALLEL TRANSPORT MODE (Default)
            // Minimizes twist relative to path
            let up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(tangent.dot(up)) > 0.99) up.set(1, 0, 0);
            
            if (i === 0) {
                normal.crossVectors(tangent, up).normalize();
                binormal.crossVectors(tangent, normal).normalize();
            } else {
                normal.crossVectors(prevBinormal, tangent).normalize();
                binormal.crossVectors(tangent, normal).normalize();
            }
        }
        
        // APPLY TWIST (Rotation around Tangent)
        if (options.twist) {
            const twistRad = THREE.MathUtils.degToRad(options.twist * t);
            normal.applyAxisAngle(tangent, twistRad);
            binormal.applyAxisAngle(tangent, twistRad);
        }

        prevBinormal.copy(binormal); // Store for next step

        // Determine Profile at t
        let currentProfile = [];
        if (profiles.length === 1) {
            currentProfile = profiles[0];
        } else {
            // Map t (0..1) to profile index range
            const numSegments = profiles.length - 1;
            const segT = t * numSegments;
            const index = Math.floor(segT);
            const localT = segT - index;
            
            const pA = profiles[Math.min(index, numSegments)];
            const pB = profiles[Math.min(index + 1, numSegments)];
            
            // Lerp points
            for (let k = 0; k < sampleCount; k++) {
                const vA = pA[k];
                const vB = pB[k];
                currentProfile.push(new THREE.Vector2().lerpVectors(vA, vB, localT));
            }
        }

        // Transform 2D Profile to 3D Ring
        // Basis: Binormal (X), Normal (Y) -> Or vice versa based on orientation
        // We map 2D (x,y) to 3D frame
        
        for (let k = 0; k < sampleCount; k++) {
            const pt2d = currentProfile[k];
            
            // Vertex = CurvePos + pt.x * Binormal + pt.y * Normal
            const v = pos.clone()
                .addScaledVector(binormal, pt2d.x)
                .addScaledVector(normal, pt2d.y);
            
            vertices.push(v.x, v.y, v.z);
        }
    }

    // Generate Indices (Quads between rings)
    for (let i = 0; i < steps; i++) {
        for (let k = 0; k < sampleCount; k++) {
            const nextK = (k + 1) % sampleCount;
            
            const a = i * sampleCount + k;
            const b = i * sampleCount + nextK;
            const c = (i + 1) * sampleCount + k;
            const d = (i + 1) * sampleCount + nextK;
            
            // Two triangles
            indices.push(a, d, b);
            indices.push(a, c, d);
        }
    }

    // Build BufferGeometry
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.1, roughness: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "Sweep_Result";
    mesh.userData.filename = "Sweep";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
}

function getPointsFromObject(obj) {
    obj.updateMatrixWorld(true);
    const points = [];
    
    if (obj.userData.profile) {
        // It's a sketch (2D points in local space, usually z=0)
        // Transform them to world
        obj.userData.profile.forEach(p2 => {
            const v = new THREE.Vector3(p2.x, p2.y, 0).applyMatrix4(obj.matrixWorld);
            points.push(v);
        });
        // Check if closed loop, maybe add start point to end for path?
        // Usually path is open, but if closed, add first point.
        if (obj.userData.closed) {
            points.push(points[0].clone());
        }
    } else if (obj.geometry) {
        // It's a Line or Mesh
        const posAttr = obj.geometry.attributes.position;
        if (posAttr) {
            for (let i = 0; i < posAttr.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
                points.push(v);
            }
        }
    }
    return points;
}

function resampleProfile(points2D, count) {
    // 1. Calculate total length
    let totalLen = 0;
    const dists = [0];
    for (let i = 0; i < points2D.length; i++) {
        const next = (i + 1) % points2D.length;
        // Don't wrap if it's not closed? 
        // Sketches are usually closed for Profiles.
        // We assume closed loop for Sections.
        const d = points2D[i].distanceTo(points2D[next]);
        totalLen += d;
        dists.push(totalLen);
    }

    const resampled = [];
    const step = totalLen / count;
    
    let currentDist = 0;
    let idx = 0;
    
    for (let i = 0; i < count; i++) {
        const targetDist = i * step;
        
        // Find segment containing targetDist
        while (dists[idx + 1] < targetDist && idx < points2D.length) {
            idx++;
        }
        
        // Interpolate
        const startDist = dists[idx];
        const endDist = dists[idx + 1];
        const segLen = endDist - startDist;
        const alpha = (targetDist - startDist) / (segLen || 1); // Avoid div by 0
        
        const p1 = points2D[idx % points2D.length];
        const p2 = points2D[(idx + 1) % points2D.length];
        
        resampled.push(new THREE.Vector2().lerpVectors(p1, p2, alpha));
    }
    
    return resampled;
}

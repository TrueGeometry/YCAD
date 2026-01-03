// commands/csg_cmds.js
import * as THREE from 'three';
import { CSG } from '../csg_lib.js';
import { appState } from '../state.js';
import { addMessageToChat, toggleLoading } from '../ui.js';
import { resolveTarget } from './utils.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree, deleteObject } from '../tree.js';
import { getTaggableObjects } from '../viewer.js';
import { generateSweptMesh } from './sweep_lib.js';

// Helper to extract points for Revolve
function getRevolvePoints(obj) {
    obj.updateMatrixWorld(true);
    const points = [];
    
    // Priority: Profile from Sketch (User Data)
    if (obj.userData && obj.userData.profile) {
        obj.userData.profile.forEach(p => {
            const v = new THREE.Vector3(p.x, p.y, 0).applyMatrix4(obj.matrixWorld);
            points.push(v);
        });
        // Check closure
        if(obj.userData.closed && points.length > 0) {
             if(points[0].distanceTo(points[points.length-1]) > 0.0001) {
                 points.push(points[0].clone());
             }
        }
    } 
    // Fallback: Raw Geometry (Line/Mesh)
    else if (obj.geometry) {
        const pos = obj.geometry.attributes.position;
        if(pos) {
            for(let i=0; i<pos.count; i++) {
                points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld));
            }
        }
    }
    return points;
}

// Helper to execute sweep with specific profile count constraints
async function executeSweep(argRaw, constraints = {}, cmdString = '') {
    const args = argRaw.trim().split(/\s+/);
    const mentions = [];
    const sweepOptions = { align: null, twist: 0, rotation: 0, capped: false, thickness: 0 };

    args.forEach(arg => {
        const lower = arg.toLowerCase();
        if (arg.startsWith('@')) {
            mentions.push(arg);
        } else if (lower.startsWith('align:')) {
            const axis = lower.split(':')[1];
            if (axis === 'x') sweepOptions.align = new THREE.Vector3(1,0,0);
            if (axis === 'y') sweepOptions.align = new THREE.Vector3(0,1,0);
            if (axis === 'z') sweepOptions.align = new THREE.Vector3(0,0,1);
        } else if (lower.startsWith('twist:')) {
            sweepOptions.twist = parseFloat(lower.split(':')[1]) || 0;
        } else if (lower.startsWith('rot:') || lower.startsWith('rotation:')) {
            sweepOptions.rotation = parseFloat(lower.split(':')[1]) || 0;
        } else if (lower.startsWith('thick:') || lower.startsWith('thickness:') || lower.startsWith('wall:')) {
            const val = parseFloat(lower.split(':')[1]);
            if (!isNaN(val)) sweepOptions.thickness = val;
        } else if (lower === 'solid') {
            sweepOptions.capped = true;
        } else if (lower === 'surface') {
            sweepOptions.capped = false;
        }
    });

    if (mentions.length < 2) {
        addMessageToChat('system', '⚠️ Usage: Command requires Profiles and 1 Path (last).');
        return;
    }

    // Assumption: Last object is the Guide Path
    const pathName = mentions[mentions.length - 1];
    const sectionNames = mentions.slice(0, mentions.length - 1);

    // Validate Constraints
    if (constraints.exact && sectionNames.length !== constraints.exact) {
         addMessageToChat('system', `⚠️ This command requires exactly ${constraints.exact} profile(s). Found ${sectionNames.length}.`);
         return;
    }
    if (constraints.min && sectionNames.length < constraints.min) {
         addMessageToChat('system', `⚠️ This command requires at least ${constraints.min} profile(s).`);
         return;
    }

    const allObjects = getTaggableObjects();
    
    // Resolve Path
    const pathMatch = allObjects.find(o => o.name.toLowerCase() === pathName.substring(1).toLowerCase());
    if (!pathMatch) {
        addMessageToChat('system', `⚠️ Path object '${pathName}' not found.`);
        return;
    }
    const pathObj = pathMatch.object;

    // Resolve Sections
    const sections = [];
    for (const name of sectionNames) {
        const found = allObjects.find(o => o.name.toLowerCase() === name.substring(1).toLowerCase());
        if (!found) {
            addMessageToChat('system', `⚠️ Profile object '${name}' not found.`);
            return;
        }
        sections.push(found.object);
    }

    toggleLoading(true);
    addMessageToChat('system', `Generating Sweep (${sections.length} profiles)...`);

    // Delay for UI update
    await new Promise(r => setTimeout(r, 50));

    try {
        const mesh = generateSweptMesh(pathObj, sections, sweepOptions);
        if (mesh) {
            mesh.userData.cmd = cmdString;
            appState.scene.add(mesh);
            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            addMessageToChat('system', `✅ Created Swept Geometry.`);
        }
    } catch (e) {
        console.error(e);
        addMessageToChat('system', `⚠️ Sweep failed: ${e.message}`);
    } finally {
        toggleLoading(false);
    }
}

export const csgCommands = {
    '/extrude': {
        desc: 'Extrude 2D Sketch to 3D (@Sketch height)',
        execute: async (argRaw, cmdString) => {
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

            let mesh = new THREE.Mesh(geometry, material);
            
            // --- PROCESS DEFERRED SKETCH BOOLEANS ---
            if (object.userData.sketch_ops && object.userData.sketch_ops.length > 0) {
                try {
                    let currentCSG = CSG.fromMesh(mesh);
                    
                    for (const op of object.userData.sketch_ops) {
                        // Create temp shape from op profile
                        const opShape = new THREE.Shape(op.profile);
                        const opGeo = new THREE.ExtrudeGeometry(opShape, extrudeSettings);
                        // Center is 0,0 locally, same as main mesh
                        const opMesh = new THREE.Mesh(opGeo);
                        
                        const toolCSG = CSG.fromMesh(opMesh);
                        
                        if (op.type === 'union') currentCSG = currentCSG.union(toolCSG);
                        else if (op.type === 'subtract') currentCSG = currentCSG.subtract(toolCSG);
                        else if (op.type === 'intersect') currentCSG = currentCSG.intersect(toolCSG);
                    }
                    
                    const resultMesh = currentCSG.toMesh(material);
                    mesh.geometry.dispose();
                    mesh = resultMesh;
                    addMessageToChat('system', `Applied ${object.userData.sketch_ops.length} sketch boolean operations.`);
                } catch(e) {
                    console.error("Sketch Boolean Error:", e);
                    addMessageToChat('system', '⚠️ Error applying sketch booleans during extrusion.');
                }
            }

            mesh.name = `Extrude_${name}`;
            mesh.userData.filename = mesh.name;
            
            // MARK AS PARAMETRIC EXTRUSION
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = 'extrusion';
            mesh.userData.height = heightVal;
            // Copy profile points (clone to ensure independence)
            mesh.userData.profile = object.userData.profile.map(p => ({ x: p.x, y: p.y }));
            mesh.userData.cmd = cmdString;

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
            
            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            
            addMessageToChat('system', `Created 3D Extrusion. Height: ${heightVal}`);
        }
    },

    '/revolve': {
        desc: 'Revolve profile around axis (@Profile @Axis [angle])',
        execute: (argRaw, cmdString) => {
            const args = argRaw.trim().split(/\s+/);
            const mentions = args.filter(a => a.startsWith('@'));
            const numbers = args.filter(a => !a.startsWith('@') && !isNaN(parseFloat(a)));
            
            if (mentions.length < 2) {
                addMessageToChat('system', 'Usage: /revolve @Profile @Axis [angle]');
                return;
            }
            
            // Resolve Objects
            const { object: profileObj, name: profileName } = resolveTarget(mentions[0]);
            const { object: axisObj, name: axisName } = resolveTarget(mentions[1]);
            
            const angleDeg = numbers.length > 0 ? parseFloat(numbers[0]) : 360;
            const angleRad = THREE.MathUtils.degToRad(angleDeg);
            
            if (!profileObj || !axisObj) {
                addMessageToChat('system', '⚠️ Profile or Axis object not found.');
                return;
            }
            
            // 1. Get Axis Line
            const axisPoints = getRevolvePoints(axisObj);
            if (axisPoints.length < 2) {
                addMessageToChat('system', '⚠️ Axis must define a line (at least 2 points).');
                return;
            }
            
            // Use first and last point for axis
            const p1 = axisPoints[0];
            const p2 = axisPoints[axisPoints.length - 1];
            const axisDir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const axisOrigin = p1.clone();
            
            // 2. Get Profile Points
            const profilePoints = getRevolvePoints(profileObj);
            if (profilePoints.length < 2) {
                addMessageToChat('system', '⚠️ Profile must have points.');
                return;
            }
            
            // 3. Convert Profile to Lathe Coordinate System (Radius, Y)
            // Lathe rotates around Y-axis (Radius is X).
            const lathePoints = [];
            
            profilePoints.forEach(p => {
                const vec = new THREE.Vector3().subVectors(p, axisOrigin);
                const projection = vec.dot(axisDir); // Distance along axis (Y)
                
                const closestPointOnAxis = axisOrigin.clone().add(axisDir.clone().multiplyScalar(projection));
                const radiusVec = new THREE.Vector3().subVectors(p, closestPointOnAxis);
                const radius = radiusVec.length(); // Distance from axis (X)
                
                lathePoints.push(new THREE.Vector2(radius, projection));
            });
            
            // 4. Generate Geometry
            const geometry = new THREE.LatheGeometry(lathePoints, 32, 0, angleRad);
            
            // 5. Create Mesh
            const material = new THREE.MeshStandardMaterial({
                color: 0x6366f1, 
                side: THREE.DoubleSide,
                metalness: 0.2,
                roughness: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // 6. Transform Mesh to World Space
            // LatheGeometry is constructed around (0,0,0) with Y-up.
            // We need to align (0,1,0) to axisDir and position at axisOrigin.
            
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, axisDir);
            
            mesh.position.copy(axisOrigin);
            mesh.quaternion.copy(quaternion);
            
            // Metadata
            mesh.name = `Revolve_${profileName}`;
            mesh.userData.filename = mesh.name;
            mesh.userData.cmd = cmdString;
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = 'revolve';
            mesh.userData.angle = angleDeg;
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            appState.scene.add(mesh);
            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            
            addMessageToChat('system', `✅ Revolved <b>${profileName}</b> around <b>${axisName}</b>.`);
        }
    },

    '/sweep_uniform': {
        desc: 'Sweep 1 Profile along Path (@Profile @Path [twist:deg] [rot:deg] [thick:val])',
        execute: async (argRaw, cmdString) => executeSweep(argRaw, { exact: 1 }, cmdString)
    },

    '/sweep_variable': {
        desc: 'Sweep Start to End (@Start @End @Path [thick:val])',
        execute: async (argRaw, cmdString) => executeSweep(argRaw, { exact: 2 }, cmdString)
    },

    '/sweep_variable_section': {
        desc: 'Sweep N Profiles (@P1 @P2 ... @Path)',
        execute: async (argRaw, cmdString) => executeSweep(argRaw, { min: 1 }, cmdString)
    },

    '/sweep_variable_section_multiple': {
        desc: 'Multi-section Sweep (Alias)',
        execute: async (argRaw, cmdString) => executeSweep(argRaw, { min: 1 }, cmdString)
    },

    '/sweep': {
        alias: '/sweep_variable_section'
    },

    '/subtract': {
        desc: 'Boolean Subtract (@Target @Tool1 ...)',
        execute: async (argRaw, cmdString) => {
            await performBoolean('subtract', argRaw, null, cmdString);
        }
    },

    '/union': {
        desc: 'Boolean Union (@Obj1 @Obj2 ...)',
        execute: async (argRaw, cmdString) => {
            await performBoolean('union', argRaw, null, cmdString);
        }
    },

    '/union_all': {
        desc: 'Union ALL visible meshes',
        execute: async (argRaw, cmdString) => {
             const allMeshes = [];
             const traverseVisible = (object) => {
                 if (!object.visible) return;
                 if (object.name === 'GridHelper' || object.name === 'Origin' || object.name === 'Work Features') return;
                 if (object.type.includes('Control')) return;
                 if (object.isMesh) {
                     const isSystem = object.type.includes('Helper') || 
                                      (object.userData && object.userData.type?.startsWith('Work')) ||
                                      (object.parent && (object.parent.name === 'Origin' || object.parent.name === 'Work Features'));
                     if (!isSystem) allMeshes.push(object);
                 }
                 if (object.children) {
                     for (let i = 0; i < object.children.length; i++) traverseVisible(object.children[i]);
                 }
             };
             traverseVisible(appState.scene);

             if (allMeshes.length < 2) {
                 addMessageToChat('system', `⚠️ Need at least 2 visible meshes to union.`);
                 return;
             }
             addMessageToChat('system', `Found ${allMeshes.length} meshes. Unioning...`);
             await performBoolean('union', '', allMeshes, cmdString);
        }
    },

    '/intersect': {
        desc: 'Boolean Intersect (@Obj1 @Obj2 ...)',
        execute: async (argRaw, cmdString) => {
            await performBoolean('intersect', argRaw, null, cmdString);
        }
    }
};

async function performBoolean(op, argRaw, explicitObjects = null, cmdString = '') {
    let resolvedObjects = [];
    
    if (explicitObjects) {
        resolvedObjects = explicitObjects;
    } else {
        const mentions = argRaw.match(/@([\w\d_.-]+)/g);
        
        if (!mentions || mentions.length < 2) {
            addMessageToChat('system', `Usage: /${op} @Obj1 @Obj2 ... (requires at least 2 objects)`);
            return;
        }

        const allObjects = getTaggableObjects();
        const seenUUIDs = new Set();
        const missing = [];

        for (const mention of mentions) {
            const searchName = mention.substring(1).toLowerCase(); 
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

    if (resolvedObjects.some(o => !o.isMesh)) {
         addMessageToChat('system', '⚠️ Boolean operations only work on Meshes.');
         return;
    }

    toggleLoading(true);
    addMessageToChat('system', `Computing ${op.toUpperCase()} of ${resolvedObjects.length} objects...`);

    await new Promise(r => setTimeout(r, 50));

    try {
        let currentCSG = CSG.fromMesh(resolvedObjects[0]);
        
        for (let i = 1; i < resolvedObjects.length; i++) {
            const nextObj = resolvedObjects[i];
            const nextCSG = CSG.fromMesh(nextObj);

            if (op === 'subtract') {
                currentCSG = currentCSG.subtract(nextCSG);
            }
            else if (op === 'union') {
                currentCSG = currentCSG.union(nextCSG);
            }
            else if (op === 'intersect') {
                currentCSG = currentCSG.intersect(nextCSG);
            }
        }

        const baseObj = resolvedObjects[0];
        const resultMesh = currentCSG.toMesh(baseObj.material.clone());
        
        const baseName = resolvedObjects[0].name.replace(/_/g, '');
        let newName = `${op}_${baseName}`;
        if (resolvedObjects.length > 2) {
            newName += `_and_${resolvedObjects.length - 1}_others`;
        } else {
            const secondName = resolvedObjects[1].name.replace(/_/g, '');
            newName += `_${secondName}`;
        }
        
        newName = newName.replace(/\s+/g, '_');
        resultMesh.name = newName;
        resultMesh.userData.filename = resultMesh.name;
        resultMesh.userData.cmd = cmdString;
        
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
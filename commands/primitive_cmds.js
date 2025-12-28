// commands/primitive_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree } from '../tree.js';

// Configuration for Parametric Shapes
// Defines parameter names, default values, and the factory function to build geometry.
export const SHAPE_CONFIG = {
    cube: {
        keys: ['size'],
        defaults: [1],
        factory: (p) => new THREE.BoxGeometry(p.size, p.size, p.size)
    },
    box: {
        keys: ['width', 'height', 'depth'],
        defaults: [1, 1, 1],
        factory: (p) => new THREE.BoxGeometry(p.width, p.height, p.depth)
    },
    sphere: {
        keys: ['radius'],
        defaults: [1],
        factory: (p) => new THREE.SphereGeometry(p.radius, 32, 32)
    },
    cylinder: {
        keys: ['radiusTop', 'radiusBottom', 'height'],
        defaults: [1, 1, 2],
        factory: (p) => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 32)
    },
    cone: {
        keys: ['radius', 'height'],
        defaults: [1, 2],
        factory: (p) => new THREE.ConeGeometry(p.radius, p.height, 32)
    },
    circle: {
        keys: ['radius'],
        defaults: [1],
        factory: (p) => new THREE.CircleGeometry(p.radius, 32)
    },
    ellipse: {
        keys: ['xRadius', 'yRadius'],
        defaults: [2, 1],
        factory: (p) => {
            const curve = new THREE.EllipseCurve(0, 0, p.xRadius, p.yRadius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(64);
            const shape = new THREE.Shape(points);
            return new THREE.ShapeGeometry(shape);
        }
    },
    plane: {
        keys: ['width', 'height'],
        defaults: [5, 5],
        factory: (p) => new THREE.PlaneGeometry(p.width, p.height)
    },
    rect: { // Alias for plane
        keys: ['width', 'height'],
        defaults: [5, 5],
        factory: (p) => new THREE.PlaneGeometry(p.width, p.height)
    },
    torus: {
        keys: ['radius', 'tube'],
        defaults: [2, 0.4],
        factory: (p) => new THREE.TorusGeometry(p.radius, p.tube, 16, 64)
    },
    extrusion: {
        keys: ['height'],
        defaults: [5],
        factory: (p) => {
             if (!p.profile || !Array.isArray(p.profile)) return new THREE.BufferGeometry();
             
             // Ensure proper Vector2 objects
             const points = p.profile.map(pt => new THREE.Vector2(pt.x, pt.y));
             const shape = new THREE.Shape(points);
             
             return new THREE.ExtrudeGeometry(shape, {
                depth: p.height, // Map 'height' param to extrusion depth
                bevelEnabled: false,
                steps: 1
            });
        }
    },
    // --- 2D Sketch Shapes (Used by Sketch Mode) ---
    sketch_rect: {
        keys: ['width', 'height'],
        defaults: [5, 3],
        factory: (p) => {
             // Create a centered rectangle path
             const halfW = p.width / 2;
             const halfH = p.height / 2;
             const points = [
                 new THREE.Vector3(-halfW, -halfH, 0),
                 new THREE.Vector3(halfW, -halfH, 0),
                 new THREE.Vector3(halfW, halfH, 0),
                 new THREE.Vector3(-halfW, halfH, 0),
                 new THREE.Vector3(-halfW, -halfH, 0) // Close loop
             ];
             return new THREE.BufferGeometry().setFromPoints(points);
        }
    },
    sketch_circle: {
        keys: ['radius'],
        defaults: [3],
        factory: (p) => {
             const curve = new THREE.EllipseCurve(0, 0, p.radius, p.radius, 0, 2 * Math.PI, false, 0);
             const points = curve.getPoints(64);
             // Convert Vector2 to Vector3
             const points3 = points.map(v => new THREE.Vector3(v.x, v.y, 0));
             return new THREE.BufferGeometry().setFromPoints(points3);
        }
    },
    sketch_line: {
        keys: ['x1', 'y1', 'x2', 'y2'],
        defaults: [-2, 0, 2, 0],
        factory: (p) => {
             const points = [
                 new THREE.Vector3(p.x1, p.y1, 0),
                 new THREE.Vector3(p.x2, p.y2, 0)
             ];
             return new THREE.BufferGeometry().setFromPoints(points);
        }
    },
    sketch_equation: {
        keys: ['xEq', 'yEq', 'minT', 'maxT', 'steps'],
        defaults: ['5 * cos(t)', '5 * sin(t)', 0, 6.28, 100],
        factory: (p) => {
             const points = [];
             const steps = p.steps || 100;
             // Safe math scope
             const fX = new Function('t', `const {sin,cos,tan,abs,pow,sqrt,PI,E,log,exp} = Math; return ${p.xEq};`);
             const fY = new Function('t', `const {sin,cos,tan,abs,pow,sqrt,PI,E,log,exp} = Math; return ${p.yEq};`);

             const dt = (p.maxT - p.minT) / steps;
             for(let i = 0; i <= steps; i++) {
                 const t = p.minT + i * dt;
                 try {
                     points.push(new THREE.Vector3(fX(t), fY(t), 0));
                 } catch(e) { }
             }
             return new THREE.BufferGeometry().setFromPoints(points);
        }
    }
};

/**
 * Regenerates the geometry of a parametric mesh based on its userData.
 * @param {THREE.Mesh|THREE.Line} mesh 
 */
export function updateParametricMesh(mesh) {
    if (!mesh || !mesh.userData.isParametric || !mesh.userData.shapeType) return;

    const type = mesh.userData.shapeType;
    const config = SHAPE_CONFIG[type];
    
    if (!config) return;

    // 1. Extract parameters from userData
    const params = {};
    config.keys.forEach(key => {
        const val = mesh.userData[key];
        // Only parse as float if the default is not a string (supports equation strings)
        const def = config.defaults[config.keys.indexOf(key)];
        if (typeof def === 'string') {
            params[key] = val !== undefined ? val : def;
        } else {
            let fVal = parseFloat(val);
            if (isNaN(fVal)) fVal = def;
            params[key] = fVal;
        }
    });

    // 2. Pass hidden/complex data (like 2D profile for extrusions)
    if (mesh.userData.profile) {
        params.profile = mesh.userData.profile;
    }

    // 3. Generate new Geometry
    try {
        const newGeo = config.factory(params);
        
        // 4. Dispose old geometry
        if (mesh.geometry) mesh.geometry.dispose();
        
        // 5. Assign new geometry
        mesh.geometry = newGeo;
        
    } catch (e) {
        console.error("Error regenerating geometry:", e);
    }
}

export const primitiveCommands = {
    '/parametric': {
        desc: 'Add parametric shape (cube, sphere, cylinder...)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            
            // Handle optional @ prefix from autocomplete
            let type = args[0].toLowerCase();
            if (type.startsWith('@')) type = type.substring(1);

            if (!type || !SHAPE_CONFIG[type]) {
                const available = Object.keys(SHAPE_CONFIG).join(', ');
                addMessageToChat('system', `Usage: /parametric [shape] [params...]<br>Shapes: ${available}`);
                return;
            }

            const config = SHAPE_CONFIG[type];
            const inputArgs = args.slice(1);
            
            // Build the params object for creation
            const params = {};
            config.keys.forEach((key, index) => {
                const def = config.defaults[index];
                const raw = inputArgs[index];
                
                // Keep strings as strings if default is string
                if (typeof def === 'string') {
                    params[key] = raw !== undefined ? raw : def;
                } else {
                    const parsed = parseFloat(raw);
                    params[key] = (raw !== undefined && !isNaN(parsed)) ? parsed : def;
                }
            });

            try {
                // Initial Geometry Creation
                const geo = config.factory(params);
                
                const material = new THREE.MeshPhysicalMaterial({ 
                    color: 0x3b82f6, 
                    metalness: 0.2, 
                    roughness: 0.3,
                    clearcoat: 0.1,
                    side: THREE.DoubleSide
                });
                
                const mesh = new THREE.Mesh(geo, material);
                
                // Set Name based on parameters (simplification)
                mesh.name = `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now().toString().slice(-4)}`;
                mesh.userData.filename = mesh.name;
                
                // MARK AS PARAMETRIC
                mesh.userData.isParametric = true;
                mesh.userData.shapeType = type;
                
                // STORE PARAMETERS IN USERDATA
                Object.assign(mesh.userData, params);
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                appState.scene.add(mesh);
                appState.currentDisplayObject = mesh;
                attachTransformControls(mesh);
                updateFeatureTree();
                
                addMessageToChat('system', `Added parametric <b>${type}</b>. Edit dimensions in Feature Tree.`);
            } catch (e) {
                 console.error(e);
                 addMessageToChat('system', `⚠️ Error creating geometry: ${e.message}`);
            }
        }
    },
    '/parameteric': { alias: '/parametric' },
    '/addshape': { alias: '/parametric' }
};
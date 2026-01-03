// commands/primitive_cmds.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree } from '../tree.js';

// Configuration for Parametric Shapes
export const SHAPE_CONFIG = {
    cube: {
        keys: ['size', 'fillet'],
        defaults: [1, 0],
        factory: (p) => {
            if (p.fillet > 0) {
                return new RoundedBoxGeometry(p.size, p.size, p.size, 4, p.fillet);
            }
            return new THREE.BoxGeometry(p.size, p.size, p.size);
        }
    },
    box: {
        keys: ['width', 'height', 'depth', 'fillet'],
        defaults: [1, 1, 1, 0],
        factory: (p) => {
            if (p.fillet > 0) {
                return new RoundedBoxGeometry(p.width, p.height, p.depth, 4, p.fillet);
            }
            return new THREE.BoxGeometry(p.width, p.height, p.depth);
        }
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
    // Restored: Ellipse (Filled)
    ellipse: {
        keys: ['xRadius', 'yRadius'],
        defaults: [2, 1],
        factory: (p) => {
            const shape = new THREE.Shape();
            shape.ellipse(0, 0, p.xRadius, p.yRadius, 0, 2 * Math.PI, false, 0);
            return new THREE.ShapeGeometry(shape);
        }
    },
    plane: {
        keys: ['width', 'height'],
        defaults: [5, 5],
        factory: (p) => new THREE.PlaneGeometry(p.width, p.height)
    },
    // Restored: Rectangle (Alias for Plane)
    rectangle: {
        keys: ['width', 'height'],
        defaults: [5, 5],
        factory: (p) => new THREE.PlaneGeometry(p.width, p.height)
    },
    torus: {
        keys: ['radius', 'tube'],
        defaults: [2, 0.4],
        factory: (p) => new THREE.TorusGeometry(p.radius, p.tube, 16, 64)
    },
    // --- 2D Sketch Shapes (Wireframes) ---
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
    sketch_rect: {
        keys: ['width', 'height'],
        defaults: [5, 3],
        factory: (p) => {
             const halfW = p.width / 2;
             const halfH = p.height / 2;
             const points = [
                 new THREE.Vector3(-halfW, -halfH, 0),
                 new THREE.Vector3(halfW, -halfH, 0),
                 new THREE.Vector3(halfW, halfH, 0),
                 new THREE.Vector3(-halfW, halfH, 0),
                 new THREE.Vector3(-halfW, -halfH, 0)
             ];
             return new THREE.BufferGeometry().setFromPoints(points);
        }
    },
    sketch_rounded_rect: {
        keys: ['width', 'height', 'radius'],
        defaults: [5, 3, 0.5],
        factory: (p) => {
            const shape = new THREE.Shape();
            const w = p.width, h = p.height, r = p.radius;
            const x = -w/2, y = -h/2;
            shape.moveTo(x + r, y);
            shape.lineTo(x + w - r, y);
            shape.quadraticCurveTo(x + w, y, x + w, y + r);
            shape.lineTo(x + w, y + h - r);
            shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            shape.lineTo(x + r, y + h);
            shape.quadraticCurveTo(x, y + h, x, y + h - r);
            shape.lineTo(x, y + r);
            shape.quadraticCurveTo(x, y, x + r, y);
            return new THREE.BufferGeometry().setFromPoints(shape.getPoints(64));
        }
    },
    sketch_circle: {
        keys: ['radius'],
        defaults: [3],
        factory: (p) => {
             const curve = new THREE.EllipseCurve(0, 0, p.radius, p.radius, 0, 2 * Math.PI, false, 0);
             return new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
        }
    },
    // Restored: Sketch Ellipse (Wireframe)
    sketch_ellipse: {
        keys: ['xRadius', 'yRadius'],
        defaults: [4, 2],
        factory: (p) => {
             const curve = new THREE.EllipseCurve(0, 0, p.xRadius, p.yRadius, 0, 2 * Math.PI, false, 0);
             return new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
        }
    },
    sketch_equation: {
        keys: ['xEq', 'yEq', 'minT', 'maxT', 'steps'],
        defaults: ['5 * cos(t)', '5 * sin(t)', 0, 6.28, 100],
        factory: (p) => {
             const points = [];
             const steps = p.steps || 100;
             const fX = new Function('t', `const {sin,cos,tan,abs,pow,sqrt,PI,E,log,exp} = Math; return ${p.xEq};`);
             const fY = new Function('t', `const {sin,cos,tan,abs,pow,sqrt,PI,E,log,exp} = Math; return ${p.yEq};`);
             const dt = (p.maxT - p.minT) / steps;
             for(let i = 0; i <= steps; i++) {
                 const t = p.minT + i * dt;
                 try { points.push(new THREE.Vector3(fX(t), fY(t), 0)); } catch(e) {}
             }
             return new THREE.BufferGeometry().setFromPoints(points);
        }
    },
    sketch_composite: {
        keys: ['segments'],
        defaults: ['[]'],
        factory: (p) => {
            const points = [];
            let segments = [];
            try { segments = typeof p.segments === 'string' ? JSON.parse(p.segments) : p.segments; } catch(e) {}
            segments.forEach(seg => {
                if (seg.type === 'line') points.push(new THREE.Vector3(seg.x, seg.y, 0));
            });
            if(points.length===0) { points.push(new THREE.Vector3(0,0,0)); points.push(new THREE.Vector3(1,1,0)); }
            return new THREE.BufferGeometry().setFromPoints(points);
        }
    },
    // --- 3D Operations ---
    extrusion: {
        keys: ['height'],
        defaults: [5],
        factory: (p) => {
            if (!p.profile || !Array.isArray(p.profile)) return new THREE.BoxGeometry(1, 1, p.height);
            
            // Profile is expected to be array of Vector2 or {x,y}
            const shape = new THREE.Shape(p.profile.map(pt => new THREE.Vector2(pt.x, pt.y)));
            
            const settings = {
                depth: p.height,
                bevelEnabled: false, // Default off, let Fillet command handle profile rounding
                steps: 1
            };
            return new THREE.ExtrudeGeometry(shape, settings);
        }
    }
};

/**
 * Regenerates the geometry of a parametric mesh based on its userData.
 */
export function updateParametricMesh(mesh) {
    if (!mesh || !mesh.userData.isParametric || !mesh.userData.shapeType) return;
    const type = mesh.userData.shapeType;
    const config = SHAPE_CONFIG[type];
    
    // For Sketches/Extrusions that use 'profile' but are not standard primitives
    if (!config && (type === 'polyline' || type === 'extrusion')) {
        // Special Handling for generic Extrusion update
        if (type === 'extrusion') {
             const p = mesh.userData;
             const shape = new THREE.Shape(p.profile.map(pt => new THREE.Vector2(pt.x, pt.y)));
             const newGeo = new THREE.ExtrudeGeometry(shape, { depth: p.height, bevelEnabled: false });
             if (mesh.geometry) mesh.geometry.dispose();
             mesh.geometry = newGeo;
        }
        return;
    }

    if (!config) return;

    const params = {};
    config.keys.forEach(key => {
        const val = mesh.userData[key];
        const def = config.defaults[config.keys.indexOf(key)];
        if (typeof def === 'string') {
            params[key] = val !== undefined ? val : def;
        } else {
            let fVal = parseFloat(val);
            if (isNaN(fVal)) fVal = def;
            params[key] = fVal;
        }
    });

    if (mesh.userData.profile) params.profile = mesh.userData.profile;

    try {
        const newGeo = config.factory(params);
        if (mesh.geometry) mesh.geometry.dispose();
        mesh.geometry = newGeo;
        
        // If it was a sketch rect/shape that got updated, update the profile data too so extrusion uses new dimensions
        if (type.startsWith('sketch_')) {
             const pos = newGeo.attributes.position;
             const newProfile = [];
             for(let i=0; i<pos.count; i++) {
                 newProfile.push({ x: pos.getX(i), y: pos.getY(i) });
             }
             mesh.userData.profile = newProfile;
        }

    } catch (e) {
        console.error("Error regenerating geometry:", e);
    }
}

export const primitiveCommands = {
    '/parametric': {
        desc: 'Add parametric shape (cube, sphere, cylinder...)',
        execute: (argRaw, cmdString) => {
            const args = argRaw.trim().split(/\s+/);
            let type = args[0].toLowerCase().replace(/^@/, '');
            
            if (!SHAPE_CONFIG[type]) {
                addMessageToChat('system', `Available: ${Object.keys(SHAPE_CONFIG).join(', ')}`);
                return;
            }
            const config = SHAPE_CONFIG[type];
            const params = {};
            config.keys.forEach((key, index) => {
                const def = config.defaults[index];
                const raw = args[index+1];
                params[key] = (raw !== undefined && !isNaN(parseFloat(raw))) ? parseFloat(raw) : def;
            });

            const geo = config.factory(params);
            const material = new THREE.MeshPhysicalMaterial({ color: 0x3b82f6, metalness: 0.2, roughness: 0.3, clearcoat: 0.1, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, material);
            mesh.name = `${type}_${Object.values(params).join('x')}`;
            mesh.userData.filename = mesh.name;
            mesh.userData.isParametric = true;
            mesh.userData.shapeType = type;
            mesh.userData.cmd = cmdString || '/parametric ' + argRaw; // Store creation command
            Object.assign(mesh.userData, params);
            
            // Generate initial profile for primitives that support it (rect)
            if (type === 'sketch_rect') {
                 const halfW = params.width / 2;
                 const halfH = params.height / 2;
                 mesh.userData.profile = [
                     {x:-halfW, y:-halfH}, {x:halfW, y:-halfH}, 
                     {x:halfW, y:halfH}, {x:-halfW, y:halfH}
                 ];
            }

            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            appState.scene.add(mesh);
            appState.currentDisplayObject = mesh;
            attachTransformControls(mesh);
            updateFeatureTree();
            addMessageToChat('system', `Added ${type}.`);
        }
    }
};
// commands/primitive_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { attachTransformControls } from '../viewer.js';
import { updateFeatureTree } from '../tree.js';

export const primitiveCommands = {
    '/parametric': {
        desc: 'Add parametric shape (cube, sphere, cylinder, circle, ellipse...)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            
            // Handle optional @ prefix from autocomplete
            let type = args[0].toLowerCase();
            if (type.startsWith('@')) type = type.substring(1);

            const params = args.slice(1).map(n => parseFloat(n));
            
            if (!type) {
                addMessageToChat('system', 'Usage: /parametric [shape] [params...]<br>Shapes: cube, sphere, cylinder, cone, circle, ellipse, plane, torus');
                return;
            }

            let geo = null;
            let name = "Shape";
            
            try {
                switch(type) {
                    case 'cube': {
                        const size = params[0] || 1;
                        geo = new THREE.BoxGeometry(size, size, size);
                        name = `Cube_${size}`;
                        break;
                    }
                    case 'box': {
                        const w = params[0] || 1;
                        const h = params[1] || 1;
                        const d = params[2] || 1;
                        geo = new THREE.BoxGeometry(w, h, d);
                        name = `Box_${w}x${h}x${d}`;
                        break;
                    }
                    case 'sphere': {
                        const r = params[0] || 1;
                        geo = new THREE.SphereGeometry(r, 32, 32);
                        name = `Sphere_R${r}`;
                        break;
                    }
                    case 'cylinder': {
                        const rt = params[0] !== undefined ? params[0] : 1;
                        const rb = params[1] !== undefined ? params[1] : 1;
                        const hCyl = params[2] || 2;
                        geo = new THREE.CylinderGeometry(rt, rb, hCyl, 32);
                        name = `Cylinder_R${rt}-${rb}_H${hCyl}`;
                        break;
                    }
                    case 'cone': {
                        const rCone = params[0] || 1;
                        const hCone = params[1] || 2;
                        geo = new THREE.ConeGeometry(rCone, hCone, 32);
                        name = `Cone_R${rCone}_H${hCone}`;
                        break;
                    }
                    case 'circle': {
                        const rCirc = params[0] || 1;
                        geo = new THREE.CircleGeometry(rCirc, 32);
                        name = `Circle_R${rCirc}`;
                        break;
                    }
                    case 'ellipse': {
                        const xR = params[0] || 2;
                        const yR = params[1] || 1;
                        const curve = new THREE.EllipseCurve(
                            0, 0,            // ax, aY
                            xR, yR,           // xRadius, yRadius
                            0, 2 * Math.PI,  // aStartAngle, aEndAngle
                            false,            // aClockwise
                            0                 // aRotation
                        );
                        const points = curve.getPoints(64);
                        const shape = new THREE.Shape(points);
                        geo = new THREE.ShapeGeometry(shape);
                        name = `Ellipse_${xR}x${yR}`;
                        break;
                    }
                    case 'plane':
                    case 'rect': {
                        const wPlane = params[0] || 5;
                        const hPlane = params[1] || 5;
                        geo = new THREE.PlaneGeometry(wPlane, hPlane);
                        name = `Plane_${wPlane}x${hPlane}`;
                        break;
                    }
                    case 'torus': {
                        const rTorus = params[0] || 2;
                        const tTorus = params[1] || 0.4;
                        geo = new THREE.TorusGeometry(rTorus, tTorus, 16, 64);
                        name = `Torus_R${rTorus}_T${tTorus}`;
                        break;
                    }
                    default:
                        addMessageToChat('system', `⚠️ Unknown shape: ${type}`);
                        return;
                }
            } catch (e) {
                 console.error(e);
                 addMessageToChat('system', `⚠️ Error creating geometry: ${e.message}`);
                 return;
            }

            if (geo) {
                const material = new THREE.MeshPhysicalMaterial({ 
                    color: 0x3b82f6, 
                    metalness: 0.2, 
                    roughness: 0.3,
                    clearcoat: 0.1,
                    side: THREE.DoubleSide
                });
                
                const mesh = new THREE.Mesh(geo, material);
                mesh.name = name;
                mesh.userData.filename = name;
                mesh.userData.isParametric = true;
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                appState.scene.add(mesh);
                appState.currentDisplayObject = mesh;
                attachTransformControls(mesh);
                updateFeatureTree();
                
                addMessageToChat('system', `Added parametric <b>${type}</b>.`);
            }
        }
    },
    '/parameteric': { alias: '/parametric' },
    '/addshape': { alias: '/parametric' }
};
// commands/fillet_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { resolveTarget } from './utils.js';
import { updateParametricMesh } from './primitive_cmds.js';

/**
 * ALGORITHM: 2D Polygon Corner Rounding
 * Iterates through a set of points (closed loop).
 * For each sharp corner, it creates a quadratic curve (bevel) 
 * by offsetting the corner point along its adjacent edges.
 * 
 * @param {Array<{x,y}>} points - Original vertices
 * @param {number} radius - Fillet radius
 * @returns {Array<THREE.Vector2>} - New smooth profile with curves
 */
function roundPolygonCorners(points, radius) {
    if (radius <= 0) return points.map(p => new THREE.Vector2(p.x, p.y));
    
    const len = points.length;
    const newPath = new THREE.Shape();
    
    for (let i = 0; i < len; i++) {
        // Get Indices (wrapping around)
        const prevIdx = (i - 1 + len) % len;
        const currIdx = i;
        const nextIdx = (i + 1) % len;

        const pPrev = new THREE.Vector2(points[prevIdx].x, points[prevIdx].y);
        const pCurr = new THREE.Vector2(points[currIdx].x, points[currIdx].y);
        const pNext = new THREE.Vector2(points[nextIdx].x, points[nextIdx].y);

        // Vectors
        const v1 = new THREE.Vector2().subVectors(pPrev, pCurr).normalize(); // Incoming
        const v2 = new THREE.Vector2().subVectors(pNext, pCurr).normalize(); // Outgoing
        
        // Calculate max possible radius for these edge lengths
        const distPrev = pCurr.distanceTo(pPrev);
        const distNext = pCurr.distanceTo(pNext);
        const maxR = Math.min(distPrev, distNext) * 0.45; // Limit to 45% of edge length to prevent overlap
        const r = Math.min(radius, maxR);

        // Calculate Tangent Points (Start and End of Curve)
        const start = pCurr.clone().add(v1.multiplyScalar(r)); // Point on Incoming edge
        const end = pCurr.clone().add(v2.multiplyScalar(r));   // Point on Outgoing edge

        if (i === 0) {
            newPath.moveTo(start.x, start.y);
        } else {
            newPath.lineTo(start.x, start.y);
        }
        
        // Quadratic Curve using the original Corner as Control Point
        newPath.quadraticCurveTo(pCurr.x, pCurr.y, end.x, end.y);
    }
    
    // Close loop logic handled by Shape, but we return points
    // shape.getPoints() returns discretized curve points
    return newPath.getPoints(12); // 12 segments per curve for smoothness
}

export const filletCommands = {
    '/fillet': {
        desc: 'Round edges of object (@Target radius)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (!object) {
                addMessageToChat('system', '⚠️ No object selected.');
                return;
            }

            // Parse radius from args
            const args = argRaw.split(/\s+/);
            const valStr = args.find(a => !isNaN(parseFloat(a)) && !a.startsWith('@'));
            const radius = parseFloat(valStr) || 0.5;

            if (!object.userData.isParametric) {
                 addMessageToChat('system', `⚠️ Object '${name}' is not parametric. Cannot apply fillet.`);
                 return;
            }

            const type = object.userData.shapeType;

            // Strategy 1: Primitives (Box/Cube)
            if (type === 'box' || type === 'cube') {
                object.userData.fillet = radius;
                updateParametricMesh(object);
                addMessageToChat('system', `Applied 3D fillet (r=${radius}) to ${name}.`);
                return;
            }

            // Strategy 2: Extrusions & Sketches (Profile modification)
            if (type === 'extrusion' || type.startsWith('sketch')) {
                // We need the raw profile (original points)
                // If we haven't saved original_profile, save it now to allow re-filleting (non-destructive)
                if (!object.userData.original_profile) {
                    object.userData.original_profile = JSON.parse(JSON.stringify(object.userData.profile));
                }

                const sourcePoints = object.userData.original_profile;
                
                // Check if profile is valid
                if (!sourcePoints || sourcePoints.length < 3) {
                    addMessageToChat('system', '⚠️ Cannot fillet: Invalid profile data.');
                    return;
                }

                // Apply Algorithm
                const smoothPoints = roundPolygonCorners(sourcePoints, radius);
                
                // Update Object Profile
                object.userData.profile = smoothPoints;
                
                // Regenerate
                updateParametricMesh(object);
                addMessageToChat('system', `Applied 2D corner fillet (r=${radius}) to profile of ${name}.`);
                return;
            }

            addMessageToChat('system', `⚠️ Fillet not supported for shape type: ${type}`);
        }
    },
    '/round': { alias: '/fillet' }
};
// commands/sweep_lib.js
import * as THREE from 'three';

/**
 * Computes Rotation Minimizing Frames (Frenet-like but twist-minimized)
 * Uses Double Reflection method to minimize unnecessary rotation around the tangent.
 */
function computeRMFFrames(curve, steps, alignAxis) {
    const frames = [];
    
    // 1. Initial Frame
    const p0 = curve.getPointAt(0);
    const t0 = curve.getTangentAt(0).normalize();
    let n0, b0;
    
    if (alignAxis) {
         // Fixed alignment (e.g. align:Z)
         const axis = alignAxis.clone().normalize();
         // Convention: Align "Up" (Normal) with Axis if possible.
         n0 = new THREE.Vector3().copy(axis);
         // If Tangent is parallel to Up, pick fallback
         if (Math.abs(t0.dot(n0)) > 0.99) {
             n0 = new THREE.Vector3(1,0,0);
             if (Math.abs(t0.dot(n0)) > 0.99) n0.set(0,1,0);
         }
         // Orthogonalize
         b0 = new THREE.Vector3().crossVectors(t0, n0).normalize();
         n0.crossVectors(b0, t0).normalize();
    } else {
         // Heuristic Up
         let up = new THREE.Vector3(0, 1, 0);
         if (Math.abs(t0.dot(up)) > 0.9) up.set(1, 0, 0);
         b0 = new THREE.Vector3().crossVectors(t0, up).normalize();
         n0 = new THREE.Vector3().crossVectors(b0, t0).normalize();
    }
    frames.push({ pos: p0, tangent: t0, normal: n0, binormal: b0, t: 0 });
    
    // 2. Propagate RMF (Double Reflection Method)
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pCurrent = curve.getPointAt(t);
        const tCurrent = curve.getTangentAt(t).normalize();
        
        const prevFrame = frames[i-1];
        const tPrev = prevFrame.tangent;
        const nPrev = prevFrame.normal;
        
        // Compute Reflection 1
        const v1 = pCurrent.clone().sub(prevFrame.pos);
        const c1 = v1.lengthSq();
        
        let nNext = nPrev.clone();
        
        if (c1 > 1e-12) {
            const rL = nPrev.clone().sub(v1.clone().multiplyScalar(2/c1 * v1.dot(nPrev)));
            const tL = tPrev.clone().sub(v1.clone().multiplyScalar(2/c1 * v1.dot(tPrev)));
            
            // Compute Reflection 2
            const v2 = tCurrent.clone().sub(tL);
            const c2 = v2.lengthSq();
            
            if (c2 > 1e-12) {
                nNext = rL.clone().sub(v2.clone().multiplyScalar(2/c2 * v2.dot(rL)));
            } else {
                nNext = rL;
            }
        }
        
        // Re-orthogonalize to avoid drift
        nNext.sub(tCurrent.clone().multiplyScalar(nNext.dot(tCurrent))).normalize();
        const bNext = new THREE.Vector3().crossVectors(tCurrent, nNext).normalize();
        
        frames.push({ pos: pCurrent, tangent: tCurrent, normal: nNext, binormal: bNext, t });
    }
    return frames;
}

/**
 * Projects the world points of a sketch onto the sweep frame plane (defined by B, N).
 * Returns array of Vector2 (u, v).
 */
function getProjectedProfile(sketchObj, frame, sampleCount) {
    if (!sketchObj.userData.profile) throw new Error("Invalid sketch");
    
    sketchObj.updateMatrixWorld(true);
    const rawPoints = sketchObj.userData.profile;
    
    const worldPoints = rawPoints.map(p => {
        return new THREE.Vector3(p.x, p.y, 0).applyMatrix4(sketchObj.matrixWorld);
    });
    
    // Resample
    const resampledWorld = [];
    const totalPoints = worldPoints.length;
    const isClosed = sketchObj.userData.closed; 
    
    let totalLen = 0;
    const dists = [0];
    for (let i = 0; i < totalPoints; i++) {
        if (!isClosed && i === totalPoints - 1) break;
        const next = (i + 1) % totalPoints;
        const d = worldPoints[i].distanceTo(worldPoints[next]);
        totalLen += d;
        dists.push(totalLen);
    }
    
    const step = totalLen / sampleCount;
    let idx = 0;
    
    for (let i = 0; i < sampleCount; i++) {
        const targetDist = i * step;
        while (idx < dists.length - 1 && dists[idx + 1] < targetDist) {
            idx++;
        }
        const startDist = dists[idx];
        const endDist = dists[idx+1];
        const alpha = (endDist - startDist) > 0.00001 ? (targetDist - startDist) / (endDist - startDist) : 0;
        
        const p1 = worldPoints[idx % totalPoints];
        const p2 = worldPoints[(idx + 1) % totalPoints];
        resampledWorld.push(p1.clone().lerp(p2, alpha));
    }

    // Project onto Frame: u=Binormal comp, v=Normal comp
    return resampledWorld.map(wp => {
        const rel = wp.clone().sub(frame.pos);
        return new THREE.Vector2(rel.dot(frame.binormal), rel.dot(frame.normal));
    });
}

function getPointsFromObject(obj) {
    obj.updateMatrixWorld(true);
    const points = [];
    if (obj.userData.profile) {
        obj.userData.profile.forEach(p2 => {
            const v = new THREE.Vector3(p2.x, p2.y, 0).applyMatrix4(obj.matrixWorld);
            points.push(v);
        });
        if (obj.userData.closed) points.push(points[0].clone());
    } else if (obj.geometry) {
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

/**
 * Main function to generate the swept mesh.
 */
export function generateSweptMesh(pathObj, sectionObjs, options = {}) {
    // 1. Extract Path Curve
    const points = getPointsFromObject(pathObj);
    if (!points || points.length < 2) throw new Error("Invalid guide path. Needs at least 2 points.");
    
    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'centripetal'; 
    curve.tension = 0.5;
    if (pathObj.userData && pathObj.userData.closed) curve.closed = true;

    const sampleCount = 64;
    const steps = 100; 
    const thickness = options.thickness || 0;
    const isHollow = thickness > 0;

    // 2. Compute Stable Frames
    const frames = computeRMFFrames(curve, steps, options.align);

    // 3. Capture Profiles
    const profiles = [];
    sectionObjs.forEach((obj, idx) => {
        let t = 0;
        if (sectionObjs.length > 1) t = idx / (sectionObjs.length - 1);
        const frameIndex = Math.floor(t * steps);
        const frame = frames[frameIndex];
        profiles.push(getProjectedProfile(obj, frame, sampleCount));
    });

    // 3b. Apply Rotation Mapping (Index Shifting)
    if (options.rotation && options.rotation !== 0) {
        const rot = options.rotation;
        profiles.forEach((prof, idx) => {
            if (idx === 0) return; 
            const t = idx / (sectionObjs.length - 1);
            const angle = rot * t;
            const shiftCount = Math.round((angle / 360) * sampleCount);
            if (shiftCount !== 0) {
                const len = prof.length;
                const normalizedShift = ((shiftCount % len) + len) % len;
                const newProf = new Array(len);
                for(let k=0; k<len; k++) {
                    const sourceIdx = (k + normalizedShift) % len;
                    newProf[k] = prof[sourceIdx];
                }
                profiles[idx] = newProf;
            }
        });
    }

    // 4. Generate Geometry
    const outerVertices = [];
    const innerVertices = [];
    const indices = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const frame = frames[i];
        
        let normal = frame.normal.clone();
        let binormal = frame.binormal.clone();
        
        // Apply Physical Twist
        const totalTwist = options.twist || 0;
        const twistAngle = totalTwist * t;
        
        if (twistAngle !== 0) {
            const rad = THREE.MathUtils.degToRad(twistAngle);
            normal.applyAxisAngle(frame.tangent, rad);
            binormal.applyAxisAngle(frame.tangent, rad);
        }

        // Interpolate 2D Profile
        let currentProfile = [];
        if (profiles.length === 1) {
            currentProfile = profiles[0];
        } else {
            const numSegments = profiles.length - 1;
            const segT = t * numSegments;
            let index = Math.floor(segT);
            let localT = segT - index;
            if (index >= numSegments) {
                index = numSegments - 1;
                localT = 1.0;
            }
            const pA = profiles[index];
            const pB = profiles[index + 1];
            for (let k = 0; k < sampleCount; k++) {
                const vA = pA[k];
                const vB = pB[k];
                currentProfile.push(new THREE.Vector2().lerpVectors(vA, vB, localT));
            }
        }

        // Generate Outer Vertices
        for (let k = 0; k < sampleCount; k++) {
            const pt2d = currentProfile[k];
            const v = frame.pos.clone()
                .addScaledVector(binormal, pt2d.x)
                .addScaledVector(normal, pt2d.y);
            outerVertices.push(v.x, v.y, v.z);
        }

        // Generate Inner Vertices if Hollow
        if (isHollow) {
            // Calculate 2D centroid
            let cx = 0, cy = 0;
            currentProfile.forEach(p => { cx += p.x; cy += p.y; });
            cx /= sampleCount;
            cy /= sampleCount;
            const center = new THREE.Vector2(cx, cy);

            for (let k = 0; k < sampleCount; k++) {
                const pt2d = currentProfile[k];
                const dir = new THREE.Vector2().subVectors(pt2d, center);
                const len = dir.length();
                let scale = 1.0;
                if (len > 0) scale = Math.max(0, len - thickness) / len;
                
                // Inner 2D point
                const inner2d = new THREE.Vector2().addVectors(center, dir.multiplyScalar(scale));
                
                const v = frame.pos.clone()
                    .addScaledVector(binormal, inner2d.x)
                    .addScaledVector(normal, inner2d.y);
                innerVertices.push(v.x, v.y, v.z);
            }
        }
    }

    // Combine Vertices
    const vertices = [...outerVertices, ...innerVertices];
    const outerOffset = 0;
    const innerOffset = outerVertices.length / 3;

    // Generate Indices
    // 1. Outer Wall
    for (let i = 0; i < steps; i++) {
        for (let k = 0; k < sampleCount; k++) {
            const nextK = (k + 1) % sampleCount;
            const a = i * sampleCount + k;
            const b = i * sampleCount + nextK;
            const c = (i + 1) * sampleCount + k;
            const d = (i + 1) * sampleCount + nextK;
            indices.push(a, d, b);
            indices.push(a, c, d);
        }
    }

    // 2. Inner Wall (Reverse Winding) & Rims
    if (isHollow) {
        for (let i = 0; i < steps; i++) {
            for (let k = 0; k < sampleCount; k++) {
                const nextK = (k + 1) % sampleCount;
                const a = innerOffset + i * sampleCount + k;
                const b = innerOffset + i * sampleCount + nextK;
                const c = innerOffset + (i + 1) * sampleCount + k;
                const d = innerOffset + (i + 1) * sampleCount + nextK;
                // Reverse: a,b,d and a,d,c
                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }

        // 3. Rims (Connecting Outer and Inner)
        // If not closed path, we must seal the ends.
        if (!curve.closed) {
            // Start Rim (Step 0)
            // Outer[0] loop to Inner[0] loop
            // Facing "back", so winding must be consistent with looking from outside.
            // Outer is CCW. Inner is CCW.
            // Triangle: Outer[k], Outer[nextK], Inner[nextK] -> Normal roughly +Z? No.
            // Start rim normal is -Tangent.
            // Standard Rim Logic:
            const startRowOuter = 0;
            const startRowInner = innerOffset;
            for (let k = 0; k < sampleCount; k++) {
                const nextK = (k + 1) % sampleCount;
                const o1 = startRowOuter + k;
                const o2 = startRowOuter + nextK;
                const i1 = startRowInner + k;
                const i2 = startRowInner + nextK;
                // Quad: o1, o2, i2, i1.
                // Triangles: o1, i1, i2 and o1, i2, o2
                indices.push(o1, i1, i2);
                indices.push(o1, i2, o2);
            }

            // End Rim (Step Last)
            const endRowOuter = steps * sampleCount;
            const endRowInner = innerOffset + steps * sampleCount;
            for (let k = 0; k < sampleCount; k++) {
                const nextK = (k + 1) % sampleCount;
                const o1 = endRowOuter + k;
                const o2 = endRowOuter + nextK;
                const i1 = endRowInner + k;
                const i2 = endRowInner + nextK;
                // Opposite winding
                // Quad: o1, o2, i2, i1 reversed -> o1, o2, i2 ...
                // Triangles: o1, o2, i2 and o1, i2, i1
                indices.push(o1, o2, i2);
                indices.push(o1, i2, i1);
            }
        }
    }

    // Solid Caps (If not hollow and capped)
    if (!isHollow && options.capped && !curve.closed) {
        try {
            // Start Cap
            const startCapStartIdx = vertices.length / 3;
            for (let k = 0; k < sampleCount; k++) vertices.push(vertices[k * 3], vertices[k * 3 + 1], vertices[k * 3 + 2]);
            const startTris = THREE.ShapeUtils.triangulateShape(profiles[0], []);
            startTris.forEach(t => indices.push(startCapStartIdx + t[2], startCapStartIdx + t[1], startCapStartIdx + t[0]));

            // End Cap
            const endCapStartIdx = vertices.length / 3;
            const tubeEndIdx = steps * sampleCount;
            for (let k = 0; k < sampleCount; k++) {
                const base = (tubeEndIdx + k) * 3;
                vertices.push(vertices[base], vertices[base + 1], vertices[base + 2]);
            }
            const endTris = THREE.ShapeUtils.triangulateShape(profiles[profiles.length - 1], []);
            endTris.forEach(t => indices.push(endCapStartIdx + t[0], endCapStartIdx + t[1], endCapStartIdx + t[2]));
        } catch (e) {
            console.warn("Failed to cap sweep geometry:", e);
        }
    }

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
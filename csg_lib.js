// csg_lib.js
// A vanilla JS implementation of CSG (Constructive Solid Geometry) using BSP Trees.
// Adapted for Three.js integration without external dependencies.

import * as THREE from 'three';

// --- CSG Core Classes ---

class CSGNode {
    constructor(polygons) {
        this.plane = null;
        this.front = null;
        this.back = null;
        this.polygons = [];
        if (polygons) this.build(polygons);
    }

    clone() {
        const node = new CSGNode();
        node.plane = this.plane && this.plane.clone();
        node.front = this.front && this.front.clone();
        node.back = this.back && this.back.clone();
        node.polygons = this.polygons.map(p => p.clone());
        return node;
    }

    invert() {
        this.polygons.forEach(p => p.flip());
        this.plane && this.plane.flip();
        this.front && this.front.invert();
        this.back && this.back.invert();
        const temp = this.front;
        this.front = this.back;
        this.back = temp;
    }

    clipPolygons(polygons) {
        if (!this.plane) return polygons.slice();
        let front = [], back = [];
        for (let i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], front, back, front, back);
        }
        if (this.front) front = this.front.clipPolygons(front);
        if (this.back) back = this.back.clipPolygons(back);
        else back = [];
        return front.concat(back);
    }

    clipTo(bsp) {
        this.polygons = bsp.clipPolygons(this.polygons);
        if (this.front) this.front.clipTo(bsp);
        if (this.back) this.back.clipTo(bsp);
    }

    allPolygons() {
        let polygons = this.polygons.slice();
        if (this.front) polygons = polygons.concat(this.front.allPolygons());
        if (this.back) polygons = polygons.concat(this.back.allPolygons());
        return polygons;
    }

    build(polygons) {
        if (!polygons.length) return;
        if (!this.plane) this.plane = polygons[0].plane.clone();
        let front = [], back = [];
        for (let i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }
        if (front.length) {
            if (!this.front) this.front = new CSGNode();
            this.front.build(front);
        }
        if (back.length) {
            if (!this.back) this.back = new CSGNode();
            this.back.build(back);
        }
    }
}

class CSGPlane {
    constructor(normal, w) {
        this.normal = normal;
        this.w = w;
    }

    clone() { return new CSGPlane(this.normal.clone(), this.w); }
    flip() { this.normal.negate(); this.w = -this.w; }

    splitPolygon(polygon, coplanarFront, coplanarBack, front, back) {
        const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;
        const EPSILON = 1e-5;
        let polygonType = 0;
        const types = [];
        
        for (let i = 0; i < polygon.vertices.length; i++) {
            const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
            const type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
            polygonType |= type;
            types.push(type);
        }

        switch (polygonType) {
            case COPLANAR:
                (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
                break;
            case FRONT:
                front.push(polygon);
                break;
            case BACK:
                back.push(polygon);
                break;
            case SPANNING:
                const f = [], b = [];
                for (let i = 0; i < polygon.vertices.length; i++) {
                    const j = (i + 1) % polygon.vertices.length;
                    const ti = types[i], tj = types[j];
                    const vi = polygon.vertices[i], vj = polygon.vertices[j];
                    if (ti !== BACK) f.push(vi);
                    if (ti !== FRONT) b.push(vi);
                    if ((ti | tj) === SPANNING) {
                        const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.clone().sub(vi.pos));
                        const v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v);
                    }
                }
                if (f.length >= 3) front.push(new CSGPolygon(f, polygon.shared));
                if (b.length >= 3) back.push(new CSGPolygon(b, polygon.shared));
                break;
        }
    }
}

class CSGPolygon {
    constructor(vertices, shared) {
        this.vertices = vertices;
        this.shared = shared;
        this.plane = new CSGPlane(new THREE.Vector3(), 0);
        // Compute plane from first 3 non-collinear vertices
        if (vertices.length >= 3) {
            const a = vertices[0].pos;
            const b = vertices[1].pos;
            const c = vertices[2].pos;
            this.plane.normal.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
            this.plane.w = this.plane.normal.dot(a);
        }
    }

    clone() { return new CSGPolygon(this.vertices.map(v => v.clone()), this.shared); }
    flip() { this.vertices.reverse().forEach(v => v.flip()); this.plane.flip(); }
}

class CSGVertex {
    constructor(pos, normal, uv) {
        this.pos = new THREE.Vector3().copy(pos);
        this.normal = new THREE.Vector3().copy(normal);
        this.uv = new THREE.Vector2().copy(uv || new THREE.Vector2());
    }

    clone() { return new CSGVertex(this.pos, this.normal, this.uv); }
    flip() { this.normal.negate(); }

    interpolate(other, t) {
        return new CSGVertex(
            this.pos.clone().lerp(other.pos, t),
            this.normal.clone().lerp(other.normal, t),
            this.uv.clone().lerp(other.uv, t)
        );
    }
}

// --- Main CSG Interface ---

export class CSG {
    constructor() {
        this.polygons = [];
    }

    static fromMesh(mesh) {
        const csg = new CSG();
        mesh.updateMatrixWorld();
        const mat = mesh.matrixWorld;
        const normMat = new THREE.Matrix3().getNormalMatrix(mat);
        
        // Ensure geometry is buffered
        let geo = mesh.geometry;
        if (!geo.attributes.position) return csg;

        const posAttr = geo.attributes.position;
        const normAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;
        const index = geo.index;

        const getV = (i) => {
            const p = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(mat);
            const n = normAttr ? new THREE.Vector3().fromBufferAttribute(normAttr, i).applyMatrix3(normMat).normalize() : new THREE.Vector3(0,1,0);
            const u = uvAttr ? new THREE.Vector2().fromBufferAttribute(uvAttr, i) : new THREE.Vector2();
            return new CSGVertex(p, n, u);
        };

        if (index) {
            for (let i = 0; i < index.count; i += 3) {
                csg.polygons.push(new CSGPolygon([
                    getV(index.getX(i)),
                    getV(index.getX(i+1)),
                    getV(index.getX(i+2))
                ]));
            }
        } else {
            for (let i = 0; i < posAttr.count; i += 3) {
                csg.polygons.push(new CSGPolygon([getV(i), getV(i+1), getV(i+2)]));
            }
        }
        return csg;
    }

    toMesh(material) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        
        for (let i = 0; i < this.polygons.length; i++) {
            const p = this.polygons[i];
            // Triangulate convex polygon fan
            for (let j = 2; j < p.vertices.length; j++) {
                const v0 = p.vertices[0];
                const v1 = p.vertices[j-1];
                const v2 = p.vertices[j];

                vertices.push(v0.pos.x, v0.pos.y, v0.pos.z, v1.pos.x, v1.pos.y, v1.pos.z, v2.pos.x, v2.pos.y, v2.pos.z);
                normals.push(v0.normal.x, v0.normal.y, v0.normal.z, v1.normal.x, v1.normal.y, v1.normal.z, v2.normal.x, v2.normal.y, v2.normal.z);
                uvs.push(v0.uv.x, v0.uv.y, v1.uv.x, v1.uv.y, v2.uv.x, v2.uv.y);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Re-compute normals just in case the CSG math distorted them
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, material || new THREE.MeshStandardMaterial({ color: 0x888888 }));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    union(csg) {
        const a = new CSGNode(this.clone().polygons);
        const b = new CSGNode(csg.clone().polygons);
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        return new CSG().setPolygons(a.allPolygons());
    }

    subtract(csg) {
        const a = new CSGNode(this.clone().polygons);
        const b = new CSGNode(csg.clone().polygons);
        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return new CSG().setPolygons(a.allPolygons());
    }

    intersect(csg) {
        const a = new CSGNode(this.clone().polygons);
        const b = new CSGNode(csg.clone().polygons);
        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.build(b.allPolygons());
        a.invert();
        return new CSG().setPolygons(a.allPolygons());
    }

    clone() {
        const csg = new CSG();
        csg.polygons = this.polygons.map(p => p.clone());
        return csg;
    }

    setPolygons(polygons) {
        this.polygons = polygons;
        return this;
    }
}
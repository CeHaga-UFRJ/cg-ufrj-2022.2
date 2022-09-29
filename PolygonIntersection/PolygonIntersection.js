/**
 *  @file
 *
 *  <p>InterseÃ§Ã£o entre cÃ­rculos e polÃ­gonos convexos.</p>
 *
 *  <pre>
 *  Documentation:
 *  - Ubuntu:
 *     - sudo apt install jsdoc-toolkit
 *  - MacOS:
 *     - sudo port install npm7 (or npm8)
 *     - sudo npm install -g jsdoc
 *  - jsdoc -d docCircRec circRec.js
 *
 *  Requirements:
 *  - npm init
 *  - npm install gl-matrix
 *  </pre>
 *
 *  @author Paulo Roma & Claudio EsperanÃ§a
 *  @since 08/08/2022
 *  @see http://lcg.ufrj.br/cwdc/10-html5css3/circRec.html
 *  @see <a href="../circRecNoSource.js">source</a>
 *  @see https://observablehq.com/@esperanc/configurando-um-triangulo-isosceles
 *  @see https://drive.google.com/file/d/1MjlBWjBP-5ijNTaPDL7-7OOnd8906z6Y/view
 *  @see https://glmatrix.net
 *  @see https://dens.website/tutorials/webgl/gl-matrix
 *  @see <img src="../rect-circle.png" width="768">
 */

"use strict";

/**
 * Two dimensional vector.
 * @type {glvec2}
 */
let vec2d = (function () {
    /**
     * @member {Object} glvec2 an extended vec2 from gl-matrix.
     */
    let glvec2 = Object.assign({}, vec2);
    let glmat3 = mat3;

    /**
     * Orientation between 3 points.
     * @param {Array<Number,Number>} a first point.
     * @param {Array<Number,Number>} b second point.
     * @param {Array<Number,Number>} c third point.
     * @returns {Number} orientation.
     * @see https://en.wikipedia.org/wiki/Cross_product
     * @see http://www.cs.tufts.edu/comp/163/OrientationTests.pdf
     * @see <img src="../orient.png" width="320">
     * @global
     * @function
     */
    glvec2.orient = function (a, b, c) {
        return Math.sign(
            glmat3.determinant([1, a[0], a[1], 1, b[0], b[1], 1, c[0], c[1]])
        );
    };

    /**
     * Returns true iff line segments a-b and c-d intersect.
     * @param {Array<Number,Number>} a starting vertex.
     * @param {Array<Number,Number>} b end vertex.
     * @param {Array<Number,Number>} c starting vertex.
     * @param {Array<Number,Number>} d end vertex.
     * @returns {Boolean} intersect or not.
     * @global
     * @function
     */
    glvec2.segmentsIntersect = function (a, b, c, d) {
        return (
            glvec2.orient(a, b, c) != glvec2.orient(a, b, d) &&
            glvec2.orient(c, d, a) != glvec2.orient(c, d, b)
        );
    };

    /**
     * <p>Line intersection.</p>
     *
     * Sets 'out' to the intersection point between
     * lines [x1,y1]-[x2,y2] and [x3,y3]-[x4,y4].
     * @param {Array<Number,Number>} out intersection point.
     * @param {Array<Number,Number>} param1 starting vertex.
     * @param {Array<Number,Number>} param2 end vertex.
     * @param {Array<Number,Number>} param3 starting vertex.
     * @param {Array<Number,Number>} param4 end vertex.
     * @returns {Array<Number,Number>} intersection point.
     * @see https://en.wikipedia.org/wiki/Lineâ€“line_intersection
     * @global
     * @function
     */
    glvec2.lineIntersection = function (
        out,
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4]
    ) {
        const D = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        const a = x1 * y2 - y1 * x2,
            b = x3 * y4 - y3 * x4;

        out[0] = (a * (x3 - x4) - (x1 - x2) * b) / D;
        out[1] = (a * (y3 - y4) - (y1 - y2) * b) / D;
        return out;
    };
    return glvec2;
})();

const curry = fn => {
    const curried = (...args) => {
        if (args.length >= fn.length) {
            return fn(...args);
        }
        return (...argsNext) => curried(...args, ...argsNext);
    };
    return curried;
};

const vScale = curry((sc, v) => [v[0] * sc, v[1] * sc]);
const vAdd = curry((v1, v2) => [v1[0] + v2[0], v1[1] + v2[1]]);
const vMidpoint = curry((v, v2) => vScale(0.5, vAdd(v, v2)));

/**
 * Fills the canvas with a solid color and border.
 * @param {CanvasRenderingContext2D} ctx canvas context.
 * @param {Number} w width.
 * @param {Number} h height.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
 */
function fillCanvas(ctx, w, h) {
    ctx.fillStyle = "antiquewhite";
    ctx.strokeStyle = "brown";
    ctx.lineWidth = 10;
    // clear canvas.
    ctx.fillRect(0, 0, w, h);
    // draw canvas border.
    ctx.strokeRect(0, 0, w, h);
    ctx.lineWidth = 1;
}

/**
 * Returns the closest point of the border of the polygon poly to p.
 * @param {Array<Number,Number>} p point.
 * @param {Array<Array<Number,Number>>} poly polygon.
 * @returns {Array<Number,Number>} closest point.
 * @see <img src="../closest.jpg" width="384">
 */
function closestPolyPoint(p, poly) {
    let closest = poly[0];
    let minDist = vec2.distance(p, closest);
    for (let i = 1; i < poly.length; i++) {
        let dist = vec2.distance(p, poly[i]);
        if (dist < minDist) {
            minDist = dist;
            closest = poly[i];
        }
    }
    return closest;
}

/**
 * <p>Returns true iff convex polygons poly and poly2 intersect.</p>
 * The algorithm is based on the separated axis theorem (SAT), which states that, <br>
 * if two polys do not intersect, then there is a separation line between them, <br>
 * in such a way that the vertices of poly are on one side of the line,<br>
 * and the vertices of poly2 are on the other side.
 * <p>It is enough to test the edges of each polygon as a separation line.<br>
 * If none of them do separate the polys, then they must intersect each other.</p>
 * Check the <a href="../docUtil/global.html#orient">orient</a> predicate for deciding
 * on which side of a line a point lies.
 * @param {Array<Array<Number,Number>>} poly first polygon.
 * @param {Array<Array<Number,Number>>} poly2 second polygon.
 * @returns {Boolean} intersect or not.
 * @see http://0x80.pl/articles/convex-polygon-intersection/article.html
 * @see <img src="../sample.png" width="196">
 */
function convexPolysIntersect(poly, poly2) {
    let n = poly.length;
    let n2 = poly2.length;
    let p1, p2, p3, p4;
    let i, j;
    for (i = 0; i < n; i++) {
        p1 = poly[i];
        p2 = poly[(i + 1) % n];
        for (j = 0; j < n2; j++) {
            p3 = poly2[j];
            p4 = poly2[(j + 1) % n2];
            if (vec2d.segmentsIntersect(p1, p2, p3, p4)) {
                return true;
            }
        }
    }
    return false;
}

function intersection(rect, rectTwo) {
    let V = SAT.Vector;
    let P = SAT.Polygon;

    let polygon1 = new P(new V(), [
        new V(rect[0][0], rect[0][1]), new V(rect[1][0], rect[1][1]), new V(rect[2][0], rect[2][1]), new V(rect[3][0], rect[3][1])
    ]);

    let polygon2 = new P(new V(), [
        new V(rectTwo[0][0], rectTwo[0][1]), new V(rectTwo[1][0], rectTwo[1][1]), new V(rectTwo[2][0], rectTwo[2][1]), new V(rectTwo[3][0], rectTwo[3][1])
    ]);

    let response;
    let collided = SAT.testPolygonPolygon(polygon1, polygon2, response);

    return collided;
}

function rectangle(points) {
    let vertices = [];
    let center = points[0];
    for (let i = 1; i < 5; i++) {
        let v1 = vec2.sub([], points[i], center);
        let v2 = vec2.sub([], points[(i % 4) + 1], center);
        vertices.push(vec2.add([], vec2.add([], v1, v2), center))
    }
    //return all the vertices of the rectangle using the medians and the center
    return vertices;
}

/**
 * Returns true iff convex polygon poly {@link closestPolyPoint intersects}
 * a circle with the given center and radius.
 * @param {Array<Array<Number,Number>>} poly polygon.
 * @param {Array<Number,Number>} center circle center.
 * @param {Number} radius circle radius.
 * @returns {Boolean} intersect or not.
 */
function convexPolyCircleIntersect(poly, center, radius) {
    let n = poly.length;
    let p1, p2;
    let i;
    for (i = 0; i < n; i++) {
        p1 = poly[i];
        p2 = poly[(i + 1) % n];
        if (vec2d.segmentCircleIntersect(p1, p2, center, radius)) {
            return true;
        }
    }
    return false;
}

/**
 * Returns true iff a circle intersects another circle with the given center and radius.
 * @param {Array<Number,Number>} center1 first circle center.
 * @param {Number} radius1 first circle radius.
 * @param {Array<Number,Number>} center2 second circle center.
 * @param {Number} radius2 second circle radius.
 * @returns {Boolean} intersect or not.
 * @see https://milania.de/blog/Intersection_area_of_two_circles_with_implementation_in_C%2B%2B
 * @see <img src="../IntersectingCirclesArea_CircularSegmentsSmallAngle.png" width="320">
 */
function circleCircleIntersect(center1, radius1, center2, radius2) {
    let d = vec2d.dist(center1, center2);
    if (d > radius1 + radius2) {
        return false;
    }
    if (d < Math.abs(radius1 - radius2)) {
        return false;
    }
    return true;
}

/**
 * Returns a rectangular polygon in the form of a vertex circulation,
 * given:
 * <ul>
 * <li>its center, </li>
 * <li>a vector (u) pointing from the center to the midpoint
 *       of one of its sides, </li>
 * <li>and the size of that side.</li>
 * </ul>
 * @param {Array<Number,Number>} center rectangle center.
 * @param {Array<Number,Number>} u orientation vector.
 * @param {Number} size side size.
 * @returns {Array<Array<Number,Number>>} a rectangle (a polygon).
 * @see <img src="../cRv2l.png" width="320">
 */
function makeRectangle(center, u, size) {
    let v = vec2d.rotate([], u, [0, 0], Math.PI / 2);
    let halfSize = size / 2;
    let p1 = vec2d.add([], center, vec2d.scale([], u, halfSize));
    let p2 = vec2d.add([], center, vec2d.scale([], v, halfSize));
    let p3 = vec2d.add([], center, vec2d.scale([], u, -halfSize));
    let p4 = vec2d.add([], center, vec2d.scale([], v, -halfSize));
    return [p1, p2, p3, p4];
}

/**
 * Returns an array with the mid-points of the edges of polygon poly.
 * @param {Array<Array<Number,Number>>} poly polygon.
 * @returns {Array<Array<Number,Number>>} mid-points.
 */
function midPoints(poly) {
    let n = poly.length;
    let midPoints = [];
    let p1, p2;
    let i;
    for (i = 0; i < n; i++) {
        p1 = poly[i];
        p2 = poly[(i + 1) % n];
        midPoints.push(vMidpoint(p1, p2));
    }
    return midPoints;
}

/**
 * <p>Demo: Teste de interseÃ§Ã£o entre triÃ¢ngulos.</p>
 *
 * Mova interativamente os pontos Ã¢ncora para alterar a configuraÃ§Ã£o dos triÃ¢ngulos.<br>
 * Se houver interseÃ§Ã£o, o desenho serÃ¡ vermelho, caso contrÃ¡rio, preto.
 *
 * <p>TriÃ¢ngulos sÃ£o descritos por objetos:</p>
 * { basePoint: [270, 350], oppositeVertex: [300, 200], color: "black" }
 *
 * @name isoscelesDemo
 * @function
 */
(function isoscelesDemo() {
    const demo = document.querySelector("#theCanvas");
    const ctx = demo.getContext("2d");
    let [w, h] = [demo.clientWidth, demo.clientHeight];
    const iso = [
        { basePoint: [270, 350], oppositeVertex: [300, 200], color: "black" },
        { basePoint: [100, 50], oppositeVertex: [50, 20], color: "black" },
        { basePoint: [250, 150], oppositeVertex: [150, 100], color: "black" },
    ];

    function makePts() {
        for (let t of iso) {
            t.poly = isosceles(t);
            t.anchors = [t.basePoint, t.oppositeVertex];
        }
    }

    makePts();
    let sel = null;
    let prevMouse = null;

    const update = () => {
        fillCanvas(ctx, w, h);

        // tri âˆ© tri
        for (let t1 of iso) {
            t1.color = "black";
            for (let t2 of iso) {
                if (t1 == t2) continue;
                let intersect = convexPolysIntersect(t1.poly, t2.poly);
                if (intersect) {
                    t1.color = "red";
                    t2.color = "red";
                }
            }
        }

        for (let t of iso) {
            ctx.fillStyle = ctx.strokeStyle = t.color;
            for (let p of t.anchors) {
                ctx.beginPath();
                ctx.arc(...p, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            for (let p of t.poly) {
                ctx.lineTo(...p);
            }
            ctx.closePath();
            ctx.stroke();
        }
    };
    update();

    demo.onmousemove = (e) => {
        if (sel) {
            let mouse = [e.offsetX, e.offsetY];
            let [tri, ianchor] = sel;
            let delta = vec2d.sub([], mouse, prevMouse);
            prevMouse = mouse;
            if (ianchor == 0) {
                let v = vec2d.sub([], tri.oppositeVertex, tri.basePoint);
                vec2d.add(tri.basePoint, tri.basePoint, delta);
                vec2d.add(tri.oppositeVertex, tri.basePoint, v);
            } else {
                vec2d.add(tri.oppositeVertex, tri.oppositeVertex, delta);
            }
            makePts();
            update();
        }
    };

    demo.onmousedown = (e) => {
        sel = null;
        const mouse = [e.offsetX, e.offsetY];
        prevMouse = mouse;
        for (let tri of iso) {
            for (let [ianchor, p] of tri.anchors.entries()) {
                if (vec2d.distance(mouse, p) <= 5) {
                    sel = [tri, ianchor];
                }
            }
        }
    };

    demo.onmouseup = () => {
        sel = null;
    };
    update();
})();

/**
 * Returns the 3 vertices of an isosceles triangle
 * defined by the center point of its base and the
 * opposite vertex.
 * @param {Array<Number,Number>} basePoint base midpoint.
 * @param {Array<Number,Number>} oppositeVertex opposite vertex.
 * @return {Array<Array<Number,Number>, Array<Number,Number>, Array<Number,Number>>}
 * an isosceles triangle (a convex polygon).
 * @see https://en.wikipedia.org/wiki/Isosceles_triangle
 * @see <img src="../Isosceles-Triangle.png" width="256">
 */
function isosceles({ basePoint, oppositeVertex }) {
    const u = vec2d.sub([], basePoint, oppositeVertex);
    const v = [-u[1], u[0]];
    const w = [u[1], -u[0]];
    return [
        oppositeVertex,
        vec2d.add([], basePoint, v),
        vec2d.add([], basePoint, w),
    ];
}

(function rectangleDemo() {
    const demo = document.querySelector("#theCanvas");
    const ctx = demo.getContext("2d");
    let [w, h] = [demo.clientWidth, demo.clientHeight];
    const rect = [
        [
            [100, 100],
            [100 + 25, 100 + 25],
            [100 + 25, 100 - 25],
            [100 - 25, 100 - 25],
            [100 - 25, 100 + 25]
        ],
        [
            [200, 200],
            [200 + 25, 200 + 25],
            [200 + 25, 200 - 25],
            [200 - 25, 200 - 25],
            [200 - 25, 200 + 25]
        ],
        [
            [300, 300],
            [300 + 25, 300 + 25],
            [300 + 25, 300 - 25],
            [300 - 25, 300 - 25],
            [300 - 25, 300 + 25]
        ],
    ];

    const update = () => {
        ctx.clearRect(0, 0, w, h);
        fillCanvas(ctx, w, h);


        for (let r of rect) {
            ctx.fillStyle = ctx.strokeStyle = "black";
            for (let r2 of rect) {
                if (r == r2) continue;
                if (intersection(rectangle(r), rectangle(r2))) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }
            for (let p of r) {
                ctx.beginPath();
                ctx.arc(...p, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            for (let p of rectangle(r)) {
                ctx.lineTo(...p);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }


    let prevMouse = null;
    //do not touch
    const dragBase = (e, rect) => {
        let mouse = [e.offsetX, e.offsetY];
        let delta = vec2.sub([], mouse, prevMouse);
        prevMouse = mouse;
        vec2.add(rect[0], rect[0], delta);
        for (let i = 1; i < 5; i++) {
            vec2.add(rect[i], rect[i], delta);
        }
    };
    //do not touch

    const dragVtx = (e, i, rect) => {
        let mouse = [e.offsetX, e.offsetY];
        let vtx = rect[i];
        let delta = vec2.sub([], mouse, prevMouse);
        prevMouse = mouse;
        vec2.add(vtx, vtx, delta);
        vec2.sub(rect[(i + 1) % 4 + 1], rect[(i + 1) % 4 + 1], delta);

        let size = Math.abs(vec2.dist(rect[(i % 4) + 1], rect[0]));

        vec2.rotate(rect[(i % 4) + 1], vtx, rect[0], -Math.PI / 2);
        vec2.sub(rect[(i % 4) + 1], rect[(i % 4) + 1], rect[0]);
        vec2.normalize(rect[(i % 4) + 1], rect[(i % 4) + 1]);
        vec2.scale(rect[(i % 4) + 1], rect[(i % 4) + 1], size);
        vec2.add(rect[(i % 4) + 1], rect[(i % 4) + 1], rect[0]);


        vec2.rotate(rect[(i - 2 + 4) % 4 + 1], rect[(i % 4) + 1], rect[0], Math.PI);

    };

    demo.onmousedown = (e) => {
        const mouse = [e.offsetX, e.offsetY];
        prevMouse = mouse;
        demo.onmousemove = null;
        for (let r of rect) {
            for (let i of [0, 1, 2, 3, 4]) {
                let p = r[i];
                let d = vec2.distance(mouse, p);
                if (d <= 5) {
                    demo.onmousemove =
                        i == 0
                            ? (e) => {
                                dragBase(e, r);
                                update();
                            }
                            : (e) => {
                                dragVtx(e, i, r);
                                update();
                            };
                }
            }
        }
    };

    demo.onmouseup = () => {
        demo.onmousemove = null;
    };
    update();
})();


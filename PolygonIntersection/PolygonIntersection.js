/**
 *  @file
 *
 *  <p>Interseção entre cí­rculos e polí­gonos convexos.</p>
 *
 *  @author Carlos Bravo
 *  @since 29/09/2022
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

function isosceles(tri) {
    let basePoint = tri[0];
    let oppositeVertex = tri[1];
    const u = vec2d.sub([], basePoint, oppositeVertex);
    const v = [-u[1], u[0]];
    const w = [u[1], -u[0]];
    return [
        oppositeVertex,
        vec2d.add([], basePoint, v),
        vec2d.add([], basePoint, w),
    ];
}

function radius(points) {
    let radius = Math.abs(vec2.distance(points[0], points[1]));
    return radius;
}

function distToSegment(p, a, b) {
    const v = vec2d.sub([], b, a);
    const vlen = vec2d.dist(a, b);
    const vnorm = vec2d.scale([], v, 1 / vlen);
    const ap = vec2d.sub([], p, a);
    const t = vec2d.dot(vnorm, ap);
    if (t < 0) return vec2d.dist(p, a);
    if (t > vlen) return vec2d.dist(p, b);
    return vec2d.len(vec2d.sub([], ap, vec2d.scale([], vnorm, t)));
}

function pointInConvexPoly(p, poly) {
    let prevPoint = poly[poly.length - 1];
    let prevOrient = 0;
    for (let q of poly) {
        const o = vec2d.orient(prevPoint, q, p);
        if (Math.abs(o - prevOrient) > 1) return false;
        prevOrient = o;
        prevPoint = q;
    }
    return true;
}

function circleCircleIntersection(c1, c2) {
    let center1 = c1[0];
    let radius1 = vec2d.dist(c1[0], c1[1]);
    let center2 = c2[0];
    let radius2 = vec2d.dist(c2[0], c2[1]);
    let d = vec2d.dist(center1, center2);
    if (d > radius1 + radius2) {
        return false;
    }
    return true;
}

function circleRectIntersection(c, r) {
    let circleCenter = c[0];
    let radius = vec2d.dist(c[0], c[1]);
    let rectanglePoints = rectangle(r);

    if (pointInConvexPoly(circleCenter, rectanglePoints)) return true;
    for (let i = 0; i < 4; i++) {
        if (distToSegment(circleCenter, rectanglePoints[i], rectanglePoints[(i + 1) % 4]) <= radius) return true;
    }

    return false;
}

function circleTriangleIntersection(c, t) {
    let circleCenter = c[0];
    let radius = vec2d.dist(c[0], c[1]);
    let trianglePoints = isosceles(t);

    if (pointInConvexPoly(circleCenter, trianglePoints)) return true;
    for (let i = 0; i < 3; i++) {
        if (distToSegment(circleCenter, trianglePoints[i], trianglePoints[(i + 1) % 3]) <= radius) return true;
    }

    return false;
}

function rectRectintersection(rect, rectTwo) {
    rect = rectangle(rect);
    rectTwo = rectangle(rectTwo);

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

function rectTriangleIntersection(rect, triangle) {
    rect = rectangle(rect);
    triangle = isosceles(triangle);

    let V = SAT.Vector;
    let P = SAT.Polygon;

    let polygon1 = new P(new V(), [
        new V(rect[0][0], rect[0][1]), new V(rect[1][0], rect[1][1]), new V(rect[2][0], rect[2][1]), new V(rect[3][0], rect[3][1])
    ]);

    let polygon2 = new P(new V(), [
        new V(triangle[0][0], triangle[0][1]), new V(triangle[1][0], triangle[1][1]), new V(triangle[2][0], triangle[2][1])
    ]);

    let response;
    let collided = SAT.testPolygonPolygon(polygon1, polygon2, response);

    return collided;
}

function rectCircleIntersection(rect, circle) {
    return circleRectIntersection(circle, rect);
}

function triangleRectIntersection(triangle, rect) {
    return rectTriangleIntersection(rect, triangle);
}

function triangleTriangleIntersection(triangle, triangleTwo) {
    triangle = isosceles(triangle);
    triangleTwo = isosceles(triangleTwo);

    let V = SAT.Vector;
    let P = SAT.Polygon;

    let polygon1 = new P(new V(), [
        new V(triangle[0][0], triangle[0][1]), new V(triangle[1][0], triangle[1][1]), new V(triangle[2][0], triangle[2][1])
    ]);

    let polygon2 = new P(new V(), [
        new V(triangleTwo[0][0], triangleTwo[0][1]), new V(triangleTwo[1][0], triangleTwo[1][1]), new V(triangleTwo[2][0], triangleTwo[2][1])
    ]);

    let response;
    let collided = SAT.testPolygonPolygon(polygon1, polygon2, response);

    return collided;
}

function triangleCircleIntersection(triangle, circle) {
    return circleTriangleIntersection(circle, triangle);
}

(function PolygonsDemo() {
    const demo = document.querySelector("#theCanvas");
    const ctx = demo.getContext("2d");
    let [w, h] = [demo.clientWidth, demo.clientHeight];
    const rect = [
        [
            [100, 100],
            [100, 100 + 50],
            [100 + 50, 100],
            [100, 100 - 50],
            [100 - 50, 100]
        ],
        [
            [100, 250],
            [100, 250 + 50],
            [100 + 50, 250],
            [100, 250 - 50],
            [100 - 50, 250]
        ],
        [
            [100, 400],
            [100, 400 + 50],
            [100 + 50, 400],
            [100, 400 - 50],
            [100 - 50, 400]
        ],
    ];

    const circle = [
        [
            [250, 100],
            [250, 100 + 50],
        ],
        [
            [250, 250],
            [250, 250 + 50],
        ],
        [
            [250, 400],
            [250, 400 + 50],
        ],
    ];

    const triangle = [
        [
            [400, 100],
            [400, 100 + 50],
        ],
        [
            [400, 250],
            [400, 250 + 50],
        ],
        [
            [400, 400],
            [400, 400 + 50],
        ],
    ];

    const update = () => {
        ctx.clearRect(0, 0, w, h);
        fillCanvas(ctx, w, h);


        for (let r of rect) {
            ctx.fillStyle = ctx.strokeStyle = "black";
            for (let r2 of rect) {
                if (r == r2) continue;
                if (rectRectintersection(r, r2)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let c of circle) {
                if (rectCircleIntersection(r, c)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let t of triangle) {
                if (rectTriangleIntersection(r, t)) {
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

        for (let c of circle) {
            ctx.fillStyle = ctx.strokeStyle = "black";

            for (let c2 of circle) {
                if (c == c2) continue;
                if (circleCircleIntersection(c, c2)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let r of rect) {
                if (circleRectIntersection(c, r)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let t of triangle) {
                if (circleTriangleIntersection(c, t)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let p of c) {
                ctx.beginPath();
                ctx.arc(...p, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(c[0][0], c[0][1], radius(c), 0, Math.PI * 2);

            ctx.stroke();
        }

        for (let t of triangle) {
            ctx.fillStyle = ctx.strokeStyle = "black";

            for (let t2 of triangle) {
                if (t == t2) continue;
                if (triangleTriangleIntersection(t, t2)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let r of rect) {
                if (triangleRectIntersection(t, r)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }

            for (let c of circle) {
                if (triangleCircleIntersection(t, c)) {
                    ctx.fillStyle = ctx.strokeStyle = "red";
                }
            }


            for (let p of t) {
                ctx.beginPath();
                ctx.arc(...p, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            for (let p of isosceles(t)) {
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

    const dragCircleCenter = (e, circle) => {
        let mouse = [e.offsetX, e.offsetY];
        let delta = vec2.sub([], mouse, prevMouse);
        prevMouse = mouse;
        vec2.add(circle[0], circle[0], delta);
        vec2.add(circle[1], circle[1], delta);


    };

    const dragCircleEdge = (e, circle) => {
        let mouse = [e.offsetX, e.offsetY];
        let delta = vec2.sub([], mouse, prevMouse);
        prevMouse = mouse;
        vec2.add(circle[1], circle[1], delta);
    }


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

    const dragTriangleCenter = (e, tri) => {
        let mouse = [e.offsetX, e.offsetY];
        let delta = vec2d.sub([], mouse, prevMouse);
        prevMouse = mouse;
        let v = vec2d.sub([], tri[1], tri[0]);
        vec2d.add(tri[0], tri[0], delta);
        vec2d.add(tri[1], tri[0], v);
    };

    const dragTriangleEdge = (e, tri) => {
        let mouse = [e.offsetX, e.offsetY];
        let delta = vec2d.sub([], mouse, prevMouse);
        prevMouse = mouse;
        vec2d.add(tri[1], tri[1], delta);
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

        for (let c of circle) {
            for (let i of [0, 1]) {
                let p = c[i];
                let d = vec2.distance(mouse, p);
                if (d <= 5) {
                    demo.onmousemove =
                        i == 0
                            ? (e) => {
                                dragCircleCenter(e, c);
                                update();
                            }
                            : (e) => {
                                dragCircleEdge(e, c);
                                update();
                            };
                }
            }
        }

        for (let t of triangle) {
            for (let i of [0, 1]) {
                let p = t[i];
                let d = vec2.distance(mouse, p);
                if (d <= 5) {
                    demo.onmousemove =
                        i == 0
                            ? (e) => {
                                dragTriangleCenter(e, t);
                                update();
                            }
                            : (e) => {
                                dragTriangleEdge(e, t);
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


/**
 * @file
 *
 * Summary.
 * <p>Hierarchical Robot object using a matrix stack.</p>
 *
 * @author Paulo Roma
 * @since 27/09/2016
 * @see https://orion.lcg.ufrj.br/WebGL/labs/WebGL/Assignment_3/Hierarchy.html
 * @see <a href="/WebGL/labs/WebGL/Assignment_3/Hierarchy.js">source</a>
 * @see <a href="/WebGL/labs/WebGL/teal_book/cuon-matrix.js">cuon-matrix</a>
 * @see https://www.cs.ucy.ac.cy/courses/EPL426/courses/eBooks/ComputerGraphicsPrinciplesPractice.pdf#page=188
 * @see https://www.cs.drexel.edu/~david/Classes/ICG/Lectures_new/L-14_HierchModels.pdf
 * @see https://www.lcg.ufrj.br/WebGL/labs/WebGL/Assignment_3/5.hierarchy.pdf
 * @see <img src="../robot.png" width="512">
 */

"use strict";

// import * as THREE from 'three';
// import { OrbitControls } from '../utils/three.js-master/examples/jsm/controls/OrbitControls.js';

/**
 * A very basic stack class,
 * for keeping a hierarchy of transformations.
 * @class
 */
class Stack {
    /**
     * Constructor.
     * @constructs Stack
     */
    constructor() {
        /** Array for holding the stack elements. */
        this.elements = [];
        /** Top of the stack. */
        this.t = 0;
    }

    /**
     * Pushes a given matrix onto this stack.
     * @param {Matrix4} m transformation matrix.
     */
    push(m) {
        this.elements[this.t++] = m;
    }

    /**
     * Return the matrix at the top of this stack.
     * @return {Matrix4} m transformation matrix.
     */
    top() {
        if (this.t <= 0) {
            console.log("top = ", this.t);
            console.log("Warning: stack underflow");
        } else {
            return this.elements[this.t - 1];
        }
    }

    /**
     * Pops the matrix at the top of this stack.
     * @return {Matrix4} m transformation matrix.
     */
    pop() {
        if (this.t <= 0) {
            console.log("Warning: stack underflow");
        } else {
            this.t--;
            var temp = this.elements[this.t];
            this.elements[this.t] = undefined;
            return temp;
        }
    }

    /**
     * Returns whether this stack is empty.
     * @returns {Boolean} true if the stack is empty.
     */
    isEmpty() {
        return this.t <= 0;
    }
}

/**
 * <p>Creates data for vertices, colors, and normal vectors for
 * a unit cube. </p>
 *
 * Return value is an object with three attributes:
 * vertices, colors, and normals, each referring to a Float32Array.<br>
 * (Note this is a "self-invoking" anonymous function.)
 * @return {Object<{numVertices: Number, vertices: Float32Array, colors: Float32Array, normals: Float32Array}>}
 * vertex array with associated color and normal arrays.
 * @function
 * @global
 */
var cube = (function makeCube() {
    // vertices of cube
    // prettier-ignore
    var rawVertices = new Float32Array([
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        -0.5, 0.5, 0.5,
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5
    ]);

    // prettier-ignore
    var rawColors = new Float32Array([
        1.0, 0.0, 0.0, 1.0,  // red
        0.0, 1.0, 0.0, 1.0,  // green
        0.0, 0.0, 1.0, 1.0,  // blue
        1.0, 1.0, 0.0, 1.0,  // yellow
        1.0, 0.0, 1.0, 1.0,  // magenta
        0.0, 1.0, 1.0, 1.0,  // cyan
    ]);

    // prettier-ignore
    var rawNormals = new Float32Array([
        0, 0, 1,
        1, 0, 0,
        0, 0, -1,
        -1, 0, 0,
        0, 1, 0,
        0, -1, 0
    ]);

    // prettier-ignore
    var indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,  // z face
        1, 5, 6, 1, 6, 2,  // +x face
        5, 4, 7, 5, 7, 6,  // -z face
        4, 0, 3, 4, 3, 7,  // -x face
        3, 2, 6, 3, 6, 7,  // + y face
        4, 5, 1, 4, 1, 0   // -y face
    ]);

    var verticesArray = [];
    var colorsArray = [];
    var normalsArray = [];
    for (var i = 0; i < 36; ++i) {
        // for each of the 36 vertices...
        var face = Math.floor(i / 6);
        var index = indices[i];

        // (x, y, z): three numbers for each point
        for (var j = 0; j < 3; ++j) {
            verticesArray.push(rawVertices[3 * index + j]);
        }

        // (r, g, b, a): four numbers for each point
        for (var j = 0; j < 4; ++j) {
            colorsArray.push(rawColors[4 * face + j]);
        }

        // three numbers for each point
        for (var j = 0; j < 3; ++j) {
            normalsArray.push(rawNormals[3 * face + j]);
        }
    }

    return {
        numVertices: 36,
        vertices: new Float32Array(verticesArray),
        colors: new Float32Array(colorsArray),
        normals: new Float32Array(normalsArray),
    };
})();

/**
 * Return a matrix to transform normals, so they stay
 * perpendicular to surfaces after a linear transformation.
 * @param {Matrix4} model model matrix.
 * @param {Matrix4} view view matrix.
 * @returns {Float32Array} modelview transposed inverse.
 */
function makeNormalMatrixElements(model, view) {
    var n = new Matrix4(view).multiply(model);
    n.transpose();
    n.invert();
    n = n.elements;
    // prettier-ignore
    return new Float32Array([
        n[0], n[1], n[2],
        n[4], n[5], n[6],
        n[8], n[9], n[10]
    ]);
}

// A few global variables...

/**
 * The OpenGL context.
 * @type {WebGL2RenderingContext}
 */
var gl;
let a_coords_loc;          // Location of the a_coords attribute variable in the shader program.
let a_coords_buffer;       // Buffer to hold the values for a_coords.
let u_color;               // Location of the uniform specifying a color for the primitive.
let u_modelviewProjection; // Location of the uniform matrix representing the combined transformation.

const modelviewProjection = mat4.create();  // combined matrix
let rotator;

/**
 * Handle to a buffer on the GPU.
 * @type {WebGLBuffer}
 */
var vertexBuffer;

/**
 * Handle to a buffer on the GPU.
 * @type {WebGLBuffer}
 */
var vertexNormalBuffer;

/**
 * Handle to the compiled shader program on the GPU.
 * @type {WebGLProgram}
 */
var lightingShader;

/**
 * Transformation matrix that is the root of 5 objects in the scene.
 * @type {Matrix4}
 */

var torsoMatrix = new Matrix4().setTranslate(0, 0, 0);
var shoulderLeftMatrix = new Matrix4().setTranslate(6.5, 2, 0);
var shoulderRightMatrix = new Matrix4().setTranslate(-6.5, 2, 0);
var armLeftMatrix = new Matrix4().setTranslate(0, -5, 0);
var armRightMatrix = new Matrix4().setTranslate(0, -5, 0);
var handLeftMatrix = new Matrix4().setTranslate(0, -4, 0);
var handRightMatrix = new Matrix4().setTranslate(0, -4, 0);
var headMatrix = new Matrix4().setTranslate(0, 7, 0);
var legLeftTopMatrix = new Matrix4().setTranslate(2, -7, 0);
var legRightTopMatrix = new Matrix4().setTranslate(-2, -7, 0);
var legLeftBottomMatrix = new Matrix4().setTranslate(0, -5, 0);
var legRightBottomMatrix = new Matrix4().setTranslate(0, -5, 0);
var footLeftMatrix = new Matrix4().setTranslate(0, -3.5, 1);
var footRightMatrix = new Matrix4().setTranslate(0, -3.5, 1);

var torsoAngle = 0.0;
var shoulderLeftAngle = 0.0;
var shoulderRightAngle = 0.0;
var armLeftAngle = 0.0;
var armRightAngle = 0.0;
var handLeftAngle = 0.0;
var handRightAngle = 0.0;
var headAngle = 0.0;
var legLeftTopAngle = 0.0;
var legRightTopAngle = 0.0;
var legLeftBottomAngle = 0.0;
var legRightBottomAngle = 0.0;
var footLeftAngle = 0.0;
var footRightAngle = 0.0;

var torsoMatrixLocal = new Matrix4().setScale(10, 10, 5);
var shoulderLeftMatrixLocal = new Matrix4().setScale(3, 5, 2);
var shoulderRightMatrixLocal = new Matrix4().setScale(3, 5, 2);
var armLeftMatrixLocal = new Matrix4().setScale(3, 5, 2);
var armRightMatrixLocal = new Matrix4().setScale(3, 5, 2);
var handLeftMatrixLocal = new Matrix4().setScale(1, 3, 3);
var handRightMatrixLocal = new Matrix4().setScale(1, 3, 3);
var headMatrixLocal = new Matrix4().setScale(4, 4, 4);
var legLeftTopMatrixLocal = new Matrix4().setScale(2, 5, 2);
var legRightTopMatrixLocal = new Matrix4().setScale(2, 5, 2);
var legLeftBottomMatrixLocal = new Matrix4().setScale(2, 5, 2);
var legRightBottomMatrixLocal = new Matrix4().setScale(2, 5, 2);
var footLeftMatrixLocal = new Matrix4().setScale(3, 2, 4);
var footRightMatrixLocal = new Matrix4().setScale(3, 2, 4);

/**
 * View matrix.
 * @type {Matrix4}
 */
// prettier-ignore
var view = new Matrix4().setLookAt(
    20, 20, 20,   // eye
    0, 0, 0,      // at - looking at the origin
    0, 1, 0); // up vector - y axis

/**
 * <p>Projection matrix.</p>
 * Here use aspect ratio 3/2 corresponding to canvas size 600 x 400.
 * @type {Matrix4}
 */
var projection = new Matrix4().setPerspective(45, 1.5, 0.1, 1000);

/**
 * Translate keypress events to strings.
 * @param {KeyboardEvent} event key pressed.
 * @return {String | null}
 * @see http://javascript.info/tutorial/keyboard-events
 */
function getChar(event) {
    if (event.which == null) {
        return String.fromCharCode(event.keyCode); // IE
    } else if (event.which != 0 && event.charCode != 0) {
        return String.fromCharCode(event.which); // the rest
    } else {
        return null; // special key
    }
}

/**
 * <p>Handler for key press events.</p>
 * Adjusts object rotations.
 * @param {KeyboardEvent} event key pressed.
 */
function handleKeyPress(event) {
    var ch = getChar(event);
    let opt = document.getElementById("options");
    switch (ch) {
        case "d":
            torsoAngle += 15;
            torsoMatrix.setTranslate(0, 0, 0).rotate(torsoAngle, 0, 1, 0);
            break;
        case "D":
            torsoAngle -= 15;
            torsoMatrix.setTranslate(0, 0, 0).rotate(torsoAngle, 0, 1, 0);
            break;
        case "z":
            shoulderLeftAngle += 15;
            // rotate shoulder clockwise about a point 2 units above its center
            var currentShoulderRot = new Matrix4()
                .setTranslate(0, 2, 0)
                .rotate(-shoulderLeftAngle, 1, 0, 0)
                .translate(0, -2, 0);
            shoulderLeftMatrix.setTranslate(6.5, 2, 0).multiply(currentShoulderRot);
            break;
        case "Z":
            shoulderLeftAngle -= 15;
            var currentShoulderRot = new Matrix4()
                .setTranslate(0, 2, 0)
                .rotate(-shoulderLeftAngle, 1, 0, 0)
                .translate(0, -2, 0);
            shoulderLeftMatrix.setTranslate(6.5, 2, 0).multiply(currentShoulderRot);
            break;
        case "q":
            shoulderRightAngle += 15;
            var currentShoulderRot = new Matrix4()
                .setTranslate(0, 2, 0)
                .rotate(-shoulderRightAngle, 1, 0, 0)
                .translate(0, -2, 0);
            shoulderRightMatrix.setTranslate(-6.5, 2, 0).multiply(currentShoulderRot);
            break;
        case "Q":
            shoulderRightAngle -= 15;
            var currentShoulderRot = new Matrix4()
                .setTranslate(0, 2, 0)
                .rotate(-shoulderRightAngle, 1, 0, 0)
                .translate(0, -2, 0);
            shoulderRightMatrix.setTranslate(-6.5, 2, 0).multiply(currentShoulderRot);
            break;
        case "x":
            armLeftAngle += 15;
            // rotate armLeft clockwise about its top front corner
            var currentarmLeft = new Matrix4()
                .setTranslate(0, 2.5, 1.0)
                .rotate(-armLeftAngle, 1, 0, 0)
                .translate(0, -2.5, -1.0);
            armLeftMatrix.setTranslate(0, -5, 0).multiply(currentarmLeft);
            break;
        case "X":
            armLeftAngle -= 15;
            var currentarmLeft = new Matrix4()
                .setTranslate(0, 2.5, 1.0)
                .rotate(-armLeftAngle, 1, 0, 0)
                .translate(0, -2.5, -1.0);
            armLeftMatrix.setTranslate(0, -5, 0).multiply(currentarmLeft);
            break;
        case "w":
            armRightAngle += 15;
            // rotate armRight clockwise about its top front corner
            var currentarmRight = new Matrix4()
                .setTranslate(0, 2.5, 1.0)
                .rotate(-armRightAngle, 1, 0, 0)
                .translate(0, -2.5, -1.0);
            armRightMatrix.setTranslate(0, -5, 0).multiply(currentarmRight);
            break;
        case "W":
            armRightAngle -= 15;
            var currentarmRight = new Matrix4()
                .setTranslate(0, 2.5, 1.0)
                .rotate(-armRightAngle, 1, 0, 0)
                .translate(0, -2.5, -1.0);
            armRightMatrix.setTranslate(0, -5, 0).multiply(currentarmRight);
            break;
        case "c":
            handLeftAngle += 15;
            handLeftMatrix.setTranslate(0, -4, 0).rotate(handLeftAngle, 0, 1, 0);
            break;
        case "C":
            handLeftAngle -= 15;
            handLeftMatrix.setTranslate(0, -4, 0).rotate(handLeftAngle, 0, 1, 0);
            break;
        case "e":
            handRightAngle += 15;
            handRightMatrix.setTranslate(0, -4, 0).rotate(handRightAngle, 0, 1, 0);
            break;
        case "E":
            handRightAngle -= 15;
            handRightMatrix.setTranslate(0, -4, 0).rotate(handRightAngle, 0, 1, 0);
            break;
        case "s":
            headAngle += 15;
            headMatrix.setTranslate(0, 7, 0).rotate(headAngle, 0, 1, 0);
            break;
        case "S":
            headAngle -= 15;
            headMatrix.setTranslate(0, 7, 0).rotate(headAngle, 0, 1, 0);
            break;
        case "v":
            legLeftTopAngle += 15;
            // rotate legLeft clockwise about its top front corner
            var currentlegLeft = new Matrix4()
                .setTranslate(1, 2.5, 0)
                .rotate(-legLeftTopAngle, 1, 0, 0)
                .translate(-1, -2.5, 0);
            legLeftTopMatrix.setTranslate(2, -7, 0).multiply(currentlegLeft);
            break;
        case "V":
            legLeftTopAngle -= 15;
            var currentlegLeft = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legLeftTopAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legLeftTopMatrix.setTranslate(2, -7, 0).multiply(currentlegLeft);
            break;
        case "r":
            legRightTopAngle += 15;
            // rotate legRight clockwise about its top front corner
            var currentlegRight = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legRightTopAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legRightTopMatrix.setTranslate(-2, -7, 0).multiply(currentlegRight);
            break;
        case "R":
            legRightTopAngle -= 15;
            var currentlegRight = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legRightTopAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legRightTopMatrix.setTranslate(-2, -7, 0).multiply(currentlegRight);
            break;
        case "b":
            legLeftBottomAngle += 15;
            // rotate legLeft clockwise about its top front corner
            var currentlegLeft = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legLeftBottomAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legLeftBottomMatrix.setTranslate(0, -5, 0).multiply(currentlegLeft);
            break;
        case "B":
            legLeftBottomAngle -= 15;
            var currentlegLeft = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legLeftBottomAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legLeftBottomMatrix.setTranslate(0, -5, 0).multiply(currentlegLeft);
            break;
        case "t":
            legRightBottomAngle += 15;
            // rotate legRight clockwise about its top front corner
            var currentlegRight = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legRightBottomAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legRightBottomMatrix.setTranslate(0, -5, 0).multiply(currentlegRight);
            break;
        case "T":
            legRightBottomAngle -= 15;
            var currentlegRight = new Matrix4()
                .setTranslate(0, 2.5, 0)
                .rotate(-legRightBottomAngle, 1, 0, 0)
                .translate(0, -2.5, 0);
            legRightBottomMatrix.setTranslate(0, -5, 0).multiply(currentlegRight);
            break;
        case "n":
            footLeftAngle += 15;
            footLeftMatrix.setTranslate(0, -3.5, 1).rotate(footLeftAngle, 0, 1, 0);
            break;
        case "N":
            footLeftAngle -= 15;
            footLeftMatrix.setTranslate(0, -3.5, 1).rotate(footLeftAngle, 0, 1, 0);
            break;
        case "y":
            footRightAngle += 15;
            footRightMatrix.setTranslate(0, -3.5, 1).rotate(footRightAngle, 0, 1, 0);
            break;
        case "Y":
            footRightAngle -= 15;
            footRightMatrix.setTranslate(0, -3.5, 1).rotate(footRightAngle, 0, 1, 0);
            break;
        default:
            return;
    }
    opt.innerHTML = `<br>${gl.getParameter(
        gl.SHADING_LANGUAGE_VERSION
    )}<br>${gl.getParameter(gl.VERSION)}`;
}

/**
 * <p>Helper function.</p>
 * Renders the cube based on the model transformation
 * on top of the stack and the given local transformation.
 * @param {Matrix4} matrixStack matrix on top of the stack;
 * @param {Matrix4} matrixLocal local transformation.
 */
function renderCube(matrixStack, matrixLocal) {
    // bind the shader
    gl.useProgram(lightingShader);

    // get the index for the a_Position attribute defined in the vertex shader
    var positionIndex = gl.getAttribLocation(lightingShader, "a_Position");
    if (positionIndex < 0) {
        console.log("Failed to get the storage location of a_Position");
        return;
    }

    var normalIndex = gl.getAttribLocation(lightingShader, "a_Normal");
    if (normalIndex < 0) {
        console.log("Failed to get the storage location of a_Normal");
        return;
    }

    // "enable" the a_position attribute
    gl.enableVertexAttribArray(positionIndex);
    gl.enableVertexAttribArray(normalIndex);

    // bind data for points and normals
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.vertexAttribPointer(normalIndex, 3, gl.FLOAT, false, 0, 0);

    var loc = gl.getUniformLocation(lightingShader, "view");
    gl.uniformMatrix4fv(loc, false, view.elements);
    loc = gl.getUniformLocation(lightingShader, "projection");
    gl.uniformMatrix4fv(loc, false, projection.elements);
    loc = gl.getUniformLocation(lightingShader, "u_Color");
    gl.uniform4f(loc, 0.0, 1.0, 0.0, 1.0);
    var loc = gl.getUniformLocation(lightingShader, "lightPosition");
    gl.uniform4f(loc, 5.0, 10.0, 5.0, 1.0);

    var modelMatrixloc = gl.getUniformLocation(lightingShader, "model");
    var normalMatrixLoc = gl.getUniformLocation(lightingShader, "normalMatrix");

    // transform using current model matrix on top of stack
    var current = new Matrix4(matrixStack.top()).multiply(matrixLocal);
    gl.uniformMatrix4fv(modelMatrixloc, false, current.elements);
    gl.uniformMatrix3fv(
        normalMatrixLoc,
        false,
        makeNormalMatrixElements(current, view)
    );

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // on safari 10, buffer cannot be disposed before drawing...
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
}

/** Code to actually render our geometry. */
function draw() {
    // clear the framebuffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BIT);

    /* Set the value of projection to represent the projection transformation */

    mat4.perspective(projection, Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.
       There is no modeling transformation in this program. */

    let modelview = rotator.getViewMatrix();

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */

    mat4.multiply(modelviewProjection, projection, modelview);
    gl.uniformMatrix4fv(u_modelviewProjection, false, modelviewProjection);

    // set up the matrix stack
    var s = new Stack();
    s.push(torsoMatrix);
    renderCube(s, torsoMatrixLocal);

    // head relative to torso
    s.push(new Matrix4(s.top()).multiply(headMatrix));
    renderCube(s, headMatrixLocal);
    s.pop();

    // shoulder relative to torso
    s.push(new Matrix4(s.top()).multiply(shoulderLeftMatrix));
    renderCube(s, shoulderLeftMatrixLocal);

    // armLeft relative to shoulder
    s.push(new Matrix4(s.top()).multiply(armLeftMatrix));
    renderCube(s, armLeftMatrixLocal);

    // hand relative to armLeft
    s.push(new Matrix4(s.top()).multiply(handLeftMatrix));
    renderCube(s, handLeftMatrixLocal);
    s.pop();
    s.pop();
    s.pop();

    // shoulder relative to torso
    s.push(new Matrix4(s.top()).multiply(shoulderRightMatrix));
    renderCube(s, shoulderRightMatrixLocal);

    // armRight relative to shoulder
    s.push(new Matrix4(s.top()).multiply(armRightMatrix));
    renderCube(s, armRightMatrixLocal);

    // hand relative to armRight
    s.push(new Matrix4(s.top()).multiply(handRightMatrix));
    renderCube(s, handRightMatrixLocal);
    s.pop();
    s.pop();
    s.pop();

    // leg left top relative to torso
    s.push(new Matrix4(s.top()).multiply(legLeftTopMatrix));
    renderCube(s, legLeftTopMatrixLocal);

    // leg left bottom relative to leg left top
    s.push(new Matrix4(s.top()).multiply(legLeftBottomMatrix));
    renderCube(s, legLeftBottomMatrixLocal);

    // foot left relative to leg left bottom
    s.push(new Matrix4(s.top()).multiply(footLeftMatrix));
    renderCube(s, footLeftMatrixLocal);
    s.pop();
    s.pop();
    s.pop();

    // leg right top relative to torso
    s.push(new Matrix4(s.top()).multiply(legRightTopMatrix));
    renderCube(s, legRightTopMatrixLocal);

    // leg right bottom relative to leg right top
    s.push(new Matrix4(s.top()).multiply(legRightBottomMatrix));
    renderCube(s, legRightBottomMatrixLocal);

    // foot right relative to leg right bottom
    s.push(new Matrix4(s.top()).multiply(footRightMatrix));
    renderCube(s, footRightMatrixLocal);
    s.pop();
    s.pop();
    s.pop();

    s.pop();

    if (!s.isEmpty()) {
        console.log("Warning: pops do not match pushes");
    }
}

/**
 * <p>Entry point when page is loaded.</p>
 *
 * Basically this function does setup that "should" only have to be done once,<br>
 * while draw() does things that have to be repeated each time the canvas is
 * redrawn.
 * @function
 * @memberof Window
 * @name anonymous_load
 * @global
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
 */
window.addEventListener("load", (event) => {
    // retrieve <canvas> element
    var canvas = document.getElementById("theCanvas");

    // key handler
    window.onkeypress = handleKeyPress;

    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.log("Failed to get the rendering context for WebGL");
        return;
    }

    // load and compile the shader pair, using utility from the teal book
    var vshaderSource = document.getElementById(
        "vertexLightingShader"
    ).textContent;
    var fshaderSource = document.getElementById(
        "fragmentLightingShader"
    ).textContent;
    if (!initShaders(gl, vshaderSource, fshaderSource)) {
        console.log("Failed to intialize shaders.");
        return;
    }
    lightingShader = gl.program;
    // gl.useProgram(null);

    // buffer for vertex positions for triangles
    vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log("Failed to create the buffer object");
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

    // buffer for vertex normals
    vertexNormalBuffer = gl.createBuffer();
    if (!vertexNormalBuffer) {
        console.log("Failed to create the buffer object");
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);

    // buffer is not needed anymore (not necessary, really)
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // specify a fill color for clearing the framebuffer
    gl.clearColor(0.9, 0.9, 0.9, 1.0);

    let prog = createProgram(gl, vshaderSource, fshaderSource);
    gl.useProgram(prog);
    a_coords_loc = gl.getAttribLocation(prog, "a_coords");
    u_modelviewProjection = gl.getUniformLocation(prog, "modelviewProjection");
    u_color = gl.getUniformLocation(prog, "color");
    a_coords_buffer = gl.createBuffer();

    gl.enable(gl.DEPTH_TEST);
    rotator = new SimpleRotator(canvas);
    rotator.setView([0, 0, 1], [0, 1, 0], 60);

    // define an animation loop
    var animate = function () {
        draw();
        requestAnimationFrame(animate);
        view.elements = rotator.getViewMatrix();
    };

    // start drawing!
    animate();
});

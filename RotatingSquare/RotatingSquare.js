/**
 * @file
 *
 * Summary.
 *
 * Rotate square around chosen vertex.
 *
 * @author Carlos Bravo
 * @since 11/09/2022
 */

 "use strict";
 
 /**
  * Canvas width.
  * @type {Number}
  */
 var w;
 
 /**
  * Canvas height.
  * @type {Number}
  */
 var h;

 /**
  * Degrees of rotation.
  * @type {Number}
  */
    var degrees = 2 * Math.PI / 180;

 /**
  * Possible inputs.
  * @type {Array<String>}
  */
 const possibleInputs = ['r', 'g', 'b', 'w'];

 /**
  * Vertex of rotation.
  * @type {String}
  */
    var axis = "red";
    
// if key is pressed, change axis of rotation by color name
document.addEventListener('keydown', function(event) {
    if (possibleInputs.includes(event.key)) {
        // If blue, change axis to blue
        if (event.key == 'b') {
            axis = "blue";
        }
        // If green, change axis to green
        if (event.key == 'g') {
            axis = "green";
        }
        // If red, change axis to red
        if (event.key == 'r') {
            axis = "red";
        }
        // If white, change axis to white
        if (event.key == 'w') {
            axis = "white";
        }
    }
});
 
 /**
  * Code to actually render our geometry.
  * @param {CanvasRenderingContext2D} ctx canvas context.
  * @param {Number} scale scale factor.
  * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
  */
 function draw(ctx) {
    // paint canvas light blue
    ctx.fillStyle = "lightblue";
    ctx.fillRect(0, 0, w, h);

    // draw square at center of canvas of color axis
    ctx.fillStyle = axis;
    ctx.fillRect(w / 2 - 50, h / 2 - 50, 100, 100);

    // add gray border to square
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 5;
    ctx.strokeRect(w / 2 - 50, h / 2 - 50, 100, 100);

    // draw red small circle at bottom left vertex
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(w / 2 - 50, h / 2 + 50, 5, 0, 2 * Math.PI);
    ctx.fill();

    // draw green small circle at top left vertex
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(w / 2 - 50, h / 2 - 50, 5, 0, 2 * Math.PI);
    ctx.fill();

    // draw blue small circle at top right vertex
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(w / 2 + 50, h / 2 - 50, 5, 0, 2 * Math.PI);
    ctx.fill();

    // draw white small circle at bottom right vertex
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(w / 2 + 50, h / 2 + 50, 5, 0, 2 * Math.PI);
    ctx.fill();

    // rotate square around bottom left vertex
    if (axis == "red") {
        ctx.translate(w / 2 - 50, h / 2 + 50);
        ctx.rotate(degrees);
        ctx.translate(-(w / 2 - 50), -(h / 2 + 50));
    }

    // rotate square around top left vertex
    if (axis == "green") {
        ctx.translate(w / 2 - 50, h / 2 - 50);
        ctx.rotate(degrees);
        ctx.translate(-(w / 2 - 50), -(h / 2 - 50));
    }

    // rotate square around top right vertex
    if (axis == "blue") {
        ctx.translate(w / 2 + 50, h / 2 - 50);
        ctx.rotate(degrees);
        ctx.translate(-(w / 2 + 50), -(h / 2 - 50));
    }

    // rotate square around bottom right vertex
    if (axis == "white") {
        ctx.translate(w / 2 + 50, h / 2 + 50);
        ctx.rotate(degrees);
        ctx.translate(-(w / 2 + 50), -(h / 2 + 50));
    }

 }
 
 /**
  * <p>Entry point when page is loaded.</p>
  *
  * Basically this function does setup that "should" only have to be done once,<br>
  * while draw() does things that have to be repeated each time the canvas is
  * redrawn.
  */
 function mainEntrance() {
     // retrieve <canvas> element
     var canvasElement = document.querySelector("#theCanvas");
     var ctx = canvasElement.getContext("2d");
 
     w = canvasElement.width;
     h = canvasElement.height;
 
     /**
      * A closure to set up an animation loop in which the
      * scale grows by "increment" each frame.
      * @global
      * @function
      */
     var runanimation = (() => { 
         return () => {
             draw(ctx);
             // request that the browser calls runanimation() again "as soon as it can"
             requestAnimationFrame(runanimation);
         };
     })();
 
     // draw!
     runanimation();
 }
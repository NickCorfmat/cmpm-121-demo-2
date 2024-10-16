import "./style.css";

const APP_NAME = "Doodle Pad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// Interfaces
interface Point {
  x: number;
  y: number;
}

// Global variables
let isDrawing = false;
let strokes: Array<Array<Point>> = [];
let currentStroke: Array<Point> = [];

const sketchpadTitle = document.createElement("h1");
sketchpadTitle.innerHTML = APP_NAME;

app.append(sketchpadTitle);

// Canvas setup
const sketchCanvas = document.createElement("canvas");
sketchCanvas.width = 256;
sketchCanvas.height = 256;

const context = sketchCanvas.getContext("2d");

if (context) {
  context.strokeStyle = "black";
  context.lineWidth = 2;
} else {
  throw new Error("Context not found.");
}

app.append(sketchCanvas);

// Enable drawing on canvas
// Source: MDN web docs, https://developer.mozilla.org/en-US/docs/Web/API/Element/mousemove_event
sketchCanvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  strokes.push([getMousePosition(sketchCanvas, e)]);
});

sketchCanvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    currentStroke = strokes[strokes.length - 1];
    currentStroke.push(getMousePosition(sketchCanvas, e));

    const event = new Event("drawing-changed");
    sketchCanvas.dispatchEvent(event);
  }
});

// Source: https://www.geeksforgeeks.org/how-to-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/
function getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

window.addEventListener("mouseup", (e) => {
  isDrawing = false;
});

sketchCanvas.addEventListener("drawing-changed", () => {
  context.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  redrawCanvas();
});

function drawLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.closePath();
}

function redrawCanvas(): void {
  if (context) {
    strokes.forEach((stroke) => {
      // Draw stroke
      stroke.forEach((point, i) => {
        const nextPoint = stroke[i + 1] || point;
        drawLine(context, point.x, point.y, nextPoint.x, nextPoint.y);
      });
    });
  }
}

// Clear canvas button
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";

clearButton.addEventListener("click", clearCanvas);
app.append(clearButton);

// Source: StackOverflow, https://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
function clearCanvas(): void {
  if (context) {
    context.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    strokes = [];
  }
}
import "./style.css";

const APP_NAME = "Doodle Pad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// Global variables
let isDrawing = false;
let strokeX = 0;
let strokeY = 0;

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
  strokeX = e.offsetX;
  strokeY = e.offsetY;
});

sketchCanvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    drawLine(context!, strokeX, strokeY, e.offsetX, e.offsetY);
    strokeX = e.offsetX;
    strokeY = e.offsetY;
  }
});

window.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    drawLine(context!, strokeX, strokeY, e.offsetX, e.offsetY);
    strokeX = 0;
    strokeY = 0;
    isDrawing = false;
  }
});

function drawLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  context.beginPath();
  context.strokeStyle = "black";
  context.lineWidth = 1;
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.closePath();
}

// Clear canvas button
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
clearButton.addEventListener("click", clearCanvas);
app.append(clearButton);

function clearCanvas(): void {
  if (context) {
    context.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  }
}

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
let currentLineWidth: number = 1;
let strokes: Array<Stroke> = [];
let redoStack: Array<Stroke> = [];

const sketchpadTitle = document.createElement("h1");
sketchpadTitle.innerHTML = APP_NAME;

app.append(sketchpadTitle);

// Canvas setup
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const context = canvas.getContext("2d");

if (context) {
  context.strokeStyle = "black";
  context.lineWidth = currentLineWidth;
} else {
  throw new Error("Context not found.");
}

app.append(canvas);

// Enable drawing on canvas
// Source: MDN web docs, https://developer.mozilla.org/en-US/docs/Web/API/Element/mousemove_event
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;

  const strokeStart = getMousePosition(canvas, e);
  const newStroke = new Stroke(strokeStart.x, strokeStart.y, currentLineWidth);

  strokes.push(newStroke);
  redoStack = [];
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    const currentStroke = strokes[strokes.length - 1];
    const newPos = getMousePosition(canvas, e);

    currentStroke.drag(newPos.x, newPos.y);
    dispatchDrawingEventChanged();
  }
});

window.addEventListener("mouseup", (e) => {
  isDrawing = false;
});

canvas.addEventListener("drawing-changed", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas();
});

function redrawCanvas(): void {
  if (context) {
    strokes.forEach((stroke) => {
      stroke.display(context);
    });
  }
}

function dispatchDrawingEventChanged(): void {
  const event = new Event("drawing-changed");
  canvas.dispatchEvent(event);
}

// Source: https://www.geeksforgeeks.org/how-to-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/
function getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

// Clear canvas button
const clearButton = createButton("clear", clearCanvas);

// Source: StackOverflow, https://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
function clearCanvas(): void {
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    redoStack = [];
  }
}

// Undo stroke button
const undoButton = createButton("undo", undoStroke);

function undoStroke(): void {
  if (strokes.length > 0) {
    redoStack.push(strokes.pop()!); // Source: Brace, "How can remove the last item from one array and add it to another in one line?"
    dispatchDrawingEventChanged();
  }
}

// Redo stroke button
const redoButton = createButton("redo", redoStroke);

function redoStroke(): void {
  if (redoStack.length > 0) {
    strokes.push(redoStack.pop()!);
    dispatchDrawingEventChanged();
  }
}

// Create a button with a click event listener
// Brace, 10/17/24, "How can I pass an argument to a function when I call it through a button's event listener?"
function createButton(
  text: string,
  clickHandler: (arg?: any) => void,
  arg?: any
) {
  const button = document.createElement("button");
  button.innerHTML = text;
  button.addEventListener("click", () => clickHandler(arg));

  app.append(button);

  return button;
}

// Stroke weight buttons
const thinButton = createButton("thin", setLineWidth, 1);
const thickButton = createButton("thick", setLineWidth, 3);

function setLineWidth(width: number): void {
  if (context) {
    context.lineWidth = width;
    currentLineWidth = width;
  }
}

class Stroke {
  private points: Array<Point> = [];
  private lineWidth: number = 1;

  constructor(startX: number, startY: number, width: number) {
    this.points.push({ x: startX, y: startY });
    this.lineWidth = width;
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.lineWidth;

    if (this.points.length <= 1) return;

    ctx.beginPath();
    const [{ x, y }, ...remainingPoints] = this.points;
    for (const { x, y } of remainingPoints) {
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

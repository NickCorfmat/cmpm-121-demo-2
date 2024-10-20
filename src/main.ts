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
let toolPreview: ToolPreview | null = null;
let currentSticker: string = "";

const sketchpadTitle = document.createElement("h1");
sketchpadTitle.innerHTML = APP_NAME;

app.append(sketchpadTitle);

// Canvas setup
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

canvas.style.cursor = "none";

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

  const { x: mouseX, y: mouseY } = getMousePosition(canvas, e);
  const newStroke = new Stroke(mouseX, mouseY, currentLineWidth);

  strokes.push(newStroke);
  redoStack = [];
});

canvas.addEventListener("mousemove", (e) => {
  const { x: mouseX, y: mouseY } = getMousePosition(canvas, e);

  if (!isDrawing) {
    toolPreview = new ToolPreview(mouseX, mouseY, currentLineWidth);
    dispatchToolMovedEvent();
  } else {
    const currentStroke = strokes[strokes.length - 1];

    if (currentStroke) {
      currentStroke.drag(mouseX, mouseY);
      dispatchDrawingEventChanged();
    }
  }
});

window.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("drawing-changed", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas();
});

canvas.addEventListener("tool-moved", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas();

  if (toolPreview) {
    toolPreview.draw(context);
  }
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

function dispatchToolMovedEvent(): void {
  const event = new Event("tool-moved");
  canvas.dispatchEvent(event);
}

// Source: https://www.geeksforgeeks.org/how-to-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/
function getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  return { x: mouseX, y: mouseY };
}

// Buttons

const buttons = [
  { text: "clear", handler: clearCanvas },
  { text: "undo", handler: undoStroke },
  { text: "redo", handler: redoStroke },
  { text: "thin", handler: setLineWidth, arg: 1 },
  { text: "thick", handler: setLineWidth, arg: 3 },
  { text: "😀", handler: setSticker, arg: "😀" },
  { text: "🎉", handler: setSticker, arg: "🎉" },
  { text: "🌟", handler: setSticker, arg: "🌟" },
];

buttons.forEach((button) => {
  createButton(button.text, button.handler, button.arg);
});

// Source: StackOverflow, https://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
function clearCanvas(): void {
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    redoStack = [];
  }
}

function undoStroke(): void {
  if (strokes.length > 0) {
    redoStack.push(strokes.pop()!); // Source: Brace, "How can remove the last item from one array and add it to another in one line?"
    dispatchDrawingEventChanged();
  }
}

function redoStroke(): void {
  if (redoStack.length > 0) {
    strokes.push(redoStack.pop()!);
    dispatchDrawingEventChanged();
  }
}

function setLineWidth(width: number): void {
  if (context) {
    context.lineWidth = width;
    currentLineWidth = width;
  }
}

function setSticker(sticker: string) {
  currentSticker = sticker;
  dispatchToolMovedEvent();
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

class Stroke {
  private points: Array<Point> = [];

  constructor(startX: number, startY: number, private lineWidth: number) {
    this.points.push({ x: startX, y: startY });
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.lineWidth;

    if (this.points.length < 2) return;

    ctx.beginPath();
    const [{ x, y }, ...remainingPoints] = this.points;
    for (const { x, y } of remainingPoints) {
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

class ToolPreview {
  constructor(private x: number, private y: number, private width: number) {}

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}

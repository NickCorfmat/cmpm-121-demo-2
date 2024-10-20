import "./style.css";

const APP_NAME = "Doodle Pad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

interface Point {
  x: number;
  y: number;
}

interface Displayable {
  drag(x: number, y: number);
  display(ctx: CanvasRenderingContext2D): void;
}

interface Button {
  text: string;
  handler: (arg?: any) => void;
  arg?: any;
}

// Global variables
let isDrawing = false;
let currentLineWidth: number = 1;
let currentToolPreview: string = ".";
let displayables: Array<Displayable> = [];
let redoStack: Array<Displayable> = [];
let toolPreview: ToolPreview | null = null;

// Create title
const title = document.createElement("h1");
title.innerHTML = APP_NAME;
app.append(title);

// Canvas setup
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";

const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas context not found.");

context.strokeStyle = "black";
context.lineWidth = currentLineWidth;
app.append(canvas);

// Source: MDN web docs, https://developer.mozilla.org/en-US/docs/Web/API/Element/mousemove_event
canvas.addEventListener("mousedown", (event) => {
  const mousePos = getMousePosition(canvas, event);
  let displayable: Displayable;

  if (currentToolPreview === ".") {
    displayable = new Stroke(mousePos.x, mousePos.y, currentLineWidth);
  } else {
    displayable = new Sticker(mousePos.x, mousePos.y, currentToolPreview);
  }

  displayables.push(displayable);
  redoStack = [];
  isDrawing = true;
});

canvas.addEventListener("mousemove", (event) => {
  const mousePos = getMousePosition(canvas, event);
  isDrawing ? drawDisplayable(mousePos) : updateToolPreview(mousePos);
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
  toolPreview?.draw(context);
});

function redrawCanvas(): void {
  if (context) {
    displayables.forEach((stroke) => {
      stroke.display(context);
    });
  }
}

function dispatchEvent(eventName: "drawing-changed" | "tool-moved"): void {
  const event = new Event(eventName);
  canvas.dispatchEvent(event);
}

// Source: https://www.geeksforgeeks.org/how-to-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/
function getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  return { x: mouseX, y: mouseY };
}

function updateToolPreview(mousePos: Point): void {
  toolPreview = new ToolPreview(
    mousePos.x,
    mousePos.y,
    currentLineWidth,
    currentToolPreview
  );
  dispatchEvent("tool-moved");
}

function drawDisplayable(mousePos: Point): void {
  const drawable = displayables.at(-1);

  if (drawable) {
    drawable.drag(mousePos.x, mousePos.y);
    dispatchEvent("drawing-changed");
  }
}

const strokeButtons = [
  { text: "clear", handler: clearCanvas },
  { text: "undo", handler: undoStroke },
  { text: "redo", handler: redoStroke },
  { text: "thin", handler: setLineWidth, arg: 1 },
  { text: "thick", handler: setLineWidth, arg: 3 },
  { text: "😀", handler: setSticker, arg: "😀" },
  { text: "🎉", handler: setSticker, arg: "🎉" },
  { text: "🌟", handler: setSticker, arg: "🌟" },
];

createButtons(strokeButtons);

// Source: StackOverflow, https://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
function clearCanvas(): void {
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    displayables = [];
    redoStack = [];
  }
}

function undoStroke(): void {
  if (displayables.length > 0) {
    redoStack.push(displayables.pop()!); // Source: Brace, "How can remove the last item from one array and add it to another in one line?"
    dispatchEvent("drawing-changed");
  }
}

function redoStroke(): void {
  if (redoStack.length > 0) {
    displayables.push(redoStack.pop()!);
    dispatchEvent("drawing-changed");
  }
}

function setLineWidth(width: number): void {
  if (context) {
    context.lineWidth = width;
    currentLineWidth = width;
    currentToolPreview = ".";
  }
}

function setSticker(sticker: string): void {
  currentToolPreview = sticker;
  currentLineWidth = 3;
  dispatchEvent("tool-moved");
}

// Brace, 10/17/24, "How can I pass an argument to a function when I call it through a button's event listener?"
function createButton(
  text: string,
  clickHandler: (arg?: any) => void,
  arg?: any
): void {
  const button = document.createElement("button");
  button.innerHTML = text;
  button.addEventListener("click", () => clickHandler(arg));
  app.append(button);
}

function createButtons(buttons: Button[]): void {
  buttons.forEach((button) => {
    createButton(button.text, button.handler, button.arg);
  });
}

class Stroke implements Displayable {
  private points: Array<Point> = [];

  constructor(x: number, y: number, private lineWidth: number) {
    this.points.push({ x, y });
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.lineWidth;
    if (this.points.length < 2) return;

    ctx.beginPath();
    const [{ x, y }, ...remainingPoints] = this.points;
    remainingPoints.forEach(({ x, y }) => ctx.lineTo(x, y));
    ctx.stroke();
  }
}

class Sticker implements Displayable {
  constructor(private x: number, private y: number, private sticker: string) {}

  drag(newX: number, newY: number): void {
    this.x = newX;
    this.y = newY;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.font = "32px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.sticker, this.x, this.y);
  }
}

class ToolPreview {
  constructor(
    private x: number,
    private y: number,
    private width: number,
    private icon: string
  ) {}

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.width * 12}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.icon, this.x, this.y);
  }
}

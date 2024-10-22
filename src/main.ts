import "./style.css";
import stickers from "./stickers.json";

const APP_NAME = "Doodle Pad";
const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 256;
const EXPORT_CANVAS_WIDTH = 1024;
const EXPORT_CANVAS_HEIGHT = 1024;
const STROKE_THIN = 1;
const STROKE_THICK = 3;
const STICKER_FONT_SIZE = 32;
const TOOL_ICON_SCALE_FACTOR = 12;

const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

// Interfaces
interface Point {
  x: number;
  y: number;
}

interface Displayable {
  drag(x: number, y: number): void;
  display(ctx: CanvasRenderingContext2D): void;
}

interface Button {
  text: string;
  handler: (arg?: any) => void;
  arg?: any;
}

// Global Variables
let isDrawing = false;
let currentLineWidth: number = STROKE_THIN;
let currentToolPreview: string = ".";
let displayables: Array<Displayable> = [];
let redoStack: Array<Displayable> = [];
let toolPreview: ToolPreview | null = null;
const availableStickers: string[] = stickers.INITIAL_STICKERS;

// Initialization
createAppTitle(APP_NAME);
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas context not found.");
}

initializeCanvas(canvas);
initializeContext(context);

function initializeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  app.append(canvas);
}

function initializeContext(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "black";
  ctx.lineWidth = currentLineWidth;
}

function createAppTitle(name: string): void {
  const title = document.createElement("h1");
  title.innerHTML = name;
  app.append(title);
}

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", onMouseUp);

function onMouseDown(event: MouseEvent): void {
  const mousePos = getMousePosition(canvas, event);
  drawNewDisplayableAt(mousePos);
  redoStack = [];
  isDrawing = true;
}

function onMouseMove(event: MouseEvent): void {
  const mousePos = getMousePosition(canvas, event);
  if (isDrawing) {
    continueDrawingDisplayable(mousePos);
  } else {
    updateToolPreview(mousePos);
  }
}

function onMouseUp(event: MouseEvent): void {
  isDrawing = false;
}

canvas.addEventListener("drawing-changed", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas(context);
});

canvas.addEventListener("tool-moved", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas(context);
  toolPreview?.draw(context);
});

function drawNewDisplayableAt(mousePos: Point): void {
  let displayable: Displayable;

  if (currentToolPreview === ".") {
    displayable = new Stroke(mousePos.x, mousePos.y, currentLineWidth);
  } else {
    displayable = new Sticker(mousePos.x, mousePos.y, currentToolPreview);
  }

  displayables.push(displayable);
}

function redrawCanvas(ctx: CanvasRenderingContext2D): void {
  if (ctx) {
    displayables.forEach((displayable) => {
      displayable.display(ctx);
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

function continueDrawingDisplayable(mousePos: Point): void {
  const drawable = displayables.at(-1);

  if (drawable) {
    drawable.drag(mousePos.x, mousePos.y);
    dispatchEvent("drawing-changed");
  }
}

const strokeButtons = [
  { text: "export", handler: exportCanvasToPNG },
  { text: "clear", handler: clearCanvas },
  { text: "undo", handler: undoStroke },
  { text: "redo", handler: redoStroke },
  { text: "thin", handler: setLineWidth, arg: STROKE_THIN },
  { text: "thick", handler: setLineWidth, arg: STROKE_THICK },
  { text: "custom sticker", handler: addCustomSticker },
];

createButtons(strokeButtons);
createStickerButtons(availableStickers);

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
  currentLineWidth = STROKE_THICK;
  dispatchEvent("tool-moved");
}

function addCustomSticker(): void {
  const customSticker = prompt("Insert custom sticker", "");

  if (customSticker) {
    availableStickers.push(customSticker);
    createButton(customSticker, setSticker, customSticker);
  }
}

// Source: StackOverflow, https://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
function exportCanvasToPNG(): void {
  const exportCanvas = createExportCanvas();
  const exportContext = getExportContext(exportCanvas);

  setupExportContext(exportContext);
  redrawCanvas(exportContext);
  downloadCanvas(exportCanvas);
}

function createExportCanvas(): HTMLCanvasElement {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = EXPORT_CANVAS_WIDTH;
  exportCanvas.height = EXPORT_CANVAS_HEIGHT;
  return exportCanvas;
}

function getExportContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Export context not found.");
  }
  return ctx;
}

function setupExportContext(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, EXPORT_CANVAS_WIDTH, EXPORT_CANVAS_HEIGHT);
  ctx.scale(4, 4);
}

function downloadCanvas(canvas: HTMLCanvasElement): void {
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
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
  buttons.forEach(({ text, handler, arg }) => {
    createButton(text, handler, arg);
  });
}

function createStickerButtons(stickers: string[]) {
  stickers.forEach((sticker) => {
    createButton(sticker, setSticker, sticker);
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
    if (this.points.length <= 1) return;

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
    ctx.font = `${STICKER_FONT_SIZE}px monospace`;
    ctx.fillStyle = "black";
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
    ctx.font = `${this.width * TOOL_ICON_SCALE_FACTOR}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.icon, this.x, this.y);
  }
}

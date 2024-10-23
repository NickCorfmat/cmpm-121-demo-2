import "./style.css";
import stickers from "./stickers.json";

const APP_NAME = "Doodle Pad";
const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 256;
const EXPORT_CANVAS_WIDTH = 1024;
const EXPORT_CANVAS_HEIGHT = 1024;
const STROKE_THIN = 2;
const STROKE_THICK = 4;
const STICKER_FONT_SIZE = 32;
const TOOL_ICON_SCALE_FACTOR = 8;

let isDrawing: boolean = false;
let currentLineWidth: number = STROKE_THIN;
let strokeColor: string = "#000000";
let stickerRotation: number = 0;
let currentToolPreview: string = ".";
let displayables: Array<Displayable> = [];
let redoStack: Array<Displayable> = [];
let toolPreview: ToolPreview | null = null;
const availableStickers: string[] = stickers.INITIAL_STICKERS;

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

// Initialization
createAppTitle(APP_NAME);

const canvas = document.createElement("canvas");
const context = retrieve2DContext(canvas);

initializeCanvas(canvas);
initializeContext(context);

const toolContainer = createDivContainer("tool-container");

// Source: Brace, "How can i create an HTML color picker in typescript?"
document.addEventListener("DOMContentLoaded", createColorPicker);

createSlider();

function createColorPicker(): void {
  const colorPickerContainer = document.createElement("div");
  const colorPicker = document.createElement("input");
  const colorPickerLabel = document.createElement("span");
  colorPickerLabel.classList.add("color-picker");
  colorPickerLabel.innerHTML = "Color Picker";

  colorPicker.type = "color";
  colorPicker.value = "#000000";

  colorPickerContainer.append(colorPicker, colorPickerLabel);
  app.append(colorPickerContainer);

  colorPicker.addEventListener("input", updateStrokeColor);
}

function updateStrokeColor(event: Event): void {
  const target = event.target as HTMLInputElement;
  strokeColor = target.value;
}

function createDivContainer(id: string): HTMLElement {
  const container = document.createElement("div");
  container.id = id;
  app.append(container);
  return container;
}

function createSlider(): void {
  const sliderContainer = document.createElement("div");
  const slider = document.createElement("input");
  const sliderLabel = document.createElement("span");
  sliderLabel.classList.add("slider");
  sliderLabel.innerHTML = `Hue/Rotation: ${slider.value}`;

  slider.type = "range";
  slider.min = "0";
  slider.max = "360";
  slider.value = "0";

  sliderContainer.append(slider, sliderLabel);
  app.append(sliderContainer);

  slider.addEventListener("input", (event) => {
    updateSliderValue(event);
    sliderLabel.innerHTML = `Hue/Rotation: ${slider.value}`;
  });
}

function updateSliderValue(event: Event): void {
  const target = event.target as HTMLInputElement;
  const sliderValue = parseInt(target.value);

  stickerRotation = sliderValue;
  strokeColor = `hsl(${sliderValue}, 100%, 50%)`;
  updateToolPreview({ x: canvas.width / 2, y: canvas.height / 2 });
}

function initializeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  app.append(canvas);
}

function initializeContext(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = strokeColor;
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
    displayable = new Stroke(
      mousePos.x,
      mousePos.y,
      currentLineWidth,
      strokeColor
    );
  } else {
    displayable = new Sticker(
      mousePos.x,
      mousePos.y,
      currentToolPreview,
      strokeColor,
      stickerRotation
    );
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
    currentToolPreview,
    stickerRotation
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
  { text: "Download", handler: exportCanvasToPNG },
  { text: "Clear", handler: clearCanvas },
  { text: "Undo", handler: undoStroke },
  { text: "Redo", handler: redoStroke },
  { text: "Thin Line", handler: setLineWidth, arg: STROKE_THIN },
  { text: "Thick Line", handler: setLineWidth, arg: STROKE_THICK },
  { text: "Add Sticker", handler: addCustomSticker },
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

function getRandomRotation(): number {
  return Math.random() * 360;
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
  const exportContext = retrieve2DContext(exportCanvas);

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

function retrieve2DContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not found.");
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
  toolContainer.append(button);
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

  constructor(
    x: number,
    y: number,
    private lineWidth: number,
    private strokeColor: string
  ) {
    this.points.push({ x, y });
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeColor;

    if (this.points.length <= 1) return;

    ctx.beginPath();
    const [{ x, y }, ...remainingPoints] = this.points;
    remainingPoints.forEach(({ x, y }) => ctx.lineTo(x, y));
    ctx.stroke();
  }
}

class Sticker implements Displayable {
  constructor(
    private x: number,
    private y: number,
    private sticker: string,
    private strokeColor: string,
    private rotation: number
  ) {}

  drag(newX: number, newY: number): void {
    this.x = newX;
    this.y = newY;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-this.x, -this.y);

    ctx.font = `${STICKER_FONT_SIZE}px monospace`;
    ctx.fillStyle = this.strokeColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(this.sticker, this.x, this.y);
    ctx.restore();
  }
}

class ToolPreview {
  constructor(
    private x: number,
    private y: number,
    private width: number,
    private icon: string,
    private rotation: number
  ) {}

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    ctx.font = `${this.width * TOOL_ICON_SCALE_FACTOR}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = strokeColor;

    ctx.fillText(this.icon, 0, 0);
    ctx.restore();
  }
}

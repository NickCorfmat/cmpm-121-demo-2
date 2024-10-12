import "./style.css";

const APP_NAME = "Fun Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const sketchpadTitle = document.createElement("h1");
sketchpadTitle.textContent = APP_NAME;

app.append(sketchpadTitle);

const sketchCanvas = document.createElement("canvas");
sketchCanvas.width = 256;
sketchCanvas.height = 256;

app.append(sketchCanvas);
// FTC OpMode Sim (web): p5.js sketch (instance mode) + OnBot Java-style editor + Java sim on CheerpJ.
import * as java from "./java.js";
import * as D from "./draw.js";
import { Editor, readOnlyView, setViewText } from "./editor.js";
import Blockly, { toolbox, generate, STARTER } from "./blocks.js";
import { RobotView } from "./robotView.js";
import { DriverStation } from "./driverStation.js";

const W = 1280, H = 720;
const SIM_X = 680, DS_Y = 360;

const stage = document.getElementById("stage");
let scale = 1;
let mode = "java"; // "java" | "blocks"
let ws = null, genView = null, wsStageScale = 1; // Blockly workspace + generated-Java view (Blocks mode)
const host = document.getElementById("blockly-host");
const WS_REGION = { x: 150, y: 66, w: 530, h: 314 }; // code area above the generated Java
let sketch = null;

/** Scale the 1280 x 720 layout to fit the window, keeping its aspect ratio. */
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = Math.max(0, (innerWidth - W * scale) / 2) + "px";
  stage.style.top = Math.max(0, (innerHeight - H * scale) / 2) + "px";
  if (sketch) sketch.pixelDensity(Math.min(4, (window.devicePixelRatio || 1) * scale));
  placeBlockly();
}
addEventListener("resize", fit);
fit();

// ---------------------------------------------------------------- build

let opName = null, opKind = null; // the OpMode on the Driver Station (null before a build)

const editor = new Editor(document.getElementById("editor"), {
  onBuild: build,
  onBlocksExample: loadBlocksExample,
  onJavaChanged: () => setMode("java"),
  label: () => {
    if (mode !== "blocks" || !ws) return null;
    return (generate(ws).className || "Blocks") + ".java";
  },
  downloadSource: () => {
    if (mode !== "blocks") return null;
    const g = generate(ws);
    return g.error ? null : { name: g.className + ".java", text: g.code };
  },
});

async function build() {
  if (!java.ready()) return;
  editor.save();
  let fileName = editor.name, source = editor.text, view = editor.view;
  if (mode === "blocks") {
    saveBlocks();
    const g = generate(ws);
    if (g.error) {
      editor.message("Build failed: 1 error", "err", g.error);
      return;
    }
    fileName = g.className + ".java";
    source = g.code;
    view = genView;
    setViewText(genView, source);
  }
  editor.setBuilding(true);
  editor.message("Building…", "", "");
  try {
    const r = await java.build(fileName, source);
    editor.showResult(r, view);
    if (r.ok) {
      opName = r.name;
      opKind = r.kind;
    }
  } catch (e) {
    editor.message("Build failed", "err", String(e));
  } finally {
    editor.setBuilding(false);
  }
}

// ---------------------------------------------------------------- sim view (p5.js)

let robot = null, ds = null;

new p5((p) => {
  sketch = p;
  p.setup = () => {
    p.createCanvas(600, 720).parent("sim");
    fit();
    robot = new RobotView(p);
    ds = new DriverStation(p);
    ds.load();
    const c = p.canvas;
    c.addEventListener("mousemove", (e) => {
      const [x, y] = panelXY(e);
      ds.hover = ds.overButton(java.snap, opName, x, y);
      c.style.cursor = ds.hover ? "pointer" : "default";
    });
    c.addEventListener("mouseleave", () => { ds.hover = false; });
    c.addEventListener("click", (e) => {
      const [x, y] = panelXY(e);
      if (!ds.overButton(java.snap, opName, x, y)) return;
      const a = ds.action(java.snap);
      if (a === "init") java.init();
      else if (a === "play") java.play();
      else java.stop();
    });
    c.addEventListener("wheel", (e) => {
      const [x, y] = panelXY(e);
      if (y < 0) return;
      e.preventDefault();
      ds.wheel(x, y, Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 40)));
    }, { passive: false });
  };

  p.draw = () => {
    java.poll();
    const snap = java.snap;
    p.push();
    robot.paint(snap);
    p.translate(0, DS_Y);
    ds.paint(snap, opName, opKind);
    p.pop();
  };
});

/** Mouse position in Driver Station coordinates (the stage is CSS-scaled). */
function panelXY(e) {
  const r = sketch.canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) * 600) / r.width;
  const y = ((e.clientY - r.top) * 720) / r.height;
  return [x, y - DS_Y];
}

// ---------------------------------------------------------------- Blocks mode

const MODE_KEY = "ftc-opmode-sim-web.mode";
const BLOCKS_KEY = "ftc-opmode-sim-web.blocks";
const BASE_ZOOM = 0.7;


const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage off */ } },
};

/** Keeps the Blockly workspace exactly over the code area of the scaled stage. */
function placeBlockly() {
  if (!host) return;
  const r = stage.getBoundingClientRect();
  host.style.left = r.left + WS_REGION.x * scale + "px";
  host.style.top = r.top + WS_REGION.y * scale + "px";
  host.style.width = WS_REGION.w * scale + "px";
  host.style.height = WS_REGION.h * scale + "px";
  host.style.setProperty("--stage-scale", scale); // toolbox text follows the stage scale (style.css)
  if (ws && mode === "blocks") {
    if (wsStageScale !== scale) {
      ws.setScale(ws.scale * (scale / wsStageScale));
      wsStageScale = scale;
      ws.updateToolbox(toolbox); // re-measure the toolbox at the new text size
    }
    Blockly.svgResize(ws);
  }
}

function createWorkspace() {
  placeBlockly();
  const theme = Blockly.Theme.defineTheme("ftc-opmode-sim", {
    base: Blockly.Themes.Classic,
    fontStyle: { family: "Inter, sans-serif", size: 11 },
    componentStyles: { workspaceBackgroundColour: "#FFFFFF", toolboxBackgroundColour: "#F3F3F3", flyoutBackgroundColour: "#ECECEC" },
  });
  ws = Blockly.inject(host, {
    toolbox, theme, media: "vendor/blockly-media/", sounds: false, trashcan: true,
    zoom: { controls: true, wheel: false, startScale: BASE_ZOOM * scale },
    move: { scrollbars: true, drag: true, wheel: true },
  });
  wsStageScale = scale;
  let saved = null;
  try { saved = JSON.parse(store.get(BLOCKS_KEY)); } catch (e) { saved = null; }
  try {
    Blockly.serialization.workspaces.load(saved || STARTER, ws);
  } catch (e) {
    Blockly.serialization.workspaces.load(STARTER, ws);
  }
  ws.clearUndo();
  let timer = null;
  ws.addChangeListener((e) => {
    if (e.isUiEvent) return;
    clearTimeout(timer);
    timer = setTimeout(() => { saveBlocks(); showGenerated(); }, 150);
  });
  genView = readOnlyView(document.querySelector(".blocks-pane .gen"));
}

function saveBlocks() {
  if (ws) store.set(BLOCKS_KEY, JSON.stringify(Blockly.serialization.workspaces.save(ws)));
}

/** Live generated Java under the blocks; also names the file in the tab and Project Files. */
function showGenerated() {
  if (!ws) return;
  const g = generate(ws);
  setViewText(genView, g.error ? "// " + g.error : g.code);
  editor.updateName();
}

function setMode(m) {
  if (m === mode && (m === "java" || ws)) return;
  mode = m;
  store.set(MODE_KEY, m);
  document.body.classList.toggle("mode-blocks", m === "blocks");
  for (const b of document.querySelectorAll(".tab-mode")) b.classList.toggle("active", b.dataset.mode === m);
  if (m === "blocks") {
    if (!ws) createWorkspace();
    placeBlockly();
    Blockly.svgResize(ws);
    showGenerated();
  } else {
    if (ws) Blockly.hideChaff();
    editor.updateName();
    editor.view.requestMeasure();
  }
}

async function loadBlocksExample(key, label) {
  setMode("blocks");
  const json = await (await fetch("opmodes/blocks/" + key + ".json")).json();
  Blockly.serialization.workspaces.load(json, ws);
  saveBlocks();
  showGenerated();
  editor.message("Loaded example: " + label, "", "Press Build Everything to compile the generated Java.");
}

function convertToJava() {
  const g = generate(ws);
  if (g.error) {
    editor.message("Can't convert yet", "err", g.error);
    return;
  }
  setMode("java");
  editor.setFile(g.code, true);
  editor.message("Converted to Java", "", "Your blocks are still saved in Blocks mode. Cmd+Z here brings back your previous Java.");
  editor.view.focus();
}

for (const b of document.querySelectorAll(".tab-mode")) b.addEventListener("click", () => setMode(b.dataset.mode));
document.querySelector(".convert").addEventListener("click", convertToJava);
// The toolbar undo icon undoes blocks in Blocks mode (capture: runs before the editor's handler).
document.querySelector(".files .undo").addEventListener("click", (e) => {
  if (mode !== "blocks") return;
  e.stopImmediatePropagation();
  ws.undo(false);
}, true);
// Cmd+S in Blocks mode saves the blocks instead of opening the browser's Save dialog.
addEventListener("keydown", (e) => {
  if (mode === "blocks" && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveBlocks();
  }
});

// ---------------------------------------------------------------- start

(async () => {
  editor.setBuilding(true, "Loading…");
  editor.message("Loading Java…", "", "The first visit can take a few seconds.");
  await Promise.all([
    document.fonts.load('400 12px "Roboto Mono"'),
    document.fonts.load("400 12px Inter"),
    document.fonts.load("600 12px Inter"),
    document.fonts.load("700 12px Inter"),
  ]).catch(() => {});
  D.resetMetrics();
  await editor.load("opmodes/FourMotorTest.java");
  setMode(store.get(MODE_KEY) === "blocks" ? "blocks" : "java");
  for (const b of document.querySelectorAll(".tab-mode")) b.classList.toggle("active", b.dataset.mode === mode);
  try {
    await java.start();
  } catch (e) {
    editor.setBuilding(false);
    editor.message("Could not start Java", "err", String(e && (e.message || e)));
    return;
  }
  editor.setBuilding(false);
  await build(); // auto-build once on load
})();

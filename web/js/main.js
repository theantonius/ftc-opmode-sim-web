// FTC OpMode Sim (web): p5.js sketch (instance mode) + OnBot Java-style editor + Java sim on CheerpJ.
import * as java from "./java.js?v=20261112e";
import * as D from "./draw.js?v=20261112e";
import { Editor } from "./editor.js?v=20261112e";
import { BlocksMode } from "./blocksMode.js?v=20261112e";
import { RobotView } from "./robotView.js?v=20261112e";
import { DriverStation } from "./driverStation.js?v=20261112e";

const W = 1280, H = 720;
const SIM_X = 680, DS_Y = 360;

const stage = document.getElementById("stage");
let scale = 1;
let sketch = null;
let blocks = null; // Blocks mode controller

/** Scale the 1280 x 720 layout to fit the window, keeping its aspect ratio. */
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = Math.max(0, (innerWidth - W * scale) / 2) + "px";
  stage.style.top = Math.max(0, (innerHeight - H * scale) / 2) + "px";
  if (sketch) sketch.pixelDensity(Math.min(4, (window.devicePixelRatio || 1) * scale));
  if (blocks) blocks.place(scale);
}
addEventListener("resize", fit);
fit();

// ---------------------------------------------------------------- build

let built = null; // {name, kind} from the last good build: it shows up in the Driver Station's OpMode list

const editor = new Editor(document.getElementById("editor"), {
  onBuild: build,
  onBlocksExample: (key, label) => blocks.loadExample(key, label),
  onJavaChanged: () => blocks.setMode("java"),
  label: () => blocks && blocks.label(),
  downloadSource: () => blocks && blocks.downloadSource(),
});
blocks = new BlocksMode(editor, stage);
window.__sim = { java, blocks, ds: () => ds }; // for automated checks in the browser console
blocks.place(scale);

async function build() {
  if (!java.ready()) return;
  editor.save();
  let fileName = editor.name, source = editor.text, view = editor.view;
  if (blocks.mode === "blocks") {
    const s = blocks.source();
    if (s.error) {
      editor.message("Build failed: 1 error", "err", s.error);
      return;
    }
    ({ fileName, source, view } = s);
  }
  editor.setBuilding(true);
  editor.message("Building…", "", "");
  try {
    const r = await java.build(fileName, source);
    editor.showResult(r, view);
    if (r.ok) {
      built = { name: r.name, kind: r.kind };
      if (ds) ds.onBuilt(built);
    }
    if (blocks.mode === "blocks") blocks.saved(r.ok);
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
      c.style.cursor = ds.mouseMove(java.snap, built, x, y) ? "pointer" : "default";
    });
    c.addEventListener("mouseleave", () => { ds.hover = false; ds.hoverTri = null; ds.menuHover = -1; });
    c.addEventListener("click", (e) => {
      const [x, y] = panelXY(e);
      const a = y >= 0 ? ds.click(java.snap, built, x, y) : (ds.menu = null);
      if (a === "init") java.init();
      else if (a === "play") java.play();
      else if (a === "stop") java.stop();
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
    ds.paint(snap, built);
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
  blocks.start();
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

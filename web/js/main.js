// FTC OpMode Sim (web): p5.js sketch (instance mode) + OnBot Java-style editor + Java sim on CheerpJ.
import * as java from "./java.js";
import * as D from "./draw.js";
import { Editor } from "./editor.js";
import { RobotView } from "./robotView.js";
import { DriverStation } from "./driverStation.js";

const W = 1280, H = 720;
const SIM_X = 680, DS_Y = 360;

const stage = document.getElementById("stage");
let scale = 1;
let sketch = null;

/** Scale the 1280 x 720 layout to fit the window, keeping its aspect ratio. */
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = Math.max(0, (innerWidth - W * scale) / 2) + "px";
  stage.style.top = Math.max(0, (innerHeight - H * scale) / 2) + "px";
  if (sketch) sketch.pixelDensity(Math.min(4, (window.devicePixelRatio || 1) * scale));
}
addEventListener("resize", fit);
fit();

// ---------------------------------------------------------------- build

let opName = null, opKind = null; // the OpMode on the Driver Station (null before a build)

const editor = new Editor(document.getElementById("editor"), { onBuild: build });

async function build() {
  if (!java.ready()) return;
  editor.save();
  editor.setBuilding(true);
  editor.message("Building…", "", "");
  try {
    const r = await java.build(editor.name, editor.text);
    editor.showResult(r);
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

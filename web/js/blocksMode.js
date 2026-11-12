// Blocks mode controller: layout like FTC Blocks (toolbox on the left, Java Code panel on the right,
// Op Mode Name row on top). Blockly lives outside the CSS-scaled stage (it doesn't support scaled
// parents) and is kept exactly over its stage area.
import Blockly, { toolbox, generate, className, setOpModeName, STARTER } from "./blocks.js?v=20261112e";
import { readOnlyView, setViewText } from "./editor.js?v=20261112e";

const STORE = "ftc-opmode-sim-web.blocks2"; // {name, kind, showJava, workspace}
const MODE_KEY = "ftc-opmode-sim-web.mode";
const AREA = { x: 0, y: 96, w: 680, h: 524 }; // under the Op Mode Name row, above Messages
const JAVA_W = 260;                          // Java Code panel width
const BASE_ZOOM = 0.65;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage off */ } },
};

export class BlocksMode {
  /** editor: the Java Editor (messages, Java file); stage: the scaled 1280x720 element. */
  constructor(editor, stage) {
    this.editor = editor;
    this.stage = stage;
    this.mode = "java";
    this.ws = null;
    this.view = null;
    this.scale = 1;
    this.wsScale = 1;
    this.host = document.getElementById("blockly-host");
    this.ui = document.querySelector(".bk");
    this.nameInput = this.ui.querySelector(".bk-name");
    this.kindSelect = this.ui.querySelector(".bk-kind");
    this.showJava = this.ui.querySelector(".bk-showjava");

    let saved = null;
    try { saved = JSON.parse(store.get(STORE)); } catch (e) { saved = null; }
    this.savedState = saved && saved.workspace ? saved : null; // last session (localStorage)
    this.nameInput.value = (this.savedState && this.savedState.name) || "My OpMode";
    this.kindSelect.value = (this.savedState && this.savedState.kind) || "TeleOp";
    this.showJava.checked = !this.savedState || this.savedState.showJava !== false;

    for (const b of document.querySelectorAll(".tab-mode")) b.addEventListener("click", () => this.setMode(b.dataset.mode));
    this.ui.querySelector(".bk-save").addEventListener("click", () => this.saveOpMode());
    this.ui.querySelector(".bk-convert").addEventListener("click", () => this.convertToJava());
    this.ui.querySelector(".bk-download").addEventListener("click", () => this.editor.download());
    this.nameInput.addEventListener("input", () => { setOpModeName(this.ws, this.nameInput.value); this.changed(); });
    this.kindSelect.addEventListener("change", () => this.changed());
    this.showJava.addEventListener("change", () => { this.layout(); this.changed(); });
    // Toolbar undo icon undoes blocks in Blocks mode (capture: runs before the Java editor's handler).
    document.querySelector(".files .undo").addEventListener("click", (e) => {
      if (this.mode !== "blocks") return;
      e.stopImmediatePropagation();
      this.ws.undo(false);
    }, true);
    // Cmd+S = Save Op Mode (instead of the browser's Save dialog).
    addEventListener("keydown", (e) => {
      if (this.mode === "blocks" && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.saveOpMode();
      }
    });
  }

  get name() { return this.nameInput.value.trim() || "My OpMode"; }
  get kind() { return this.kindSelect.value; }

  /** Restores the mode used last time. */
  start() {
    this.setMode(store.get(MODE_KEY) === "blocks" ? "blocks" : "java", true);
  }

  setMode(m, force) {
    if (m === this.mode && !force) return;
    this.mode = m;
    store.set(MODE_KEY, m);
    document.body.classList.toggle("mode-blocks", m === "blocks");
    for (const b of document.querySelectorAll(".tab-mode")) b.classList.toggle("active", b.dataset.mode === m);
    if (m === "blocks") {
      if (!this.ws) this.create();
      this.layout();
      this.showGenerated();
    } else {
      if (this.ws) Blockly.hideChaff();
      this.editor.updateName();
      this.editor.view.requestMeasure();
    }
  }

  create() {
    this.layout();
    const theme = Blockly.Theme.defineTheme("ftc-opmode-sim", {
      base: Blockly.Themes.Classic,
      fontStyle: { family: "Inter, sans-serif", weight: "500", size: 11 },
      componentStyles: { workspaceBackgroundColour: "#FFFFFF", toolboxBackgroundColour: "#E4E4E4", flyoutBackgroundColour: "#D6D6D6", flyoutOpacity: 0.85 },
    });
    this.ws = Blockly.inject(this.host, {
      toolbox, theme, renderer: "geras", media: "vendor/blockly-media/", sounds: false, trashcan: true,
      zoom: { controls: true, wheel: false, startScale: BASE_ZOOM * this.scale },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    this.wsScale = this.scale;
    setOpModeName(null, this.name);
    try {
      Blockly.serialization.workspaces.load(this.savedState ? this.savedState.workspace : STARTER, this.ws);
    } catch (e) {
      Blockly.serialization.workspaces.load(STARTER, this.ws);
    }
    setOpModeName(this.ws, this.name);
    this.ws.clearUndo();
    let timer = null;
    this.ws.addChangeListener((e) => {
      if (e.isUiEvent) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.changed(), 150);
    });
    this.view = readOnlyView(this.ui.querySelector(".bk-java .gen"));
  }

  /** Keeps Blockly over its stage area; the Java Code panel takes the right side when shown. */
  place(scale) {
    this.scale = scale;
    this.layout();
  }

  layout() {
    const java = this.showJava.checked;
    this.ui.classList.toggle("no-java", !java);
    const w = AREA.w - (java ? JAVA_W : 0);
    const r = this.stage.getBoundingClientRect();
    const s = this.scale;
    Object.assign(this.host.style, {
      left: r.left + AREA.x * s + "px", top: r.top + AREA.y * s + "px", width: w * s + "px", height: AREA.h * s + "px",
    });
    this.host.style.setProperty("--stage-scale", s); // toolbox text follows the stage scale (style.css)
    if (this.ws && this.mode === "blocks") {
      if (this.wsScale !== s) {
        this.ws.setScale(this.ws.scale * (s / this.wsScale));
        this.wsScale = s;
        this.ws.updateToolbox(toolbox); // re-measure the toolbox at the new text size
      }
      Blockly.svgResize(this.ws);
    }
  }

  /** Save Op Mode: like FTC Blocks, saving also builds it so it appears on the Driver Station. */
  saveOpMode() {
    this.status("Saving…", "");
    this.editor.onBuild();
  }

  /** Called by the build with the result (Blocks mode only). */
  saved(ok) {
    this.status(ok ? "Save completed successfully" : "Save failed: see Messages", ok ? "ok" : "err");
  }

  status(text, kind) {
    const s = this.ui.querySelector(".bk-status");
    s.textContent = text;
    s.className = "bk-status " + kind;
    clearTimeout(this.statusTimer);
    if (kind === "ok") this.statusTimer = setTimeout(() => { s.textContent = ""; }, 4000);
  }

  changed() {
    this.save();
    this.showGenerated();
  }

  save() {
    if (!this.ws) return;
    store.set(STORE, JSON.stringify({
      name: this.name, kind: this.kind, showJava: this.showJava.checked,
      workspace: Blockly.serialization.workspaces.save(this.ws),
    }));
  }

  generate() {
    return generate(this.ws, this.name, this.kind);
  }

  showGenerated() {
    if (!this.ws) return;
    const g = this.generate();
    setViewText(this.view, g.error ? "// " + g.error : g.code);
  }

  /** What Build Everything compiles in Blocks mode: {fileName, source, view} or {error}. */
  source() {
    this.save();
    const g = this.generate();
    if (g.error) return { error: g.error };
    setViewText(this.view, g.code);
    return { fileName: g.className + ".java", source: g.code, view: this.view };
  }

  /** Download .java in Blocks mode saves the generated Java. */
  downloadSource() {
    if (this.mode !== "blocks" || !this.ws) return null;
    const g = this.generate();
    return g.error ? null : { name: g.className + ".java", text: g.code };
  }

  label() {
    return this.mode === "blocks" ? className(this.name) + ".java" : null;
  }

  async loadExample(key, label) {
    this.setMode("blocks");
    const ex = await (await fetch("opmodes/blocks/" + key + ".json")).json();
    this.nameInput.value = ex.name;
    this.kindSelect.value = ex.kind;
    setOpModeName(null, ex.name);
    Blockly.serialization.workspaces.load(ex.workspace, this.ws);
    setOpModeName(this.ws, ex.name);
    this.changed();
    this.editor.message("Loaded example: " + label, "", "Press Save Op Mode, then pick it on the Driver Station (▼ on the right for TeleOp, left for Autonomous).");
  }

  convertToJava() {
    const g = this.generate();
    if (g.error) {
      this.editor.message("Can't convert yet", "err", g.error);
      return;
    }
    this.setMode("java");
    this.editor.setFile(g.code, true);
    this.editor.message("Converted to Java", "", "Your blocks are still saved in Blocks mode. Cmd+Z here brings back your previous Java.");
    this.editor.view.focus();
  }
}

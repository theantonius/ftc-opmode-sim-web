// OnBot Java-style code editor (left 680 x 720). Port of EditorPanel.java (Figma "Editor", node 3:2).
// CodeMirror 6 does the text editing; soft wrap is display only, the file is saved as typed.
import {
  EditorState, StateField, StateEffect, RangeSet,
  EditorView, ViewPlugin, Decoration, GutterMarker, keymap, lineNumbers, gutterLineClass, drawSelection,
  history, historyKeymap, defaultKeymap, undo, redo,
} from "../vendor/codemirror.js";

const STORE = "ftc-opmode-sim-web.opmode"; // {name, text}

// ---------------------------------------------------------------- error lines in the gutter

const setErrors = StateEffect.define();
const errorMarker = new (class extends GutterMarker {
  constructor() { super(); this.elementClass = "cm-error-line"; }
})();

const errorField = StateField.define({
  create: () => RangeSet.empty,
  update(set, tr) {
    for (const e of tr.effects) if (e.is(setErrors)) return e.value;
    // Line numbers may have shifted: clear until the next build re-marks them.
    return tr.docChanged ? RangeSet.empty : set;
  },
  provide: (f) => gutterLineClass.from(f),
});

// ---------------------------------------------------------------- hanging indent for wrapped rows

/** Continuation rows start at (leading spaces + 4) columns, like the Processing editor. */
const hangingIndent = ViewPlugin.fromClass(
  class {
    constructor(view) { this.decorations = this.build(view); }
    update(u) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
    build(view) {
      const out = [];
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const n = line.text.match(/^ */)[0].length;
          out.push(Decoration.line({
            attributes: { style: `padding-left: calc(8px + ${n + 4}ch); text-indent: -${n + 4}ch` },
          }).range(line.from));
          pos = line.to + 1;
        }
      }
      return Decoration.set(out);
    }
  },
  { decorations: (v) => v.decorations },
);

// ---------------------------------------------------------------- keys

function newlineWithIndent(view) {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.head);
  const before = line.text.slice(0, sel.head - line.from);
  const indent = before.match(/^ */)[0];
  view.dispatch(view.state.replaceSelection("\n" + indent), { scrollIntoView: true, userEvent: "input" });
  return true;
}

function softTab(view) {
  view.dispatch(view.state.replaceSelection("    "), { scrollIntoView: true, userEvent: "input" });
  return true;
}

/** Tints these line numbers red in a code view's gutter (cleared on the next edit). */
function markErrors(view, lines) {
  const doc = view.state.doc;
  const marks = [...new Set(lines)].filter((l) => l <= doc.lines).sort((a, b) => a - b)
    .map((l) => errorMarker.range(doc.line(l).from));
  view.dispatch({ effects: setErrors.of(RangeSet.of(marks)) });
}

/** Read-only code view (Blocks mode's generated Java): same look as the editor. */
export function readOnlyView(parent) {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [lineNumbers(), errorField, drawSelection(), EditorView.lineWrapping, hangingIndent,
        EditorState.readOnly.of(true)],
    }),
  });
}

/** Replaces a read-only view's text. */
export function setViewText(view, text) {
  if (view.state.doc.toString() === text) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}

// ---------------------------------------------------------------- editor

/** Public class name, e.g. "FourMotorTest" (file must be named after it). */
export function className(text) {
  const m = text.match(/\bpublic\s+(?:(?:final|abstract)\s+)*class\s+([A-Za-z_$][\w$]*)/);
  return m ? m[1] : null;
}

export class Editor {
  /**
   * hooks (all optional): onBuild(); onBlocksExample(key, label); onJavaChanged() after Upload or a Java example;
   * downloadSource() -> {name, text} to download instead of the Java file (Blocks mode);
   * label() -> file name to show in the tab and Project Files instead of the Java file's (Blocks mode).
   */
  constructor(root, hooks) {
    this.root = root;
    this.hooks = hooks;
    this.onBuild = hooks.onBuild;
    this.name = "FourMotorTest.java";
    this.saveTimer = null;
    this.$ = (sel) => root.querySelector(sel);

    this.extensions = [
      lineNumbers(),
      errorField,
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      hangingIndent,
      EditorState.tabSize.of(4),
      keymap.of([
        { key: "Enter", run: newlineWithIndent },
        { key: "Tab", run: softTab },
        { key: "Mod-s", run: () => { this.save(); return true; }, preventDefault: true },
        { key: "Mod-z", run: undo, preventDefault: true },
        { key: "Mod-Shift-z", run: redo, preventDefault: true },
        ...historyKeymap,
        ...defaultKeymap,
      ]),
      EditorView.updateListener.of((u) => { if (u.docChanged) this.autosave(); }),
    ];
    this.view = new EditorView({ parent: this.$(".code"), state: EditorState.create({ doc: "", extensions: this.extensions }) });

    this.$(".undo").addEventListener("click", () => { undo(this.view); this.view.focus(); });
    this.$(".build").addEventListener("click", () => this.onBuild());
    this.$(".download").addEventListener("click", () => this.download());
    const examples = this.$(".examples");
    examples.addEventListener("change", async () => {
      const key = examples.value;
      const label = examples.selectedOptions[0].textContent;
      examples.value = "";
      if (!key) return;
      if (key.startsWith("blocks:")) {
        if (this.hooks.onBlocksExample) this.hooks.onBlocksExample(key.slice(7), label);
        return;
      }
      if (this.hooks.onJavaChanged) this.hooks.onJavaChanged();
      this.setFile(await (await fetch("opmodes/" + key + ".java")).text(), true);
      this.message("Loaded example: " + label, "", "Press Build Everything to compile it. Cmd+Z brings back your code.");
      this.view.focus();
    });
    const upload = this.$(".upload-input");
    this.$(".upload").addEventListener("click", () => upload.click());
    upload.addEventListener("change", async () => {
      const f = upload.files[0];
      upload.value = "";
      if (!f) return;
      if (this.hooks.onJavaChanged) this.hooks.onJavaChanged();
      this.setFile(await f.text(), true);
    });
  }

  get text() { return this.view.state.doc.toString(); }

  /** Loads the saved OpMode from this browser, or the default file. */
  async load(defaultUrl) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE)); } catch (e) { saved = null; }
    if (saved && typeof saved.text === "string") this.setFile(saved.text, false);
    else this.setFile(await (await fetch(defaultUrl)).text(), false);
  }

  /** Replaces the editor text. undoable: keep it in undo history (Upload). */
  setFile(text, undoable) {
    const tr = { changes: { from: 0, to: this.view.state.doc.length, insert: text }, selection: { anchor: 0 } };
    if (undoable) {
      this.view.dispatch(tr);
    } else {
      this.view.setState(EditorState.create({ doc: text, extensions: this.extensions })); // fresh undo history
    }
    this.updateName();
    this.save();
  }

  updateName() {
    const c = className(this.text);
    if (c) this.name = c + ".java";
    const label = (this.hooks.label && this.hooks.label()) || this.name;
    for (const el of this.root.querySelectorAll(".file-name")) el.textContent = label;
  }

  autosave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 400);
  }

  /** Saves in this browser (localStorage). */
  save() {
    clearTimeout(this.saveTimer);
    this.updateName();
    try { localStorage.setItem(STORE, JSON.stringify({ name: this.name, text: this.text })); } catch (e) { /* storage off */ }
  }

  download() {
    this.save();
    const src = (this.hooks.downloadSource && this.hooks.downloadSource()) || { name: this.name, text: this.text };
    const url = URL.createObjectURL(new Blob([src.text], { type: "text/x-java" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = src.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------------------------------------------------------------- messages

  setBuilding(on, label) {
    const b = this.$(".build");
    b.classList.toggle("busy", on);
    b.disabled = on;
    this.$(".build-label").textContent = on ? (label || "Building…") : "Build Everything";
  }

  message(title, kind, body) {
    const t = this.$(".msg-title");
    t.textContent = title;
    t.className = "msg-title " + (kind || "");
    const m = this.$(".msg-body");
    m.textContent = body || "";
    m.scrollTop = 0;
  }

  /** Shows a build result like the Processing editor and tints error lines. */
  showResult(r, view = this.view) {
    const lines = [];
    if (r.ok) {
      this.message("Build succeeded!", "ok", 'OpMode "' + r.name + '" is now available on the Driver Station.');
    } else {
      const n = r.problems.length;
      this.message("Build failed: " + n + (n === 1 ? " error" : " errors"), "err", "");
      const body = this.$(".msg-body");
      for (const p of r.problems) {
        const div = document.createElement("div");
        div.className = "problem";
        div.textContent = (p.line > 0 ? "Line " + p.line + ": " : "") + p.message.replace(/\n/g, "\n    ");
        if (p.line > 0) {
          lines.push(p.line);
          div.classList.add("jump");
          div.addEventListener("click", () => this.jumpTo(p.line, view));
        }
        body.appendChild(div);
      }
    }
    markErrors(view, lines);
  }

  /** Click on an error in Messages -> move the cursor to that line. */
  jumpTo(lineNo, view = this.view) {
    const doc = view.state.doc;
    if (lineNo < 1 || lineNo > doc.lines) return;
    const pos = doc.line(lineNo).from;
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    view.focus();
  }
}

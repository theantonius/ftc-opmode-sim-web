// Driver Station panel, 600 x 360: the REV Driver Station screen at 0.75 scale.
// Port of DriverStationView.java (Figma "Driver Station", node 4:27).
// Working: OpMode bar, INIT -> PLAY -> STOP button, Status line, telemetry, errors.
// Static: timer, battery, network, User 1/2, menu.
import * as D from "./draw.js?v=20261112g";

const BG = "#3C0007";
const TOP_BAR = "#2A2A2A";
const BORDER = "#C8101E";
const MENU_BG = "#3A2A2A";
const BATTERY_GREEN = "#3FA535";
const BUTTON = "#D32F2F";
const BUTTON_HOVER = "#E53935";
const HINT = "#E8B4B8";
const ERROR = "#F2C94C";
const WHITE = "#FFFFFF";
const BW = 1.579; // border width

// Big button (Figma "STOP button", centered in the 300 px button area)
const BTN_X = 97, BTN_Y = 214, BTN_D = 105;
// Stop square (Figma "Stop square")
const SQ_X = 132.5264, SQ_Y = 249.5264, SQ = 34.737;

// OpMode list (opens under the OpMode bar)
const MENU = { x: 20, y: 186, w: 260, title: 24, row: 26 };

// Telemetry text area
const TEL_X = 306.32, TEL_Y = 100.26, TEL_LINE = 14.211, TEL_BOTTOM = 356;

const UI = [
  "connected_bg", "signal", "menu_ring", "menu_dot", "play_circle", "play_tri",
  "config_icon", "ds_batt", "robot_batt", "big_bg_circle", "tri", "robot_icon",
];

export class DriverStation {
  constructor(p) {
    this.p = p;
    this.icons = {};
    this.hover = false;   // over the big button
    this.hoverTri = null; // "Autonomous" | "TeleOp" while over a triangle
    this.scroll = 0;      // telemetry scroll, in lines
    this.selected = null; // {name, kind} picked from a triangle menu, like the real DS
    this.menu = null;     // open OpMode list: "Autonomous" (left triangle) | "TeleOp" (right triangle)
    this.menuHover = -1;
  }

  /** After a build: keep the selection if the same OpMode is still there, otherwise clear it. */
  onBuilt(built) {
    if (this.selected && (!built || built.name !== this.selected.name || built.kind !== this.selected.kind)) this.selected = null;
    else if (this.selected) this.selected = built;
  }

  async load() {
    await Promise.all(UI.map(async (n) => (this.icons[n] = await D.loadSvg("assets/ui/" + n + ".svg"))));
  }

  // ------------------------------------------------------------ input (panel coordinates)

  /** True over the big INIT/PLAY/STOP button (only after an OpMode is selected). */
  overButton(snap, x, y) {
    if (!this.selected || this.menu) return false;
    const r = BTN_D / 2, cx = BTN_X + r, cy = BTN_Y + r;
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
  }

  /** Which action the big button does now: "init" | "play" | "stop". */
  action(snap) {
    const s = snap ? snap.state : "IDLE";
    return s === "INIT" ? "play" : s === "RUNNING" ? "stop" : "init";
  }

  /** Which triangle (x, y) is on: left = Autonomous list, right = TeleOp list. Disabled while an OpMode runs. */
  overTri(snap, x, y) {
    const s = snap ? snap.state : "IDLE";
    if (s === "INIT" || s === "RUNNING" || y < 142.89 || y > 180.79) return null;
    if (x < 75) return "Autonomous";
    if (x > 225 && x < 300) return "TeleOp";
    return null;
  }

  /** Menu rows for the open list: the built OpMode if it is of that kind (the sim runs one OpMode). */
  menuItems(built) {
    return built && built.kind === this.menu ? [built] : [];
  }

  menuRowAt(x, y, built) {
    const n = Math.max(1, this.menuItems(built).length);
    if (x < MENU.x || x > MENU.x + MENU.w) return -1;
    const i = Math.floor((y - MENU.y - MENU.title) / MENU.row);
    return i >= 0 && i < n ? i : -1;
  }

  mouseMove(snap, built, x, y) {
    this.hover = this.overButton(snap, x, y);
    this.hoverTri = this.menu ? null : this.overTri(snap, x, y);
    this.menuHover = this.menu ? this.menuRowAt(x, y, built) : -1;
    return this.hover || this.hoverTri || this.menuHover >= 0;
  }

  /** Click in panel coordinates. Returns "init" | "play" | "stop" for the sim, or null. */
  click(snap, built, x, y) {
    if (this.menu) {
      const items = this.menuItems(built);
      const i = this.menuRowAt(x, y, built);
      if (i >= 0 && items[i]) {
        this.selected = items[i];
        this.scroll = 0;
      }
      this.menu = null;
      this.menuHover = -1;
      return null;
    }
    const tri = this.overTri(snap, x, y);
    if (tri) {
      this.menu = tri;
      return null;
    }
    return this.overButton(snap, x, y) ? this.action(snap) : null;
  }

  wheel(x, y, lines) {
    if (x >= 300 && y >= 68) this.scroll = Math.max(0, this.scroll + lines);
  }

  // ------------------------------------------------------------ paint

  /** built: the OpMode from the last good build, {name, kind} or null. The DS shows the selected one. */
  paint(snap, built) {
    const p = this.p, ctx = p.drawingContext, ic = this.icons;
    const name = this.selected ? this.selected.name : null;
    const kind = this.selected ? this.selected.kind : null;
    const state = snap ? snap.state : "IDLE";
    const error = snap ? snap.error : null;

    p.noStroke();
    p.fill(BG);
    p.rect(0, 0, 600, 360);

    // Top bar (static)
    p.fill(TOP_BAR);
    p.rect(0, 0, 600, 30);
    D.image(ctx, ic.connected_bg, 52.89, 0);
    D.text(ctx, "Robot Connected", D.font("bold", 12.632), WHITE, 88.42, 7.11, D.LEFT);
    D.lines(ctx, ["Network: SIM-RC", "Ping: 0ms - sim"], D.font("semibold", 9.474), WHITE, 363.16, 1.58, 14.211, D.LEFT);
    D.image(ctx, ic.signal, 463.42, 7.89);
    D.text(ctx, "User 1   User 2", D.font("semibold", 7.895), WHITE, 488.68, 15, D.LEFT);
    p.fill(MENU_BG);
    p.rect(561.32, 0, 38.684, 68.684);
    D.image(ctx, ic.menu_ring, 570, 13.42);
    D.image(ctx, ic.menu_dot, 577.89, 22.89);
    D.image(ctx, ic.menu_dot, 577.89, 31.58);
    D.image(ctx, ic.menu_dot, 577.89, 40.26);

    // Timer + config (static)
    D.box(ctx, 0, 30, 150, 112.895, BG, BORDER, BW);
    D.text(ctx, "Practice Timer", D.font("semibold", 9.474), WHITE, 63.95, 67.89, D.CENTER);
    D.text(ctx, "2:30", D.font("semibold", 17.368), WHITE, 34.74, 83.68, D.LEFT);
    D.image(ctx, ic.play_circle, 91.58, 85.26);
    D.image(ctx, ic.play_tri, 97.89, 90);
    D.box(ctx, 150, 30, 150, 112.895, BG, BORDER, BW);
    D.image(ctx, ic.config_icon, 193.42, 73.42);
    D.text(ctx, "SimRobot", D.font("semibold", 8.684), WHITE, 217.89, 80.53, D.LEFT);

    // Batteries (static)
    D.box(ctx, 300, 30, 82.895, 38.684, BG, BORDER, BW);
    D.text(ctx, "DS: 97%", D.font("semibold", 8.684), WHITE, 341.45, 36.32, D.CENTER);
    D.image(ctx, ic.ds_batt, 328.42, 51.32);
    D.box(ctx, 382.89, 30, 178.421, 38.684, BATTERY_GREEN, BORDER, BW);
    D.image(ctx, ic.robot_batt, 424.74, 39.47);
    D.text(ctx, "13.11 V", D.font("regular", 13.421), WHITE, 476.84, 34.74, D.LEFT);
    D.text(ctx, "( 13.11 V )", D.font("regular", 7.895), WHITE, 484.74, 53.68, D.LEFT);

    // Button area
    p.noStroke();
    p.fill(BG);
    p.rect(0, 180, 300, 180);
    D.image(ctx, ic.big_bg_circle, 10.26, 133.42);
    if (name) this.bigButton(state);
    D.text(ctx, name ? "INIT → PLAY ▶ → STOP ■" : "◀ ▼ Autonomous          TeleOp ▼ ▶", D.font("semibold", 9.474), HINT, 150, 337.89, D.CENTER);

    // Telemetry pane
    D.box(ctx, 300, 68.68, 300, 291.316, BG, BORDER, BW);
    D.text(ctx, "Status : " + this.status(state, name, error), D.font("regular", 11.053), WHITE, TEL_X, 78.16, D.LEFT);
    this.telemetry(name ? snap : null, name ? error : null); // nothing selected: blank pane

    // OpMode bar (on top of the big circle)
    p.noStroke();
    p.fill(BORDER);
    p.rect(0, 142.89, 300, 37.895);
    ctx.save();
    ctx.globalAlpha = this.hoverTri === "Autonomous" || this.menu === "Autonomous" ? 0.75 : 1;
    D.image(ctx, ic.tri, 19.74, 146.84);
    ctx.globalAlpha = this.hoverTri === "TeleOp" || this.menu === "TeleOp" ? 0.75 : 1;
    D.image(ctx, ic.tri, 250.26, 146.84);
    ctx.restore();
    const bar = name ? [kind, name] : ["", "No Op Mode"];
    D.lines(ctx, bar, D.font("semibold", 11.053), WHITE, 150, 144.47, 16.579, D.CENTER);

    if (this.menu) this.paintMenu(built);

    D.image(ctx, ic.robot_icon, 14.21, 4.74);
  }

  /** The OpMode list that drops from a triangle (one list per kind, like the real DS). */
  paintMenu(built) {
    const ctx = this.p.drawingContext;
    const items = this.menuItems(built);
    const rows = Math.max(1, items.length);
    const h = MENU.title + rows * MENU.row;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 180.79, 300, 179.21);
    D.box(ctx, MENU.x, MENU.y, MENU.w, h, "#FFFFFF", "#9E9E9E", 1);
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(MENU.x + 1, MENU.y + 1, MENU.w - 2, MENU.title - 1);
    D.text(ctx, "Select " + this.menu + " Op Mode", D.font("semibold", 10.5), "#333333", MENU.x + 10, MENU.y + 6, D.LEFT);
    if (items.length === 0) {
      D.text(ctx, "No " + this.menu + " Op Modes", D.font("regular", 10.5), "#888888", MENU.x + 10, MENU.y + MENU.title + 7, D.LEFT);
    }
    items.forEach((it, i) => {
      const y = MENU.y + MENU.title + i * MENU.row;
      if (i === this.menuHover) {
        ctx.fillStyle = "#DCE6F5";
        ctx.fillRect(MENU.x + 1, y, MENU.w - 2, MENU.row);
      }
      D.text(ctx, it.name, D.font("regular", 11.053), "#111111", MENU.x + 10, y + 6, D.LEFT);
    });
    ctx.restore();
  }

  status(state, name, error) {
    if (!name) return "No Op Mode selected";
    switch (state) {
      case "INIT": return "Initialized " + name;
      case "RUNNING": return "Running " + name;
      case "STOPPED": return error ? "Stopped (error)" : "Stopped " + name;
      default: return name + " selected";
    }
  }

  /** INIT text, PLAY triangle or STOP square on the red circle. */
  bigButton(state) {
    const p = this.p, ctx = p.drawingContext;
    p.noStroke();
    p.fill(this.hover ? BUTTON_HOVER : BUTTON);
    p.ellipseMode(p.CORNER);
    p.ellipse(BTN_X, BTN_Y, BTN_D, BTN_D);
    const cx = BTN_X + BTN_D / 2, cy = BTN_Y + BTN_D / 2;
    p.fill(WHITE);
    if (state === "INIT") {
      p.triangle(cx - 13, cy - 20, cx + 21, cy, cx - 13, cy + 20);
    } else if (state === "RUNNING") {
      p.rect(SQ_X, SQ_Y, SQ, SQ, 2.368);
    } else {
      D.text(ctx, "INIT", D.font("bold", 22), WHITE, cx, cy - 13.5, D.CENTER);
    }
  }

  telemetry(snap, error) {
    const ctx = this.p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(301.6, TEL_Y - 2, 296.8, TEL_BOTTOM - TEL_Y + 2);
    ctx.clip();
    if (error) {
      const f = D.font("regular", 11.053);
      D.lines(ctx, D.wrap(ctx, "Error: " + error, f, 284), f, ERROR, TEL_X, TEL_Y, 15, D.LEFT);
      ctx.restore();
      return;
    }
    const lines = snap ? snap.telemetry : [];
    const visible = Math.floor((TEL_BOTTOM - TEL_Y) / TEL_LINE);
    this.scroll = Math.min(this.scroll, Math.max(0, lines.length - visible));
    const end = Math.min(lines.length, this.scroll + visible + 1);
    D.lines(ctx, lines.slice(Math.min(this.scroll, end), end), D.font("mono", 9.474), WHITE, TEL_X, TEL_Y, TEL_LINE, D.LEFT);
    if (lines.length > visible) { // scroll hint
      const trackH = TEL_BOTTOM - TEL_Y;
      const thumbH = Math.max(12, (trackH * visible) / lines.length);
      const thumbY = TEL_Y + ((trackH - thumbH) * this.scroll) / Math.max(1, lines.length - visible);
      ctx.fillStyle = "rgba(255,255,255,0.353)";
      ctx.beginPath();
      ctx.roundRect(593, thumbY, 3, thumbH, 1.5);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Top-down robot view, 600 x 360. Port of RobotView.java (Figma "Robot View", node 6:2).
// Wheels-up bench test: wheels spin, robot stays put.
import * as D from "./draw.js?v=20261112e";

const BG = "#2B2F33";
const HEADER = "#3A4046";
const TITLE = "#E6EDF3";
const BENCH = "#F2C94C";
const FRONT = "#9AA4AE";
const FRAME = "#B8BEC4";
const WHEEL = "#3A3A3A";
const ROLLER = "#E8B500";
const LABEL = "#C9D1D9";
const GREEN = "#3FB950"; // FL + BR
const BLUE = "#58A6FF"; // FR + BL
const CIRCLE_EDGE = "#222222";

/** Roller stripe speed at full power, px/s. */
const ROLLER_SPEED = 80;

// Index order matches the sim's motors: FL, FR, BL, BR.
const WHEEL_XY = [[162, 60], [402, 60], [162, 230], [402, 230]];
const ARROW_XY = [[136, 64], [444, 64], [136, 234], [444, 234]];
const BACKSLASH = [true, false, false, true]; // FL/BR "\", FR/BL "/"
const PAIR = [GREEN, BLUE, BLUE, GREEN];
const LEFT_SIDE = [true, false, true, false];

const sgn = (v) => (v > 1e-6 ? 1 : v < -1e-6 ? -1 : 0);

/** The 10 chart patterns (front = open end of the H), from wheel spin signs. FL, FR, BL, BR. */
export function classify(fl, fr, bl, br) {
  const a = sgn(fl), b = sgn(fr), c = sgn(bl), d = sgn(br);
  if (a === 1 && b === 1 && c === 1 && d === 1) return "FORWARD";
  if (a === -1 && b === -1 && c === -1 && d === -1) return "BACKWARD";
  if (a === 0 && d === 0 && b === 1 && c === 1) return "FORWARD_LEFT";
  if (a === 0 && d === 0 && b === -1 && c === -1) return "BACKWARD_RIGHT";
  if (b === 0 && c === 0 && a === 1 && d === 1) return "FORWARD_RIGHT";
  if (b === 0 && c === 0 && a === -1 && d === -1) return "BACKWARD_LEFT";
  if (b === 1 && c === 1 && a === -1 && d === -1) return "STRAFE_LEFT";
  if (b === -1 && c === -1 && a === 1 && d === 1) return "STRAFE_RIGHT";
  if (a === -1 && c === -1 && b === 1 && d === 1) return "TURN_CCW";
  if (a === 1 && c === 1 && b === -1 && d === -1) return "TURN_CW";
  return "NONE";
}

/** Like Java's BigDecimal(String.format("%.2f", p)).stripTrailingZeros(): 0.25, 0.5, 1, -0.5. */
function powerText(p) {
  if (p === 0) return "0";
  const n = Number(p.toFixed(2));
  return n === 0 ? "0" : String(n);
}

const DEFAULT_MOTORS = [
  { name: "frontLeft", port: 0, power: 0, spin: 0, enc: 0 },
  { name: "frontRight", port: 1, power: 0, spin: 0, enc: 0 },
  { name: "backLeft", port: 2, power: 0, spin: 0, enc: 0 },
  { name: "backRight", port: 3, power: 0, spin: 0, enc: 0 },
];

export class RobotView {
  constructor(p) {
    this.p = p;
    this.phase = [0, 0, 0, 0];
    this.last = performance.now();
  }

  paint(snap) {
    const p = this.p, ctx = p.drawingContext;
    const motors = snap ? snap.motors : DEFAULT_MOTORS;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const spin = motors.map((m) => m.spin);
    for (let i = 0; i < 4; i++) this.phase[i] = (this.phase[i] + spin[i] * ROLLER_SPEED * dt) % 10;

    p.noStroke();
    p.fill(BG);
    p.rect(0, 0, 600, 360);
    p.fill(HEADER);
    p.rect(0, 0, 600, 28);
    D.text(ctx, "ROBOT VIEW · TOP DOWN", D.font("bold", 12), TITLE, 12, 6, D.LEFT);
    D.text(ctx, "BENCH TEST: wheels off ground", D.font("semibold", 12), BENCH, 588, 6, D.RIGHT);
    D.text(ctx, "▲ FRONT", D.font("bold", 11), FRONT, 300, 36, D.CENTER);

    // H-frame, open end at the front
    p.fill(FRAME);
    p.rect(202, 58, 26, 250, 2);
    p.rect(372, 58, 26, 250, 2);
    p.rect(228, 170, 144, 24, 2);
    p.rect(228, 282, 144, 26, 2);

    for (let i = 0; i < 4; i++) {
      this.wheel(WHEEL_XY[i][0], WHEEL_XY[i][1], BACKSLASH[i], this.phase[i]);
      if (spin[i] !== 0) this.arrow(ARROW_XY[i][0], ARROW_XY[i][1], spin[i] > 0, PAIR[i]);
      this.label(motors[i], i);
    }

    this.directionCircle(classify(spin[0], spin[1], spin[2], spin[3]));

    D.text(ctx, "▲ forward   ▼ reverse   green = FL+BR   blue = FR+BL", D.font("semibold", 12), LABEL, 12, 336, D.LEFT);
  }

  wheel(x, y, backslash, phase) {
    const p = this.p, ctx = p.drawingContext;
    p.push();
    p.noStroke();
    p.fill(WHEEL);
    p.rect(x, y, 36, 76, 7);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, 36, 76, 7);
    ctx.clip();
    p.translate(x, y);
    p.stroke(ROLLER);
    p.strokeWeight(6);
    p.strokeCap(p.ROUND);
    // Forward spin: the top of the wheel moves toward the front, so stripes move up.
    const off = -phase;
    for (let k = -5; k <= 10; k++) {
      const y0 = k * 10 + off;
      if (backslash) p.line(2, y0, 34, y0 + 20);
      else p.line(2, y0 + 20, 34, y0);
    }
    ctx.restore();
    p.pop();
  }

  /** Figma "Arrow FL (reverse)" geometry; flipped vertically for forward. */
  arrow(x, y, forward, color) {
    const p = this.p;
    p.push();
    p.translate(x, y);
    if (forward) {
      p.translate(0, 68);
      p.scale(1, -1);
    }
    p.stroke(color);
    p.strokeWeight(5);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.noFill();
    p.line(10, 2, 10, 57);
    p.beginShape();
    p.vertex(2, 49);
    p.vertex(10, 64);
    p.vertex(18, 49);
    p.endShape();
    p.pop();
  }

  label(m, i) {
    const ctx = this.p.drawingContext;
    const lines = [m.name + " [" + m.port + "]", "pwr " + powerText(m.power), "enc " + m.enc];
    const left = LEFT_SIDE[i];
    const color = m.power !== 0 ? "#FFFFFF" : LABEL;
    const top = i < 2 ? 72 : 238;
    D.lines(ctx, lines, D.font("semibold", 13), color, left ? 132 : 468, top, 18, left ? D.RIGHT : D.LEFT);
  }

  directionCircle(move) {
    const p = this.p;
    p.push();
    p.fill("#FFFFFF");
    p.stroke(CIRCLE_EDGE);
    p.strokeWeight(2);
    p.ellipseMode(p.CORNER);
    p.ellipse(261, 143, 78, 78);
    if (move === "NONE") {
      p.pop();
      return; // no clean move: stays empty
    }
    p.translate(300, 182);
    p.noFill();
    p.strokeWeight(6);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    const s = Math.sqrt(0.5);
    switch (move) {
      case "FORWARD": this.straight(0, -1, CIRCLE_EDGE); break;
      case "BACKWARD": this.straight(0, 1, CIRCLE_EDGE); break;
      case "STRAFE_LEFT": this.straight(-1, 0, CIRCLE_EDGE); break;
      case "STRAFE_RIGHT": this.straight(1, 0, CIRCLE_EDGE); break;
      case "FORWARD_LEFT": this.straight(-s, -s, BLUE); break; // FR + BL
      case "BACKWARD_RIGHT": this.straight(s, s, BLUE); break;
      case "FORWARD_RIGHT": this.straight(s, -s, GREEN); break; // FL + BR
      case "BACKWARD_LEFT": this.straight(-s, s, GREEN); break;
      case "TURN_CCW": this.rotation(false, CIRCLE_EDGE); break;
      case "TURN_CW": this.rotation(true, CIRCLE_EDGE); break;
    }
    p.pop();
  }

  straight(dx, dy, color) {
    const p = this.p;
    p.stroke(color);
    const len = 24;
    p.line(-dx * len, -dy * len, dx * len, dy * len);
    this.head(dx * len, dy * len, Math.atan2(dy, dx));
  }

  rotation(clockwise, color) {
    const p = this.p;
    p.stroke(color);
    const r = 20;
    // Arc with a gap at the top; arrowhead at the end in the turn direction.
    // Angles as in Java2D's Arc2D: degrees counter-clockwise from 3 o'clock (y up).
    const start = clockwise ? 60 : 120;
    const extent = clockwise ? -300 : 300;
    p.beginShape();
    for (let k = 0; k <= 60; k++) {
      const a = ((start + (extent * k) / 60) * Math.PI) / 180;
      p.vertex(r * Math.cos(a), -r * Math.sin(a));
    }
    p.endShape();
    const end = ((start + extent) * Math.PI) / 180;
    const ex = r * Math.cos(end), ey = -r * Math.sin(end);
    // Tangent direction at the end of the arc (screen coords, y down).
    const tangent = clockwise ? Math.atan2(Math.cos(end), Math.sin(end)) : Math.atan2(-Math.cos(end), -Math.sin(end));
    this.head(ex, ey, tangent);
  }

  head(x, y, angle) {
    const p = this.p;
    const a = (35 * Math.PI) / 180, len = 12;
    p.beginShape();
    p.vertex(x - len * Math.cos(angle - a), y - len * Math.sin(angle - a));
    p.vertex(x, y);
    p.vertex(x - len * Math.cos(angle + a), y - len * Math.sin(angle + a));
    p.endShape();
  }
}

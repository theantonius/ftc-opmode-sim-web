// Blocks mode: drag-and-drop blocks (Blockly) that generate a real FTC OpMode in Java.
// The generated Java goes through the same Build Everything, sim and Driver Station as Java mode.
// Block definitions and the Java generator are written for this project.
import Blockly from "../vendor/blockly.js";

const MOTORS = [["frontLeft", "frontLeft"], ["frontRight", "frontRight"], ["backLeft", "backLeft"], ["backRight", "backRight"]];
const MOTOR_ORDER = MOTORS.map((m) => m[0]);

const HUE = { opmode: 290, motor: 30, telemetry: 90 };

// ---------------------------------------------------------------- block definitions

/** Class names must be valid Java identifiers. */
function javaIdentifier(text) {
  let s = String(text).replace(/[^A-Za-z0-9_$]/g, "");
  if (!s) return null;
  if (/^[0-9]/.test(s)) s = "_" + s;
  return s;
}

Blockly.common.defineBlocksWithJsonArray([
  {
    type: "ftc_opmode",
    message0: "%1 OpMode named %2",
    args0: [
      { type: "field_dropdown", name: "KIND", options: [["TeleOp", "TeleOp"], ["Autonomous", "Autonomous"]] },
      { type: "field_input", name: "NAME", text: "My Blocks OpMode" },
    ],
    message1: "Java class %1",
    args1: [{ type: "field_input", name: "CLASS", text: "MyBlocksOpMode" }],
    message2: "Put initialization blocks here: %1",
    args2: [{ type: "input_statement", name: "INIT" }],
    message3: "call waitForStart",
    message4: "Put run blocks here: %1",
    args4: [{ type: "input_statement", name: "RUN" }],
    message5: "repeat while opModeIsActive: %1",
    args5: [{ type: "input_statement", name: "LOOP" }],
    colour: HUE.opmode,
    tooltip: "runOpMode: runs when this OpMode is picked on the Driver Station. INIT runs the first part, PLAY the rest.",
  },
  {
    type: "ftc_sleep",
    message0: "sleep %1 milliseconds",
    args0: [{ type: "input_value", name: "MS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    colour: HUE.opmode,
    tooltip: "Wait this many milliseconds (1000 ms = 1 second).",
  },
  {
    type: "ftc_opmode_active",
    message0: "opModeIsActive",
    output: "Boolean",
    colour: HUE.opmode,
    tooltip: "True after PLAY until STOP.",
  },
  {
    type: "ftc_motor_set_power",
    message0: "set %1 .Power to %2",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "input_value", name: "POWER", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    colour: HUE.motor,
    tooltip: "Motor power from -1 (full reverse) to 1 (full forward).",
  },
  {
    type: "ftc_motor_set_direction",
    message0: "set %1 .Direction to %2",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "field_dropdown", name: "DIR", options: [["REVERSE", "REVERSE"], ["FORWARD", "FORWARD"]] },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    colour: HUE.motor,
    tooltip: "REVERSE flips which way positive power turns the motor.",
  },
  {
    type: "ftc_motor_get_position",
    message0: "%1 .CurrentPosition",
    args0: [{ type: "field_dropdown", name: "MOTOR", options: MOTORS }],
    output: "Number",
    colour: HUE.motor,
    tooltip: "The motor's encoder count.",
  },
  {
    type: "ftc_telemetry_add_data",
    message0: "telemetry.addData key %1 value %2",
    args0: [
      { type: "field_input", name: "KEY", text: "key" },
      { type: "input_value", name: "VALUE" },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    colour: HUE.telemetry,
    tooltip: "Add a line to the Driver Station. It shows after telemetry.update.",
  },
  {
    type: "ftc_telemetry_update",
    message0: "call telemetry.update",
    previousStatement: null,
    nextStatement: null,
    colour: HUE.telemetry,
    tooltip: "Send the telemetry lines to the Driver Station.",
  },
]);

Blockly.Blocks["ftc_opmode"].init = (function (init) {
  return function () {
    init.call(this);
    this.getField("CLASS").setValidator(javaIdentifier);
  };
})(Blockly.Blocks["ftc_opmode"].init);

// ---------------------------------------------------------------- Java generator

const O = {
  ATOMIC: 0, CALL: 1, UNARY: 2, MULTIPLICATIVE: 3, ADDITIVE: 4,
  RELATIONAL: 6, EQUALITY: 7, AND: 11, OR: 12, ASSIGNMENT: 14, NONE: 99,
};

export const java = new Blockly.CodeGenerator("Java");
java.INDENT = "    ";
java.addReservedWords(
  "abstract,assert,boolean,break,byte,case,catch,char,class,const,continue,default,do,double,else,enum,extends,final," +
  "finally,float,for,goto,if,implements,import,instanceof,int,interface,long,native,new,package,private,protected," +
  "public,return,short,static,strictfp,super,switch,synchronized,this,throw,throws,transient,try,void,volatile,while," +
  "true,false,null,var,record,yield,Math,String,Object,System,telemetry,hardwareMap,gamepad1,gamepad2,sleep,idle," +
  "frontLeft,frontRight,backLeft,backRight,DcMotor,LinearOpMode,TeleOp,Autonomous",
);

java.init = function (workspace) {
  Object.getPrototypeOf(this).init.call(this, workspace);
  if (!this.nameDB_) this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  else this.nameDB_.reset();
  this.nameDB_.setVariableMap(workspace.getVariableMap());
  this.nameDB_.populateVariables(workspace);
  this.motorsUsed = new Set();
};

java.scrub_ = function (block, code, thisOnly) {
  const next = block.nextConnection && block.nextConnection.targetBlock();
  return code + (thisOnly ? "" : this.blockToCode(next));
};

java.scrubNakedValue = (line) => line + ";\n";

const varName = (gen, block) => gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
const isIntLiteral = (code) => /^-?\d+$/.test(code);

java.forBlock["ftc_opmode"] = function (block, gen) {
  const init = gen.statementToCode(block, "INIT");
  const run = gen.statementToCode(block, "RUN");
  const loop = gen.statementToCode(block, "LOOP");
  const kind = block.getFieldValue("KIND");
  const name = block.getFieldValue("NAME");
  const cls = block.getFieldValue("CLASS");
  const ind = (code, n) => gen.prefixLines(code, gen.INDENT.repeat(n));

  const decl = [];
  for (const m of MOTOR_ORDER) {
    if (gen.motorsUsed.has(m)) decl.push(`DcMotor ${m} = hardwareMap.get(DcMotor.class, "${m}");\n`);
  }
  for (const v of Blockly.Variables.allUsedVarModels(block.workspace)) {
    decl.push(`double ${gen.nameDB_.getName(v.getId(), Blockly.Names.NameType.VARIABLE)} = 0;\n`);
  }

  let body = decl.join("");
  if (body && init) body += "\n";
  body += init.replace(/^ {4}/gm, "");
  body += (body ? "\n" : "") + "waitForStart();\n";
  let active = run.replace(/^ {4}/gm, "");
  if (loop) {
    active += (active ? "\n" : "") + "while (opModeIsActive()) {\n" + loop + "}\n";
  }
  body += "if (opModeIsActive()) {\n" + ind(active, 1) + "}\n";

  const file = (
    "package org.firstinspires.ftc.teamcode;\n\n" +
    "import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;\n" +
    `import com.qualcomm.robotcore.eventloop.opmode.${kind};\n` +
    "import com.qualcomm.robotcore.hardware.DcMotor;\n\n" +
    "// Generated from Blocks.\n" +
    `@${kind}(name = ${JSON.stringify(name)})\n` +
    `public class ${cls} extends LinearOpMode {\n\n` +
    "    @Override\n" +
    "    public void runOpMode() {\n" +
    ind(body, 2) +
    "    }\n" +
    "}\n"
  );
  return file.replace(/[ \t]+$/gm, ""); // no indent on blank lines
};

java.forBlock["ftc_sleep"] = function (block, gen) {
  const ms = gen.valueToCode(block, "MS", O.NONE) || "0";
  return isIntLiteral(ms) ? `sleep(${ms});\n` : `sleep((long) (${ms}));\n`;
};

java.forBlock["ftc_opmode_active"] = () => ["opModeIsActive()", O.CALL];

java.forBlock["ftc_motor_set_power"] = function (block, gen) {
  const m = block.getFieldValue("MOTOR");
  gen.motorsUsed.add(m);
  const p = gen.valueToCode(block, "POWER", O.NONE) || "0";
  return `${m}.setPower(${p});\n`;
};

java.forBlock["ftc_motor_set_direction"] = function (block, gen) {
  const m = block.getFieldValue("MOTOR");
  gen.motorsUsed.add(m);
  return `${m}.setDirection(DcMotor.Direction.${block.getFieldValue("DIR")});\n`;
};

java.forBlock["ftc_motor_get_position"] = function (block, gen) {
  const m = block.getFieldValue("MOTOR");
  gen.motorsUsed.add(m);
  return [`${m}.getCurrentPosition()`, O.CALL];
};

java.forBlock["ftc_telemetry_add_data"] = function (block, gen) {
  const v = gen.valueToCode(block, "VALUE", O.NONE) || '""';
  return `telemetry.addData(${JSON.stringify(block.getFieldValue("KEY"))}, ${v});\n`;
};

java.forBlock["ftc_telemetry_update"] = () => "telemetry.update();\n";

// ---- Blockly built-ins

java.forBlock["controls_if"] = function (block, gen) {
  let n = 0, code = "";
  do {
    const cond = gen.valueToCode(block, "IF" + n, O.NONE) || "false";
    code += (n > 0 ? " else " : "") + `if (${cond}) {\n` + gen.statementToCode(block, "DO" + n) + "}";
    n++;
  } while (block.getInput("IF" + n));
  if (block.getInput("ELSE")) code += " else {\n" + gen.statementToCode(block, "ELSE") + "}";
  return code + "\n";
};

java.forBlock["controls_repeat_ext"] = function (block, gen) {
  const times = gen.valueToCode(block, "TIMES", O.RELATIONAL) || "0";
  const i = gen.nameDB_.getDistinctName("count", Blockly.Names.NameType.VARIABLE);
  return `for (int ${i} = 0; ${i} < ${times}; ${i}++) {\n` + gen.statementToCode(block, "DO") + "}\n";
};

java.forBlock["controls_whileUntil"] = function (block, gen) {
  const until = block.getFieldValue("MODE") === "UNTIL";
  let cond = gen.valueToCode(block, "BOOL", until ? O.UNARY : O.NONE) || "false";
  if (until) cond = "!" + cond;
  return `while (${cond}) {\n` + gen.statementToCode(block, "DO") + "}\n";
};

java.forBlock["logic_compare"] = function (block, gen) {
  const op = { EQ: "==", NEQ: "!=", LT: "<", LTE: "<=", GT: ">", GTE: ">=" }[block.getFieldValue("OP")];
  const order = op === "==" || op === "!=" ? O.EQUALITY : O.RELATIONAL;
  const a = gen.valueToCode(block, "A", order) || "0";
  const b = gen.valueToCode(block, "B", order) || "0";
  return [`${a} ${op} ${b}`, order];
};

java.forBlock["logic_operation"] = function (block, gen) {
  const and = block.getFieldValue("OP") === "AND";
  const order = and ? O.AND : O.OR;
  const a = gen.valueToCode(block, "A", order) || "false";
  const b = gen.valueToCode(block, "B", order) || "false";
  return [`${a} ${and ? "&&" : "||"} ${b}`, order];
};

java.forBlock["logic_negate"] = function (block, gen) {
  return ["!" + (gen.valueToCode(block, "BOOL", O.UNARY) || "true"), O.UNARY];
};

java.forBlock["logic_boolean"] = (block) => [block.getFieldValue("BOOL") === "TRUE" ? "true" : "false", O.ATOMIC];

java.forBlock["math_number"] = function (block) {
  const n = Number(block.getFieldValue("NUM"));
  return [String(n), n < 0 ? O.UNARY : O.ATOMIC];
};

java.forBlock["math_arithmetic"] = function (block, gen) {
  const op = block.getFieldValue("OP");
  if (op === "POWER") {
    const a = gen.valueToCode(block, "A", O.NONE) || "0";
    const b = gen.valueToCode(block, "B", O.NONE) || "0";
    return [`Math.pow(${a}, ${b})`, O.CALL];
  }
  const [sym, order] = { ADD: ["+", O.ADDITIVE], MINUS: ["-", O.ADDITIVE], MULTIPLY: ["*", O.MULTIPLICATIVE], DIVIDE: ["/", O.MULTIPLICATIVE] }[op];
  let a = gen.valueToCode(block, "A", order) || "0";
  const b = gen.valueToCode(block, "B", order - 0.5) || "0"; // a - (b - c) keeps its parentheses
  if (op === "DIVIDE" && isIntLiteral(a)) a += ".0"; // 1 / 2 would be 0 in Java
  return [`${a} ${sym} ${b}`, order];
};

java.forBlock["text"] = (block) => [JSON.stringify(block.getFieldValue("TEXT")), O.ATOMIC];

java.forBlock["variables_get"] = (block, gen) => [varName(gen, block), O.ATOMIC];

java.forBlock["variables_set"] = function (block, gen) {
  return `${varName(gen, block)} = ${gen.valueToCode(block, "VALUE", O.ASSIGNMENT) || "0"};\n`;
};

java.forBlock["math_change"] = function (block, gen) {
  return `${varName(gen, block)} += ${gen.valueToCode(block, "DELTA", O.ASSIGNMENT) || "0"};\n`;
};

/** {code, className} from the workspace's OpMode block, or {error}. */
export function generate(workspace) {
  const shells = workspace.getTopBlocks(true).filter((b) => b.type === "ftc_opmode" && b.isEnabled());
  if (shells.length === 0) return { error: "Add the OpMode block (in OpMode) and put your blocks inside it." };
  java.init(workspace);
  const code = java.blockToCode(shells[0]);
  return { code, className: shells[0].getFieldValue("CLASS"), name: shells[0].getFieldValue("NAME") };
}

// ---------------------------------------------------------------- toolbox

const num = (n) => ({ shadow: { type: "math_number", fields: { NUM: n } } });

export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category", name: "OpMode", colour: HUE.opmode, contents: [
        { kind: "block", type: "ftc_opmode" },
        { kind: "block", type: "ftc_sleep", inputs: { MS: num(1000) } },
        { kind: "block", type: "ftc_opmode_active" },
      ],
    },
    {
      kind: "category", name: "Motors", colour: HUE.motor, contents: [
        { kind: "block", type: "ftc_motor_set_power", inputs: { POWER: num(0.5) } },
        { kind: "block", type: "ftc_motor_set_direction" },
        { kind: "block", type: "ftc_motor_get_position" },
      ],
    },
    {
      kind: "category", name: "Telemetry", colour: HUE.telemetry, contents: [
        { kind: "block", type: "ftc_telemetry_add_data", inputs: { VALUE: { shadow: { type: "text", fields: { TEXT: "hello" } } } } },
        { kind: "block", type: "ftc_telemetry_update" },
      ],
    },
    {
      kind: "category", name: "Logic", categorystyle: "logic_category", contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_if", extraState: { hasElse: true } },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      kind: "category", name: "Loops", categorystyle: "loop_category", contents: [
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: num(4) } },
        { kind: "block", type: "controls_whileUntil" },
      ],
    },
    {
      kind: "category", name: "Math", categorystyle: "math_category", contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic", inputs: { A: num(1), B: num(1) } },
      ],
    },
    {
      kind: "category", name: "Text", categorystyle: "text_category", contents: [{ kind: "block", type: "text" }],
    },
    { kind: "category", name: "Variables", categorystyle: "variable_category", custom: "VARIABLE" },
  ],
};

/** New workspace for students who haven't used Blocks yet: just the OpMode block. */
export const STARTER = {
  blocks: { languageVersion: 0, blocks: [{ type: "ftc_opmode", x: 20, y: 20 }] },
};

export default Blockly;

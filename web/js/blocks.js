// Blocks mode: drag-and-drop blocks (Blockly) that generate a real FTC OpMode in Java.
// Labels and layout follow FTC Blocks so students recognize them; the block definitions,
// colors and Java generator are written for this project.
import Blockly from "../vendor/blockly.js?v=20261112f";

const MOTORS = [["frontLeft", "frontLeft"], ["frontRight", "frontRight"], ["backLeft", "backLeft"], ["backRight", "backRight"]];
const MOTOR_ORDER = MOTORS.map((m) => m[0]);

export const COLOR = {
  opmode: "#995BA5",    // LinearOpMode, runOpMode and Telemetry (purple, like FTC Blocks)
  motor: "#5BA58C",     // DcMotor (green-teal)
  constant: "#A5745B",  // Direction values (brown)
  telemetry: "#995BA5", // Telemetry (purple)
  misc: "#5B80A5",      // comment (blue-gray)
};

export const RUNOPMODE_COMMENT = "This function is executed when this Op Mode is selected from the Driver Station.";

/** A name shown in a light rounded box, like the identifiers in FTC Blocks ("call [MyOpMode] . [waitForStart]"). */
class FieldBox extends Blockly.FieldLabel {
  initView() {
    this.createBorderRect_();
    this.createTextElement_();
    Blockly.utils.dom.addClass(this.fieldGroup_, "ftcBox");
  }
}
Blockly.fieldRegistry.register("field_box", class extends FieldBox {
  static fromJson(options) { return new this(Blockly.utils.parsing.replaceMessageReferences(options.text)); }
});

// ---------------------------------------------------------------- OpMode name shown in "call <name>.waitForStart"

let opModeName = "My OpMode";

/** Updates the OpMode name shown on the LinearOpMode blocks. */
export function setOpModeName(workspace, name) {
  opModeName = name || "My OpMode";
  if (!workspace) return;
  for (const b of workspace.getAllBlocks(false)) {
    const f = b.getField("OPMODE");
    if (f) f.setValue(opModeName);
  }
}

/** Class name from the OpMode name, like FTC Blocks: letters, digits and _ only. */
export function className(name) {
  let s = String(name || "").replace(/[^A-Za-z0-9_$]/g, "");
  if (!s) s = "MyOpMode";
  if (/^[0-9]/.test(s)) s = "_" + s;
  return s;
}

// ---------------------------------------------------------------- block definitions

const callBlock = (type, method, opts) => {
  Blockly.Blocks[type] = {
    init() {
      const row = this.appendDummyInput().appendField("call").appendField(new FieldBox(opModeName), "OPMODE")
        .appendField(".").appendField(new FieldBox(method));
      if (opts.input) this.appendValueInput(opts.input).setCheck("Number").appendField(opts.inputLabel);
      if (opts.output) this.setOutput(true, opts.output);
      else {
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      }
      this.setInputsInline(true);
      this.setColour(COLOR.opmode);
      this.setTooltip(opts.tooltip);
      return row;
    },
  };
};

Blockly.Blocks["ftc_runopmode"] = {
  init() {
    this.appendDummyInput().appendField("to").appendField(new FieldBox("runOpMode"));
    this.appendStatementInput("DO");
    this.setColour(COLOR.opmode);
    this.setTooltip("This function is executed when this Op Mode is selected from the Driver Station.");
    this.setDeletable(false);
  },
};

callBlock("ftc_waitforstart", "waitForStart", { tooltip: "Wait until PLAY is pressed on the Driver Station." });
callBlock("ftc_opmodeisactive", "opModeIsActive", { output: "Boolean", tooltip: "True after PLAY until STOP." });
callBlock("ftc_idle", "idle", { tooltip: "Let the robot controller do other work for a moment." });
callBlock("ftc_sleep", "sleep", { input: "MS", inputLabel: "milliseconds", tooltip: "Wait this many milliseconds (1000 ms = 1 second)." });

// set motor.[Power|Direction]: the value socket takes a number or a Direction to match.
Blockly.Extensions.register("ftc_motor_prop_check", function () {
  const update = (prop) => this.getInput("VALUE").setCheck(prop === "Direction" ? "Direction" : "Number");
  this.getField("PROP").setValidator((v) => { update(v); return v; });
  update(this.getFieldValue("PROP"));
});

Blockly.common.defineBlocksWithJsonArray([
  {
    type: "ftc_motor_set_power",
    message0: "set %1 .Power to %2",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null, nextStatement: null, inputsInline: true,
    colour: COLOR.motor,
    tooltip: "Motor power from -1 (full reverse) to 1 (full forward).",
  },
  {
    type: "ftc_motor_set_direction",
    message0: "set %1 .Direction to %2",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "input_value", name: "VALUE", check: "Direction" },
    ],
    previousStatement: null, nextStatement: null, inputsInline: true,
    colour: COLOR.motor,
    tooltip: "REVERSE flips which way positive power turns the motor.",
  },
  {
    type: "ftc_motor_get",
    message0: "%1 . %2",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "field_dropdown", name: "PROP", options: [["CurrentPosition", "CurrentPosition"], ["Power", "Power"]] },
    ],
    output: "Number",
    colour: COLOR.motor,
    tooltip: "CurrentPosition: the motor's encoder count. Power: the power it was last set to.",
  },
  {
    type: "ftc_direction",
    message0: "Direction %1",
    args0: [{ type: "field_dropdown", name: "DIR", options: [["REVERSE", "REVERSE"], ["FORWARD", "FORWARD"]] }],
    output: "Direction",
    colour: COLOR.constant,
    tooltip: "A motor direction.",
  },
  {
    type: "ftc_motor_set",
    message0: "set %1 . %2 to %3",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: MOTORS },
      { type: "field_dropdown", name: "PROP", options: [["Power", "Power"], ["Direction", "Direction"]] },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null, nextStatement: null, inputsInline: true,
    colour: COLOR.motor,
    extensions: ["ftc_motor_prop_check"],
    tooltip: "Power: -1 (full reverse) to 1 (full forward). Direction: REVERSE flips which way positive power turns the motor.",
  },
  {
    type: "ftc_telemetry_adddata_number",
    message0: "call %1 . %2 %3 key %4 number %5",
    args0: [
      { type: "field_box", text: "Telemetry" }, { type: "field_box", text: "addData" },
      { type: "input_dummy" },
      { type: "input_value", name: "KEY", check: "String", align: "RIGHT" },
      { type: "input_value", name: "VALUE", check: "Number", align: "RIGHT" },
    ],
    previousStatement: null, nextStatement: null,
    colour: COLOR.telemetry,
    tooltip: "Add a line with a number to the Driver Station. It shows after Telemetry.update.",
  },
  {
    type: "ftc_telemetry_adddata_text",
    message0: "call %1 . %2 %3 key %4 text %5",
    args0: [
      { type: "field_box", text: "Telemetry" }, { type: "field_box", text: "addData" },
      { type: "input_dummy" },
      { type: "input_value", name: "KEY", check: "String", align: "RIGHT" },
      { type: "input_value", name: "VALUE", check: "String", align: "RIGHT" },
    ],
    previousStatement: null, nextStatement: null,
    colour: COLOR.telemetry,
    tooltip: "Add a line with text to the Driver Station. It shows after Telemetry.update.",
  },
  {
    type: "ftc_note",
    message0: "%1",
    args0: [{ type: "field_input", name: "TEXT", text: "comment" }],
    previousStatement: null, nextStatement: null,
    colour: COLOR.misc,
    tooltip: "A comment for people reading the program. It does nothing.",
  },
  {
    type: "ftc_telemetry_adddata",
    message0: "call Telemetry.addData %1 key %2 value %3",
    args0: [
      { type: "input_dummy" },
      { type: "input_value", name: "KEY", check: "String", align: "RIGHT" },
      { type: "input_value", name: "VALUE", align: "RIGHT" },
    ],
    previousStatement: null, nextStatement: null,
    colour: COLOR.telemetry,
    tooltip: "Add a line to the Driver Station. It shows after Telemetry.update.",
  },
  {
    type: "ftc_telemetry_update",
    message0: "call %1 . %2",
    args0: [{ type: "field_box", text: "Telemetry" }, { type: "field_box", text: "update" }],
    previousStatement: null, nextStatement: null,
    colour: COLOR.telemetry,
    tooltip: "Send the telemetry lines to the Driver Station.",
  },
  {
    type: "ftc_comment",
    message0: "// %1",
    args0: [{ type: "field_input", name: "TEXT", text: "comment" }],
    previousStatement: null, nextStatement: null,
    colour: COLOR.misc,
    tooltip: "A note for people reading the code. It does nothing.",
  },
]);

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
  "frontLeft,frontRight,backLeft,backRight,DcMotor,LinearOpMode,TeleOp,Autonomous,runOpMode,waitForStart,opModeIsActive",
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
const motor = (gen, block) => {
  const m = block.getFieldValue("MOTOR");
  gen.motorsUsed.add(m);
  return m;
};

java.forBlock["ftc_runopmode"] = (block, gen) => gen.statementToCode(block, "DO");
java.forBlock["ftc_waitforstart"] = () => "waitForStart();\n";
java.forBlock["ftc_opmodeisactive"] = () => ["opModeIsActive()", O.CALL];
java.forBlock["ftc_idle"] = () => "idle();\n";
java.forBlock["ftc_sleep"] = function (block, gen) {
  const ms = gen.valueToCode(block, "MS", O.NONE) || "0";
  return isIntLiteral(ms) ? `sleep(${ms});\n` : `sleep((long) (${ms}));\n`;
};
java.forBlock["ftc_motor_set_power"] = (block, gen) =>
  `${motor(gen, block)}.setPower(${gen.valueToCode(block, "VALUE", O.NONE) || "0"});\n`;
java.forBlock["ftc_motor_set_direction"] = (block, gen) =>
  `${motor(gen, block)}.setDirection(${gen.valueToCode(block, "VALUE", O.NONE) || "DcMotor.Direction.FORWARD"});\n`;
java.forBlock["ftc_motor_get"] = (block, gen) =>
  [`${motor(gen, block)}.get${block.getFieldValue("PROP")}()`, O.CALL];
java.forBlock["ftc_direction"] = (block) => [`DcMotor.Direction.${block.getFieldValue("DIR")}`, O.ATOMIC];
java.forBlock["ftc_telemetry_adddata"] = (block, gen) =>
  `telemetry.addData(${gen.valueToCode(block, "KEY", O.NONE) || '"key"'}, ${gen.valueToCode(block, "VALUE", O.NONE) || '""'});\n`;
java.forBlock["ftc_telemetry_update"] = () => "telemetry.update();\n";
java.forBlock["ftc_motor_set"] = function (block, gen) {
  const m = motor(gen, block);
  const v = gen.valueToCode(block, "VALUE", O.NONE);
  return block.getFieldValue("PROP") === "Direction"
    ? `${m}.setDirection(${v || "DcMotor.Direction.FORWARD"});\n`
    : `${m}.setPower(${v || "0"});\n`;
};
java.forBlock["ftc_telemetry_adddata_number"] = java.forBlock["ftc_telemetry_adddata"];
java.forBlock["ftc_telemetry_adddata_text"] = java.forBlock["ftc_telemetry_adddata"];
java.forBlock["ftc_note"] = (block) => "// " + block.getFieldValue("TEXT") + "\n";
java.forBlock["ftc_comment"] = (block) => "// " + block.getFieldValue("TEXT") + "\n";

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

java.forBlock["logic_negate"] = (block, gen) => ["!" + (gen.valueToCode(block, "BOOL", O.UNARY) || "true"), O.UNARY];
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
java.forBlock["variables_set"] = (block, gen) =>
  `${varName(gen, block)} = ${gen.valueToCode(block, "VALUE", O.ASSIGNMENT) || "0"};\n`;
java.forBlock["math_change"] = (block, gen) =>
  `${varName(gen, block)} += ${gen.valueToCode(block, "DELTA", O.ASSIGNMENT) || "0"};\n`;

/** {code, className} for the runOpMode block, or {error}. name / kind come from the Op Mode Name row. */
export function generate(workspace, name, kind) {
  const root = workspace.getTopBlocks(true).find((b) => b.type === "ftc_runopmode" && b.isEnabled());
  if (!root) return { error: 'Add the "to runOpMode" block (in LinearOpMode) and put your blocks inside it.' };
  java.init(workspace);
  const body = java.blockToCode(root);
  const cls = className(name);
  const ind = (code, n) => java.prefixLines(code, java.INDENT.repeat(n));

  const fields = MOTOR_ORDER.filter((m) => java.motorsUsed.has(m)).map((m) => `private DcMotor ${m};\n`).join("");
  let setup = MOTOR_ORDER.filter((m) => java.motorsUsed.has(m))
    .map((m) => `${m} = hardwareMap.get(DcMotor.class, "${m}");\n`).join("");
  setup += Blockly.Variables.allUsedVarModels(workspace)
    .map((v) => `double ${java.nameDB_.getName(v.getId(), Blockly.Names.NameType.VARIABLE)} = 0;\n`).join("");

  const file =
    "package org.firstinspires.ftc.teamcode;\n\n" +
    "import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;\n" +
    `import com.qualcomm.robotcore.eventloop.opmode.${kind};\n` +
    "import com.qualcomm.robotcore.hardware.DcMotor;\n\n" +
    `@${kind}(name = ${JSON.stringify(name)})\n` +
    `public class ${cls} extends LinearOpMode {\n\n` +
    (fields ? ind(fields, 1) + "\n" : "") +
    "    /**\n" +
    java.prefixLines((root.getCommentText() || RUNOPMODE_COMMENT).trim(), "     * ") + "\n" +
    "     */\n" +
    "    @Override\n" +
    "    public void runOpMode() {\n" +
    (setup ? ind(setup, 2) + "\n" : "") +
    ind(body.replace(/^ {4}/gm, ""), 2) +
    "    }\n" +
    "}\n";
  return { code: file.replace(/[ \t]+$/gm, ""), className: cls };
}

// ---------------------------------------------------------------- toolbox (FTC Blocks category names)

const num = (n) => ({ shadow: { type: "math_number", fields: { NUM: n } } });
const txt = (t) => ({ block: { type: "text", fields: { TEXT: t } } });

export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category", name: "LinearOpMode", contents: [
        { kind: "block", type: "ftc_waitforstart" },
        { kind: "block", type: "ftc_opmodeisactive" },
        { kind: "block", type: "ftc_sleep", inputs: { MS: num(1000) } },
        { kind: "block", type: "ftc_idle" },
      ],
    },
    {
      kind: "category", name: "Actuators", contents: [
        {
          kind: "category", name: "DcMotor", contents: [
            { kind: "block", type: "ftc_motor_set", fields: { PROP: "Power" }, inputs: { VALUE: num(1) } },
            { kind: "block", type: "ftc_motor_set", fields: { PROP: "Direction" }, inputs: { VALUE: { block: { type: "ftc_direction" } } } },
            { kind: "block", type: "ftc_motor_get" },
            { kind: "block", type: "ftc_direction" },
          ],
        },
      ],
    },
    {
      kind: "category", name: "Utilities", contents: [
        {
          kind: "category", name: "Telemetry", contents: [
            { kind: "block", type: "ftc_telemetry_adddata_number", inputs: { KEY: txt("key"), VALUE: num(123) } },
            { kind: "block", type: "ftc_telemetry_adddata_text", inputs: { KEY: txt("key"), VALUE: txt("text") } },
            { kind: "block", type: "ftc_telemetry_update" },
          ],
        },
      ],
    },
    { kind: "sep" },
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
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: num(10) } },
        { kind: "block", type: "controls_whileUntil" },
      ],
    },
    {
      kind: "category", name: "Math", categorystyle: "math_category", contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic", inputs: { A: num(1), B: num(1) } },
      ],
    },
    { kind: "category", name: "Text", categorystyle: "text_category", contents: [{ kind: "block", type: "text" }] },
    { kind: "category", name: "Variables", categorystyle: "variable_category", custom: "VARIABLE" },
    { kind: "category", name: "Miscellaneous", colour: COLOR.misc, contents: [{ kind: "block", type: "ftc_note" }] },
  ],
};

// ---------------------------------------------------------------- starter program (like a new FTC Blocks Op Mode)

const comment = (t, next) => ({ type: "ftc_note", fields: { TEXT: t }, ...(next ? { next: { block: next } } : {}) });
/** The runOpMode block's comment balloon, open like in FTC Blocks. */
export const RUNOPMODE_ICONS = { comment: { text: RUNOPMODE_COMMENT, pinned: true, height: 58, width: 330 } };
const active = () => ({ block: { type: "ftc_opmodeisactive" } });

export const STARTER = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: "ftc_runopmode", x: 30, y: 80, icons: RUNOPMODE_ICONS,
      inputs: {
        DO: {
          block: comment("Put initialization blocks here.", {
            type: "ftc_waitforstart",
            next: {
              block: {
                type: "controls_if",
                inputs: {
                  IF0: active(),
                  DO0: {
                    block: comment("Put run blocks here.", {
                      type: "controls_whileUntil",
                      fields: { MODE: "WHILE" },
                      inputs: {
                        BOOL: active(),
                        DO: { block: comment("Put loop blocks here.", { type: "ftc_telemetry_update" }) },
                      },
                    }),
                  },
                },
              },
            },
          }),
        },
      },
    }],
  },
};

export default Blockly;

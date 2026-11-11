package org.nycfirst.opmodesimweb;

import java.io.OutputStream;
import java.io.PrintStream;
import java.util.List;
import org.nycfirst.opmodesim.OpModeCompiler;
import org.nycfirst.opmodesim.OpModeRunner;
import org.nycfirst.opmodesim.OpModeSim;
import org.nycfirst.opmodesim.SimMotor;

/**
 * Web-only bridge: the page calls these statics through CheerpJ library mode.
 * All sim logic lives in the unchanged org.nycfirst.opmodesim classes.
 */
public final class WebBridge {

  private static final OpModeSim SIM = new OpModeSim();

  static {
    // OpModeSim prints build output; the page shows its own messages.
    SIM.setOutput(new PrintStream(new OutputStream() {
      @Override public void write(int b) {}
    }));
  }

  private WebBridge() {}

  /** Compiles and loads. Returns JSON: {ok, name, kind, ms, problems:[{line, column, message}]}. */
  public static String build(String fileName, String source) {
    long t0 = System.currentTimeMillis();
    OpModeCompiler.Result r = SIM.build(fileName, source);
    long ms = System.currentTimeMillis() - t0;
    StringBuilder sb = new StringBuilder("{\"ok\":").append(r.ok);
    sb.append(",\"name\":").append(str(r.opModeName));
    sb.append(",\"kind\":").append(str(r.ok ? SIM.runner.opModeKind() : null));
    sb.append(",\"ms\":").append(ms);
    sb.append(",\"problems\":[");
    List<OpModeCompiler.Problem> ps = r.problems;
    for (int i = 0; i < ps.size(); i++) {
      OpModeCompiler.Problem p = ps.get(i);
      if (i > 0) sb.append(',');
      sb.append("{\"line\":").append(p.line).append(",\"column\":").append(p.column)
          .append(",\"message\":").append(str(p.message)).append('}');
    }
    return sb.append("]}").toString();
  }

  public static void init() { SIM.init(); }

  public static void play() { SIM.play(); }

  public static void stop() { SIM.stop(); }

  /** One frame of state for the page, as JSON. */
  public static String snapshot() {
    StringBuilder sb = new StringBuilder("{\"state\":").append(str(SIM.runner.state().name()));
    sb.append(",\"error\":").append(str(SIM.runner.error()));
    sb.append(",\"telemetryCount\":").append(SIM.telemetry.publishCount());
    sb.append(",\"motors\":[");
    for (int i = 0; i < SIM.motors.length; i++) {
      SimMotor m = SIM.motors[i];
      if (i > 0) sb.append(',');
      sb.append("{\"name\":").append(str(m.name()))
          .append(",\"port\":").append(m.getPortNumber())
          .append(",\"power\":").append(m.getPower())
          .append(",\"spin\":").append(m.wheelSpin())
          .append(",\"enc\":").append(m.getCurrentPosition())
          .append(",\"dir\":").append(str(m.getDirection().name()))
          .append('}');
    }
    sb.append("],\"telemetry\":[");
    List<String> lines = SIM.telemetry.lines();
    for (int i = 0; i < lines.size(); i++) {
      if (i > 0) sb.append(',');
      sb.append(str(lines.get(i)));
    }
    sb.append("],\"events\":[");
    boolean first = true;
    for (String e; (e = SIM.runner.pollMessage()) != null; ) {
      if (!first) sb.append(',');
      sb.append(str(e));
      first = false;
    }
    return sb.append("]}").toString();
  }

  private static String str(String s) {
    if (s == null) return "null";
    StringBuilder sb = new StringBuilder(s.length() + 2).append('"');
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"': sb.append("\\\""); break;
        case '\\': sb.append("\\\\"); break;
        case '\n': sb.append("\\n"); break;
        case '\r': sb.append("\\r"); break;
        case '\t': sb.append("\\t"); break;
        default:
          if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
          else sb.append(c);
      }
    }
    return sb.append('"').toString();
  }
}

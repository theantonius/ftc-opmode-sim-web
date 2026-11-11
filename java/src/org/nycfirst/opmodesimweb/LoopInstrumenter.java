package org.nycfirst.opmodesimweb;

import com.sun.source.tree.BlockTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.DoWhileLoopTree;
import com.sun.source.tree.EnhancedForLoopTree;
import com.sun.source.tree.ForLoopTree;
import com.sun.source.tree.StatementTree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.Trees;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

/**
 * Web-only. Adds a call to Yield.tick() at the top of every loop body so a
 * busy loop can't freeze the browser tab. Inserts text only, never newlines,
 * so javac line numbers stay the same as the student's file.
 */
public final class LoopInstrumenter {

  private LoopInstrumenter() {}

  static final String CALL = "org.nycfirst.opmodesimweb.Yield.tick();";

  private static final class Insert {
    final long pos;
    final String text;
    final int order; // at the same position: closing braces before opening ones

    Insert(long pos, String text, int order) {
      this.pos = pos;
      this.text = text;
      this.order = order;
    }
  }

  /** Returns the instrumented source, or null if it doesn't parse (then compile the original to get real errors). */
  public static String instrument(String fileName, final String source) {
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    if (compiler == null) return null;
    DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
    JavaFileObject src = new SimpleJavaFileObject(URI.create("string:///" + fileName), JavaFileObject.Kind.SOURCE) {
      @Override public CharSequence getCharContent(boolean ignoreEncodingErrors) { return source; }
    };
    try {
      JavacTask task = (JavacTask) compiler.getTask(null, null, diags, Arrays.asList("-proc:none"), null,
          Collections.singletonList(src));
      Iterable<? extends CompilationUnitTree> units = task.parse();
      for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) {
        if (d.getKind() == Diagnostic.Kind.ERROR) return null;
      }
      final SourcePositions pos = Trees.instance(task).getSourcePositions();
      final List<Insert> inserts = new ArrayList<>();
      for (final CompilationUnitTree unit : units) {
        new TreeScanner<Void, Void>() {
          void body(StatementTree b) {
            if (b == null) return;
            long start = pos.getStartPosition(unit, b);
            long end = pos.getEndPosition(unit, b);
            if (start < 0 || end < 0) return;
            if (b instanceof BlockTree) {
              inserts.add(new Insert(start + 1, " " + CALL, 1)); // just after '{'
            } else {
              inserts.add(new Insert(start, "{ " + CALL + " ", 1));
              inserts.add(new Insert(end, " }", 0));
            }
          }

          @Override public Void visitWhileLoop(WhileLoopTree t, Void v) { body(t.getStatement()); return super.visitWhileLoop(t, v); }
          @Override public Void visitDoWhileLoop(DoWhileLoopTree t, Void v) { body(t.getStatement()); return super.visitDoWhileLoop(t, v); }
          @Override public Void visitForLoop(ForLoopTree t, Void v) { body(t.getStatement()); return super.visitForLoop(t, v); }
          @Override public Void visitEnhancedForLoop(EnhancedForLoopTree t, Void v) { body(t.getStatement()); return super.visitEnhancedForLoop(t, v); }
        }.scan(unit, null);
      }
      // Apply from the end so earlier positions stay valid.
      Collections.sort(inserts, (a, b) -> a.pos != b.pos ? Long.compare(b.pos, a.pos) : Integer.compare(b.order, a.order));
      StringBuilder sb = new StringBuilder(source);
      for (Insert in : inserts) sb.insert((int) in.pos, in.text);
      return sb.toString();
    } catch (Throwable e) {
      return null;
    }
  }
}

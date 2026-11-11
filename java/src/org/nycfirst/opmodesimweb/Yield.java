package org.nycfirst.opmodesimweb;

/**
 * Web-only. CheerpJ runs Java threads on the page's main thread and can't
 * preempt them, so a loop that never sleeps (while (true) {}) would freeze
 * the tab. LoopInstrumenter puts a call to tick() at the top of every loop
 * body in the student's OpMode (the student never sees it; downloads are the
 * original file).
 *
 * tick() sleeps 1 ms after every ~8 ms of busy work so the page can redraw.
 * If the thread ignores STOP for longer than the sim's 5 s stuck timeout,
 * tick() ends it the same way STOP ends a well-behaved OpMode (an
 * InterruptedException), standing in for the real robot restarting the app.
 */
public final class Yield {

  private Yield() {}

  private static final long SLICE_NANOS = 8_000_000L;
  /** A little longer than OpModeRunner's 5 s stop timeout, so its "stuck" message shows first. */
  private static final long KILL_AFTER_NANOS = 5_300_000_000L;

  private static final ThreadLocal<long[]> STATE = ThreadLocal.withInitial(() -> new long[] {System.nanoTime(), 0});

  public static void tick() {
    long[] s = STATE.get(); // s[0] = last yield, s[1] = when the interrupt (STOP) was first seen
    long now = System.nanoTime();
    Thread t = Thread.currentThread();
    if (t.isInterrupted()) {
      if (s[1] == 0) s[1] = now;
      else if (now - s[1] > KILL_AFTER_NANOS) {
        s[1] = 0;
        Yield.<RuntimeException>sneakyThrow(new InterruptedException("OpMode ignored STOP; ended by the sim"));
      }
    }
    if (now - s[0] < SLICE_NANOS) return;
    // Thread.sleep throws at once if the interrupt flag is set, so clear it, sleep, then restore it.
    boolean interrupted = Thread.interrupted();
    try {
      Thread.sleep(1);
    } catch (InterruptedException e) {
      interrupted = true;
    }
    if (interrupted) t.interrupt();
    s[0] = System.nanoTime();
  }

  @SuppressWarnings("unchecked")
  private static <T extends Throwable> void sneakyThrow(Throwable e) throws T {
    throw (T) e;
  }
}

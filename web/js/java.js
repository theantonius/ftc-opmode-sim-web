// Java side of the sim, run by CheerpJ (Java 17 runtime) in library mode.
// All sim logic is the Processing version's Java, unchanged; WebBridge returns JSON.

const base = location.pathname.replace(/[^/]*$/, ""); // folder of index.html
const CLASSPATH = "/app" + base + "sim.jar";

let bridge = null;
let queue = Promise.resolve();
let busy = 0;

/** CheerpJ allows one Java call at a time from JS: every call goes through here. */
function call(fn) {
  busy++;
  const p = queue.then(fn);
  queue = p.catch(() => {}).then(() => { busy--; });
  return p;
}

export async function start() {
  await cheerpjInit({ version: 17, status: "none" });
  const lib = await cheerpjRunLibrary(CLASSPATH);
  bridge = await lib.org.nycfirst.opmodesimweb.WebBridge;
}

export const ready = () => bridge !== null;

/** {ok, name, kind, ms, problems: [{line, column, message}]} */
export async function build(fileName, source) {
  return JSON.parse(await call(() => bridge.build(fileName, source)));
}

export const init = () => call(() => bridge.init());
export const play = () => call(() => bridge.play());
export const stop = () => call(() => bridge.stop());

/** Latest sim state, refreshed by poll(). */
export let snap = null;
let polling = false;

/** Call every frame; skips when Java is busy so the page never waits. */
export async function poll() {
  if (!bridge || polling || busy > 0) return;
  polling = true;
  try {
    snap = JSON.parse(await call(() => bridge.snapshot()));
  } finally {
    polling = false;
  }
}

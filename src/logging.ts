import { redact } from './config.js';
let installed = false;
export function installRedactedLogging() {
  if (installed) return; installed = true;
  for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => original(...args.map(arg => redact(arg instanceof Error ? arg.message : arg)));
  }
}

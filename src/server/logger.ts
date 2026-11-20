const SENSITIVE_KEY_PATTERN = /password|passwordhash|secret|token|authorization|cookie|api[_-]?key/i;

/** Recursively redacts any object key matching a known-sensitive name, so a logged payload or error context never leaks a credential even if one is accidentally included in it. */
function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redact(val, seen);
    }
    return out;
  }
  return value;
}

/** The one place server code should log through — console.log/error directly risks printing a secret that ends up nested in whatever's passed as context. */
export const logger = {
  info(message: string, context?: unknown): void {
    console.log(message, ...(context !== undefined ? [redact(context)] : []));
  },
  warn(message: string, context?: unknown): void {
    console.warn(message, ...(context !== undefined ? [redact(context)] : []));
  },
  error(message: string, context?: unknown): void {
    console.error(message, ...(context !== undefined ? [redact(context)] : []));
  },
};

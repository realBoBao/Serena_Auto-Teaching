// ponytail: tracing stub — no-op spans, upgrade: add OpenTelemetry or similar
export function startSpan(name) { return { name, id: generateTraceId() }; }
export function endSpan(span) { /* no-op */ }
export function generateTraceId() { return Math.random().toString(36).slice(2, 10); }

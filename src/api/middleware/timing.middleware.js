// Response Timing & Latency Header Middleware
export async function timingMiddleware(c, next) {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  c.header("X-Response-Time", `${ms}ms`);
}

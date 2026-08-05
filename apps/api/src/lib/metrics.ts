import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
};

type MinuteBucket = {
  minute: string;
  requests: number;
  errors: number;
};

const byRoute = new Map<string, Bucket>();
const recentMinutes: MinuteBucket[] = [];
const MAX_MINUTE_BUCKETS = 60 * 24; // 24h
const startedAt = Date.now();

function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/c[a-z0-9]{20,}/gi, "/:id")
    .replace(/\/[0-9]+/g, "/:id")
    .split("?")[0]
    .slice(0, 120);
}

function currentMinuteKey() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

function bumpMinute(isError: boolean) {
  const key = currentMinuteKey();
  let bucket = recentMinutes[recentMinutes.length - 1];
  if (!bucket || bucket.minute !== key) {
    bucket = { minute: key, requests: 0, errors: 0 };
    recentMinutes.push(bucket);
    while (recentMinutes.length > MAX_MINUTE_BUCKETS) recentMinutes.shift();
  }
  bucket.requests += 1;
  if (isError) bucket.errors += 1;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/metrics" || req.path === "/health") {
    return next();
  }
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const route = `${req.method} ${normalizePath(req.path)}`;
    const isError = res.statusCode >= 400;
    const existing = byRoute.get(route) ?? {
      count: 0,
      errors: 0,
      totalMs: 0,
      maxMs: 0,
    };
    existing.count += 1;
    if (isError) existing.errors += 1;
    existing.totalMs += ms;
    existing.maxMs = Math.max(existing.maxMs, ms);
    byRoute.set(route, existing);
    bumpMinute(isError);
  });
  next();
}

export function getTrafficSummary() {
  const routes = [...byRoute.entries()]
    .map(([route, b]) => ({
      route,
      count: b.count,
      errors: b.errors,
      avgMs: b.count ? Math.round((b.totalMs / b.count) * 100) / 100 : 0,
      maxMs: Math.round(b.maxMs * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const totalRequests = routes.reduce((s, r) => s + r.count, 0);
  const totalErrors = routes.reduce((s, r) => s + r.errors, 0);
  const lastHour = recentMinutes.slice(-60);
  const lastHourRequests = lastHour.reduce((s, m) => s + m.requests, 0);
  const lastHourErrors = lastHour.reduce((s, m) => s + m.errors, 0);

  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests,
    totalErrors,
    errorRate: totalRequests ? totalErrors / totalRequests : 0,
    lastHourRequests,
    lastHourErrors,
    timeline: lastHour,
    topRoutes: routes.slice(0, 50),
  };
}

export function renderPrometheusMetrics(): string {
  const startSec = Math.floor(startedAt / 1000);
  const lines: string[] = [
    "# HELP ai_assistant_up API process up",
    "# TYPE ai_assistant_up gauge",
    "ai_assistant_up 1",
    "# HELP ai_assistant_process_start_time_seconds Start time",
    "# TYPE ai_assistant_process_start_time_seconds gauge",
    `ai_assistant_process_start_time_seconds ${startSec}`,
    "# HELP ai_assistant_http_requests_total Total HTTP requests by route",
    "# TYPE ai_assistant_http_requests_total counter",
  ];

  for (const [route, b] of byRoute) {
    const [method, ...pathParts] = route.split(" ");
    const path = pathParts.join(" ");
    const labels = `method="${method}",path="${path.replace(/"/g, '\\"')}"`;
    lines.push(`ai_assistant_http_requests_total{${labels}} ${b.count}`);
  }

  lines.push(
    "# HELP ai_assistant_http_errors_total Total HTTP errors by route",
    "# TYPE ai_assistant_http_errors_total counter",
  );
  for (const [route, b] of byRoute) {
    const [method, ...pathParts] = route.split(" ");
    const path = pathParts.join(" ");
    const labels = `method="${method}",path="${path.replace(/"/g, '\\"')}"`;
    lines.push(`ai_assistant_http_errors_total{${labels}} ${b.errors}`);
  }

  lines.push(
    "# HELP ai_assistant_http_request_duration_ms_sum Total request duration ms",
    "# TYPE ai_assistant_http_request_duration_ms_sum counter",
  );
  for (const [route, b] of byRoute) {
    const [method, ...pathParts] = route.split(" ");
    const path = pathParts.join(" ");
    const labels = `method="${method}",path="${path.replace(/"/g, '\\"')}"`;
    lines.push(
      `ai_assistant_http_request_duration_ms_sum{${labels}} ${b.totalMs.toFixed(2)}`,
    );
  }

  return lines.join("\n") + "\n";
}

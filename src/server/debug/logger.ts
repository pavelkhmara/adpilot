import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogEvent = {
  ts: number;
  level: LogLevel;
  ctx?: string;            // произвольный контекст: "recs.emit", "api.tick", ...
  msg: string;
  data?: unknown;
  requestId?: string;
};

const isOn = () => process.env.DEBUG === "on";
const store = new AsyncLocalStorage<{ requestId: string }>();

// простая кольцевая память последних N событий
const MAX = 500;
const ring: LogEvent[] = [];
function push(ev: LogEvent) {
  if (!isOn()) return;
  if (ring.length >= MAX) ring.shift();
  ring.push(ev);
}

// публичный доступ к памяти (для /api/_debug/logs)
export function getLogs(filter?: { ctx?: string; level?: LogLevel; since?: number }) {
  if (!isOn()) return [];
  let out = ring.slice();
  if (filter?.since) out = out.filter(x => x.ts >= filter.since!);
  if (filter?.ctx) out = out.filter(x => x.ctx?.startsWith(filter.ctx!));
  if (filter?.level) out = out.filter(x => x.level === filter.level);
  return out;
}

// сам логгер
function _log(level: LogLevel, ctx: string | undefined, msg: string, data?: unknown) {
  if (!isOn()) return;
  const req = store.getStore();
  const ev: LogEvent = { ts: Date.now(), level, ctx, msg, data, requestId: req?.requestId };
  push(ev);
  // дублируем в консоль (коротко)
  const prefix = ctx ? `[${ctx}]` : "";
  // eslint-disable-next-line no-console
  console[level](`${new Date(ev.ts).toISOString()} ${prefix} ${msg}`, data ?? "");
}

export const logger = {
  debug: (ctx: string, msg: string, data?: unknown) => _log("debug", ctx, msg, data),
  info:  (ctx: string, msg: string, data?: unknown) => _log("info",  ctx, msg, data),
  warn:  (ctx: string, msg: string, data?: unknown) => _log("warn",  ctx, msg, data),
  error: (ctx: string, msg: string, data?: unknown) => _log("error", ctx, msg, data),
  // для ручных событий без контекста
  ev:    (level: LogLevel, msg: string, data?: unknown) => _log(level, undefined, msg, data),
  // обёртка запроса (создаёт requestId)
  runWithRequest<T>(requestId: string, fn: () => Promise<T>) {
    return store.run({ requestId }, fn);
  },
};

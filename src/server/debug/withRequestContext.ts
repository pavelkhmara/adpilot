import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export async function withRequestContext<T>(handler: () => Promise<T>) {
  const h = headers();
  const rid = (await h).get("x-request-id") || randomUUID();
  return logger.runWithRequest(rid, handler);
}

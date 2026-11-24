import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { ApiError } from "./errors";

function keyFor(prefix: string, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 40);
  return `${prefix}_${digest}`;
}

async function tooMany(key: string, limit: number, windowMs: number): Promise<boolean> {
  const ref = db.collection("rate_limits").doc(key);
  const now = Date.now();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const resetAt = typeof data?.resetAt === "number" ? data.resetAt : 0;
    const count = typeof data?.count === "number" ? data.count : 0;
    if (!snap.exists || resetAt < now) {
      tx.set(ref, { count: 1, resetAt: now + windowMs, updated_at: Timestamp.now() });
      return false;
    }
    if (count >= limit) return true;
    tx.update(ref, { count: count + 1, updated_at: Timestamp.now() });
    return false;
  });
}

export async function assertRateLimit(
  kind: "horarios" | "confirmar" | "gerenciar",
  ip: string,
  phone?: string,
): Promise<void> {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const checks: Array<Promise<boolean>> = [];
  if (kind === "horarios") {
    checks.push(tooMany(keyFor("slots", ip), 60, hour));
  } else if (kind === "confirmar") {
    checks.push(tooMany(keyFor("book-ip", ip), 10, hour));
    if (phone) checks.push(tooMany(keyFor("book-phone", phone), 5, day));
  } else {
    checks.push(tooMany(keyFor("manage", ip), 30, hour));
  }
  const blocked = await Promise.all(checks);
  if (blocked.some(Boolean)) {
    throw new ApiError(429, "Muitas tentativas. Espere um pouco e tente de novo.");
  }
}

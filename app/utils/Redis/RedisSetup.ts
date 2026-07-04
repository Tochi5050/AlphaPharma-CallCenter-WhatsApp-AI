// lib/conversationStore.js
import { Redis } from "@upstash/redis";

export type HandoffRecord = {
  id: string;
  waId: string;
  customerName?: string;
  category: string; // e.g. "media_upload", later: "clinical_question", "refund_request"
  reason: string;
  mediaId?: string;
  originalText?: string;
  timestamp: number;
  status: "pending" | "resolved";
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function handoffKey(id: string) {
  return `handoff:${id}`;
}

const PENDING_QUEUE_KEY = "handoff_queue:pending";

export async function createHandoff(
  data: Omit<HandoffRecord, "id" | "timestamp" | "status">,
): Promise<HandoffRecord> {
  const record: HandoffRecord = {
    ...data,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    status: "pending",
  };

  await redis.set(handoffKey(record.waId), record);
  await redis.sadd(PENDING_QUEUE_KEY, record.id);

  return record;
}

export async function getPendingHandoffs(): Promise<HandoffRecord[]> {
  const ids = await redis.smembers(PENDING_QUEUE_KEY);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(
    ids.map((id) => redis.get<HandoffRecord>(handoffKey(id))),
  );
  return records.filter((r): r is HandoffRecord => r !== null);
}

const HISTORY_LIMIT = 20; // max messages kept per customer
const TTL_SECONDS = 60 * 60 * 24 * 3; // auto-expire after 3 days idle

function key(waId: string | number) {
  return `conversation:${waId}`;
}

export async function getHistory(
  waId: string | number,
): Promise<Array<{ role: string; content: string }>> {
  const raw = await redis.get<Array<{ role: string; content: string }>>(
    key(waId),
  );
  return raw ?? [];
}

export async function appendMessage(
  waId: string | number,
  message: { role: string; content: string },
) {
  const history: Array<{ role: string; content: string }> =
    await getHistory(waId);
  history.push(message);

  // Keep only the most recent N messages
  const trimmed = history.slice(-HISTORY_LIMIT);

  await redis.set(key(waId), trimmed, { ex: TTL_SECONDS });
  return trimmed;
}

export async function clearHistory(waId: string | number) {
  await redis.del(key(waId));
}

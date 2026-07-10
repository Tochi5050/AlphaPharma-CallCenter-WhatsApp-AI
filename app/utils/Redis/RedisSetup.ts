import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export type HandoffRecord = {
  id: string;
  waId: string;
  customerName?: string;
  category: string;
  reason: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaType?: string;
  originalText?: string;
  conversationSnapshot: Array<{ role: string; content: string }>;
  timestamp: number;
  status: "pending" | "resolved";
};

function handoffKey(id: string) {
  return `handoff:${id}`;
}

function customerHandoffsKey(waId: string) {
  return `handoff_by_customer:${waId}`;
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

  await redis.set(handoffKey(record.id), record);
  await redis.sadd(PENDING_QUEUE_KEY, record.id);
  await redis.sadd(customerHandoffsKey(record.waId), record.id);

  return record;
}

export async function getPendingHandoffsForCustomer(
  waId: string,
): Promise<HandoffRecord[]> {
  const ids = await redis.smembers(customerHandoffsKey(waId));
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(
    ids.map((id) => redis.get<HandoffRecord>(handoffKey(id))),
  );
  return records.filter(
    (r): r is HandoffRecord => r !== null && r.status === "pending",
  );
}

export async function getPendingHandoffs(): Promise<HandoffRecord[]> {
  const ids = await redis.smembers(PENDING_QUEUE_KEY);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(
    ids.map((id) => redis.get<HandoffRecord>(handoffKey(id))),
  );
  return records.filter((r): r is HandoffRecord => r !== null);
}

export function getOldestPendingHandoff(
  records: HandoffRecord[],
): HandoffRecord {
  return records.reduce((oldest, r) =>
    r.timestamp < oldest.timestamp ? r : oldest,
  );
}

const HISTORY_LIMIT = 20;
const TTL_SECONDS = 60 * 60 * 24 * 3;

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
  const history = await getHistory(waId);
  history.push(message);
  const trimmed = history.slice(-HISTORY_LIMIT);
  await redis.set(key(waId), trimmed, { ex: TTL_SECONDS });
  return trimmed;
}

export async function clearHistory(waId: string | number) {
  await redis.del(key(waId));
}

const FIRST_REPLY_TTL_SECONDS = 60 * 60 * 24 * 3;

function repliedKey(waId: string) {
  return `has_replied:${waId}`;
}

export async function isFirstReply(waId: string): Promise<boolean> {
  const exists = await redis.get(repliedKey(waId));
  return exists === null;
}

export async function markReplied(waId: string): Promise<void> {
  await redis.set(repliedKey(waId), "1", { ex: FIRST_REPLY_TTL_SECONDS });
}

const PROCESSED_FINAL_TTL_SECONDS = 60 * 60 * 24;

export async function isMessageFullyProcessed(
  messageId: string,
): Promise<boolean> {
  const result = await redis.get(`processed_final:${messageId}`);
  return result !== null;
}

export async function markMessageFullyProcessed(
  messageId: string,
): Promise<void> {
  await redis.set(`processed_final:${messageId}`, "1", {
    ex: PROCESSED_FINAL_TTL_SECONDS,
  });
}

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
  orderDetails?: PendingOrder;
  mediaId?: string;
  mediaUrl?: string;
  mediaType?: string;
  originalText?: string;
  conversationSnapshot: Array<{ role: string; content: string }>;
  timestamp: number;
  status: "pending" | "resolved";
  resolvedAt?: number;
  silencesAi: boolean;
};

export type PendingOrderItem = {
  item_name: string;
  uom: string;
  qty: number;
  unit_price: number;
};

export type PendingOrder = {
  items: PendingOrderItem[];
  total: number;
  createdAt: number;
};

const AWAITING_PAYMENT_TTL = 60 * 60 * 48; // 48h

function engagedKey(waId: string) {
  return `pharmacist_engaged:${waId}`;
}

export async function markPharmacistEngaged(waId: string): Promise<void> {
  await redis.set(engagedKey(waId), "1", { ex: 60 * 60 * 24 });
}

export async function isPharmacistEngaged(waId: string): Promise<boolean> {
  const result = await redis.get(engagedKey(waId));
  return result !== null;
}

export async function clearPharmacistEngaged(waId: string): Promise<void> {
  await redis.del(engagedKey(waId));
}

function awaitingPaymentKey(waId: string) {
  return `awaiting_payment:${waId}`;
}

export async function setAwaitingPayment(
  waId: string,
  order: PendingOrder,
): Promise<void> {
  await redis.set(awaitingPaymentKey(waId), order, {
    ex: AWAITING_PAYMENT_TTL,
  });
}

export async function getAndClearAwaitingPayment(
  waId: string,
): Promise<PendingOrder | null> {
  const order = await redis.get<PendingOrder>(awaitingPaymentKey(waId));
  if (order) await redis.del(awaitingPaymentKey(waId));
  return order;
}

function handoffKey(id: string) {
  return `handoff:${id}`;
}

function customerHandoffsKey(waId: string) {
  return `handoff_by_customer:${waId}`;
}

const PENDING_QUEUE_KEY = "handoff_queue:pending";

const ALL_QUEUE_KEY = "handoff_queue:all";

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
  await redis.sadd(ALL_QUEUE_KEY, record.id);
  await redis.sadd(customerHandoffsKey(record.waId), record.id);

  return record;
}

export async function getSilencingPendingHandoffsForCustomer(
  waId: string,
): Promise<HandoffRecord[]> {
  const ids = await redis.smembers(customerHandoffsKey(waId));
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(
    ids.map((id) => redis.get<HandoffRecord>(handoffKey(id))),
  );
  return records.filter(
    (r): r is HandoffRecord =>
      r !== null && r.status === "pending" && r.silencesAi === true,
  );
}

export async function resolveHandoff(
  id: string,
): Promise<HandoffRecord | null> {
  const record = await redis.get<HandoffRecord>(handoffKey(id));
  if (!record) return null;

  const updated: HandoffRecord = {
    ...record,
    status: "resolved",
    resolvedAt: Date.now(),
  };

  await redis.set(handoffKey(id), updated);
  await redis.srem(PENDING_QUEUE_KEY, id);
  await clearPharmacistEngaged(record.waId);
  return updated;
}

export async function getHandoffById(
  id: string,
): Promise<HandoffRecord | null> {
  return redis.get<HandoffRecord>(handoffKey(id));
}

export async function getAllHandoffs(): Promise<HandoffRecord[]> {
  const ids = await redis.smembers(ALL_QUEUE_KEY);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(
    ids.map((id) => redis.get<HandoffRecord>(handoffKey(id))),
  );
  return records.filter((r): r is HandoffRecord => r !== null);
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
const MESSAGE_LOOKUP_TTL_SECONDS = TTL_SECONDS; // same 3-day window as conversation history

function messageByIdKey(messageId: string) {
  return `message_by_id:${messageId}`;
}

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
  message: { role: string; content: string; messageId?: string },
) {
  const history = await getHistory(waId);
  history.push(message);
  const trimmed = history.slice(-HISTORY_LIMIT);
  await redis.set(key(waId), trimmed, { ex: TTL_SECONDS });

  if (message.messageId) {
    await redis.set(messageByIdKey(message.messageId), message, {
      ex: MESSAGE_LOOKUP_TTL_SECONDS,
    });
  }

  return trimmed;
}

export async function findMessageById(
  messageId: string,
): Promise<string | undefined> {
  const record = await redis.get<{ role: string; content: string }>(
    messageByIdKey(messageId),
  );
  return record?.content;
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

export async function acquireCustomerLock(waId: string): Promise<boolean> {
  const result = await redis.set(`lock:${waId}`, "1", { nx: true, ex: 60 });
  return result !== null;
}

export async function releaseCustomerLock(waId: string): Promise<void> {
  await redis.del(`lock:${waId}`);
}

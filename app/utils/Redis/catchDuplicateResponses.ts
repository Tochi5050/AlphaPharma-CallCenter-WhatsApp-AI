import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PROCESSED_TTL_SECONDS = 60 * 60 * 24; // 24h is plenty for retry windows

export async function isDuplicateMessage(messageId: string): Promise<boolean> {
  const key = `processed_message:${messageId}`;
  // Redis SET with NX (only-if-not-exists) is atomic — no race condition between two near-simultaneous retries
  const result = await redis.set(key, "1", {
    nx: true,
    ex: PROCESSED_TTL_SECONDS,
  });
  // If result is null, the key already existed — this is a duplicate
  return result === null;
}

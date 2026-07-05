import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PROCESSED_TTL_SECONDS = 60 * 60 * 24; // 24h is plenty for retry windows

export async function isDuplicateMessage(messageId: string): Promise<boolean> {
  const key = `processed_message:${messageId}`;
  try {
    const result = await redis.set(key, "1", {
      nx: true,
      ex: PROCESSED_TTL_SECONDS,
    });
    return result === null;
  } catch (err) {
    console.error(
      "Dedup check failed, proceeding without dedup guarantee:",
      err,
    );
    return false; // fail open — better to risk a rare duplicate than silently drop a real message
  }
}

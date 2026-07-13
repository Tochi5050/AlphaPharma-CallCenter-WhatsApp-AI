import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export type HandoffRecord = {
  id: string;
  waId: string;
  customerName?: string;
  category: string;
  reason: string;
  mediaId?: string; // raw WhatsApp reference — TEMPORARY, until resolveAndStoreMedia exists
  mediaUrl?: string; // durable re-hosted URL — populated once resolveAndStoreMedia is built
  mediaType?: string;
  originalText?: string;
  conversationSnapshot: Array<{ role: string; content: string }>;
  timestamp: number;
  status: "pending" | "resolved";
};

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { message: "Empty body, ignored" },
      { status: 200 },
    );
  }

  let body;
  try {
    body = JSON.parse(rawBody);
    console.log("[RAW WEBHOOK]", JSON.stringify(body));
    console.log(
      "[FAST ROUTE] messageId:",
      body!.messageId,
      "at",
      new Date().toISOString(),
    );
  } catch (err) {
    console.error("Invalid JSON received:", rawBody);
    return NextResponse.json(
      { message: "Invalid JSON, ignored" },
      { status: 200 },
    );
  }

  try {
    await qstash.publishJSON({
      url: `${process.env.APP_BASE_URL}/api/process-message`,
      body,
      retries: 3,
    });
  } catch (err) {
    console.error("Failed to enqueue job, message may be lost:", err);
    try {
      await redis.lpush(
        "failed_to_queue",
        JSON.stringify({ body, error: String(err), timestamp: Date.now() }),
      );
    } catch (redisErr) {
      console.error(
        "Redis fallback also failed, message lost with no trail:",
        redisErr,
      );
    }
  }

  return NextResponse.json({ message: "Queued" }, { status: 200 });
}

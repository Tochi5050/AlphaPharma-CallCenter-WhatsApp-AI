// import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
// import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import { parseIncomingMessage } from "@/app/utils/ParseIncomingMessages/incomingMsg";
import { isDuplicateMessage } from "@/app/utils/Redis/catchDuplicateResponses";
// import {
//   appendMessage,
//   getHistory,
//   createHandoff,
//   isFirstReply,
//   markReplied,
// } from "@/app/utils/Redis/RedisSetup";
// import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
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

  let incomingMsg;
  try {
    const body = JSON.parse(rawBody);
    incomingMsg = parseIncomingMessage(body);
  } catch (err) {
    console.error("Invalid JSON received:", rawBody);
    return NextResponse.json(
      { message: "Invalid JSON, ignored" },
      { status: 200 },
    );
  }

  if (!incomingMsg) {
    return NextResponse.json({ message: "No message found" }, { status: 200 });
  }

  const isDuplicate = await isDuplicateMessage(incomingMsg.messageId);
  if (isDuplicate) {
    console.log("Duplicate message, skipping:", incomingMsg.messageId);
    return NextResponse.json(
      { message: "Duplicate, already processed" },
      { status: 200 },
    );
  }

  if (incomingMsg.category === "ignore") {
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  }

  try {
    await qstash.publishJSON({
      url: `${process.env.APP_BASE_URL}/api/process-message`,
      body: incomingMsg,
      retries: 3,
    });
  } catch (err) {
    console.error(
      "Failed to enqueue job, message may be lost:",
      incomingMsg.messageId,
      err,
    );
    await redis.lpush(
      "failed_to_queue",
      JSON.stringify({
        incomingMsg,
        error: String(err),
        timestamp: Date.now(),
      }),
    );
  }

  return NextResponse.json({ message: "Queued" }, { status: 200 });
}

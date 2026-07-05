import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import { parseIncomingMessage } from "@/app/utils/ParseIncomingMessages/incomingMsg";
import { isDuplicateMessage } from "@/app/utils/Redis/catchDuplicateResponses";
import {
  appendMessage,
  getHistory,
  createHandoff,
} from "@/app/utils/Redis/RedisSetup";
import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { message: "Empty body, ignored" },
        { status: 200 },
      );
    }
    const body = JSON.parse(rawBody);
    // const body = await request.json();
    console.log("body =>", body);
    const incomingMsg = parseIncomingMessage(body);

    if (!incomingMsg) {
      return NextResponse.json(
        { message: "No message found" },
        { status: 200 },
      );
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
      // reactions and stickers — no reply, no record
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    if (incomingMsg.category === "handoff") {
      const history = await getHistory(incomingMsg.from);

      let mediaUrl: string | undefined;
      let mediaType: string | undefined = incomingMsg.type;

      if (incomingMsg.mediaId) {
        try {
          const resolved = await resolveAndStoreMedia(incomingMsg.mediaId);
          mediaUrl = resolved.mediaUrl;
          mediaType = resolved.mediaType;
        } catch (err) {
          console.error("Failed to resolve media, storing without it:", err);
        }
      }

      const handoffRecord = await createHandoff({
        waId: incomingMsg.from,
        customerName: incomingMsg.name,
        category: "media_upload",
        reason: `Received unsupported message type: ${incomingMsg.type}`,
        mediaId: incomingMsg.mediaId,
        mediaUrl,
        mediaType,
        originalText: incomingMsg.caption,
        conversationSnapshot: history,
      });

      console.log("handOff =>", handoffRecord);

      await sendWhatsAppReply(
        incomingMsg.from,
        "Just give me a minute while I review this for you.",
      );

      return NextResponse.json({ message: "Handed off" }, { status: 200 });
    }

    // category === "text" — proceed to Layer 2 (Claude)
    // console.time("redis-append");
    await appendMessage(incomingMsg.from, {
      role: "user",
      content: incomingMsg.text!,
    });
    // console.timeEnd("redis-append");
    // console.time("redis-history");
    const history = await getHistory(incomingMsg.from);
    // console.timeEnd("redis-history");
    console.log("history =>", history);

    return NextResponse.json(
      { message: "Text received", history },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error handling message:", error);
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 },
    );
  }
}

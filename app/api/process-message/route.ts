import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import {
  appendMessage,
  getHistory,
  createHandoff,
  isFirstReply,
  markReplied,
} from "@/app/utils/Redis/RedisSetup";
import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

async function handler(request: NextRequest): Promise<NextResponse> {
  const incomingMsg = await request.json();

  try {
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

      const canGreet = await isFirstReply(incomingMsg.from);
      const replyText =
        "Just give me a minute while I connect you with one of our pharmacists.";

      await sendWhatsAppReply(
        incomingMsg.from,
        canGreet ? withGreeting(replyText) : replyText,
      );
      await markReplied(incomingMsg.from);

      return NextResponse.json({ message: "Handed off" }, { status: 200 });
    }

    // category === "text" — Layer 2 (Claude) plugs in here later
    await appendMessage(incomingMsg.from, {
      role: "user",
      content: incomingMsg.text!,
    });
    const history = await getHistory(incomingMsg.from);
    console.log("history =>", history);

    return NextResponse.json(
      { message: "Text received", history },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing message:", error);
    // Unlike the WhatsApp-facing route, returning a real error status HERE is correct —
    // QStash's own retry (fast, bounded, under our control) is the good kind of retry,
    // not WhatsApp's slow multi-day backoff. This is the one place a non-200 is intentional.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);

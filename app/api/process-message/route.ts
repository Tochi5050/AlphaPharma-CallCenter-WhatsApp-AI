import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import { parseIncomingMessage } from "@/app/utils/ParseIncomingMessages/incomingMsg";
import {
  appendMessage,
  getHistory,
  createHandoff,
  isFirstReply,
  markReplied,
  isMessageFullyProcessed,
  markMessageFullyProcessed,
} from "@/app/utils/Redis/RedisSetup";
import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

async function handler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const incomingMsg = parseIncomingMessage(body);

  if (!incomingMsg) {
    return NextResponse.json({ message: "No message found" }, { status: 200 });
  }

  const alreadyProcessed = await isMessageFullyProcessed(incomingMsg.messageId);
  if (alreadyProcessed) {
    console.log("Already processed, skipping:", incomingMsg.messageId);
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  if (incomingMsg.category === "ignore") {
    await markMessageFullyProcessed(incomingMsg.messageId);
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  }

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
      await markMessageFullyProcessed(incomingMsg.messageId);

      return NextResponse.json({ message: "Handed off" }, { status: 200 });
    }

    await appendMessage(incomingMsg.from, {
      role: "user",
      content: incomingMsg.text!,
    });
    const history = await getHistory(incomingMsg.from);
    console.log("history =>", history);

    await markMessageFullyProcessed(incomingMsg.messageId);

    return NextResponse.json(
      { message: "Text received", history },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);

import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import { parseIncomingMessage } from "@/app/utils/ParseIncomingMessages/incomingMsg";
import {
  appendMessage,
  getHistory,
  createHandoff,
} from "@/app/utils/Redis/RedisSetup";
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
    const body = await request.json();
    const incomingMsg = parseIncomingMessage(body);

    if (!incomingMsg) {
      return NextResponse.json(
        { message: "No message found" },
        { status: 200 },
      );
    }

    if (incomingMsg.category === "ignore") {
      // reactions and stickers — no reply, no record
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    if (incomingMsg.category === "handoff") {
      const history = await getHistory(incomingMsg.from);

      const handoffRecord = await createHandoff({
        waId: incomingMsg.from,
        customerName: incomingMsg.name,
        category: "media_upload",
        reason: `Received unsupported message type: ${incomingMsg.type}`,
        mediaId: incomingMsg.mediaId,
        mediaType: incomingMsg.type,
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
    console.error("Error handling message:", error);
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 },
    );
  }
}

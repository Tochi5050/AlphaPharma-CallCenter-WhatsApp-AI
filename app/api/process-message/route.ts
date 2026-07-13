// import Anthropic from "@anthropic-ai/sdk";
// import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
// import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
// import {
//   isPharmacistEcho,
//   parseIncomingMessage,
// } from "@/app/utils/ParseIncomingMessages/incomingMsg";
// import { lookupCustomerByPhone } from "@/app/utils/erpUtils/erpClient/erpClient";
// import { buildSystemPrompt } from "@/app/utils/system_prompt/systemPrompt";
// import { erpTools } from "@/app/utils/erpUtils/erpToolSchema/toolSchema";
// import { executeErpTool } from "@/app/utils/erpUtils/erpTools/erpToolExecutor";
// import {
//   appendMessage,
//   getHistory,
//   createHandoff,
//   isFirstReply,
//   markReplied,
//   isMessageFullyProcessed,
//   markMessageFullyProcessed,
//   getPendingHandoffsForCustomer,
//   getOldestPendingHandoff,
//   getAndClearAwaitingPayment,
// } from "@/app/utils/Redis/RedisSetup";
// import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
// import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
// import { NextRequest, NextResponse } from "next/server";
// import { stripGreetingOpeners } from "@/app/utils/aiGreeting/stripGreetingOpeners";

// const anthropic = new Anthropic();

// const HOLDING_MESSAGE =
//   "Still with our pharmacist on that — they'll be with you shortly!";
// const HANDOFF_EXPIRY_HOURS = 24;

// export const maxDuration = 30;

// async function handler(request: NextRequest): Promise<NextResponse> {
//   const body = await request.json();
//   const incomingMsg = parseIncomingMessage(body);

//   if (!incomingMsg) {
//     return NextResponse.json({ message: "No message found" }, { status: 200 });
//   }

//   if (isPharmacistEcho(incomingMsg)) {
//     console.log(
//       "[ECHO] Pharmacist reply detected:",
//       JSON.stringify(incomingMsg),
//     );
//     await appendMessage(incomingMsg.customerWaId, {
//       role: "assistant",
//       content:
//         incomingMsg.text ?? `[${incomingMsg.type} message from pharmacist]`,
//     });
//     return NextResponse.json({ message: "Echo logged" }, { status: 200 });
//   }

//   if (!incomingMsg) {
//     return NextResponse.json({ message: "No message found" }, { status: 200 });
//   }

//   const alreadyProcessed = await isMessageFullyProcessed(incomingMsg.messageId);
//   if (alreadyProcessed) {
//     console.log("Already processed, skipping:", incomingMsg.messageId);
//     return NextResponse.json({ message: "Already processed" }, { status: 200 });
//   }

//   if (incomingMsg.category === "ignore") {
//     await markMessageFullyProcessed(incomingMsg.messageId);
//     return NextResponse.json({ message: "Ignored" }, { status: 200 });
//   }

//   try {
//     if (incomingMsg.category === "handoff") {
//       const history = await getHistory(incomingMsg.from);
//       const customer = await lookupCustomerByPhone(incomingMsg.from);
//       const pendingOrder = await getAndClearAwaitingPayment(incomingMsg.from);

//       let mediaUrl: string | undefined;
//       let mediaType: string | undefined = incomingMsg.type;

//       if (incomingMsg.mediaId) {
//         try {
//           const resolved = await resolveAndStoreMedia(incomingMsg.mediaId);
//           mediaUrl = resolved.mediaUrl;
//           mediaType = resolved.mediaType;
//         } catch (err) {
//           console.error("Failed to resolve media, storing without it:", err);
//         }
//       }

//       const handoffRecord = await createHandoff({
//         waId: incomingMsg.from,
//         customerName: customer.customerName,
//         category: pendingOrder ? "payment_proof" : "media_upload",
//         reason: pendingOrder
//           ? `Payment proof received for order totaling ₦${pendingOrder.total}. Items: ${pendingOrder.items
//               .map((i) => `${i.qty} ${i.uom} ${i.item_name}`)
//               .join(", ")}`
//           : `Received unsupported message type: ${incomingMsg.type}`,
//         orderDetails: pendingOrder ?? undefined,
//         mediaId: incomingMsg.mediaId,
//         mediaUrl,
//         mediaType,
//         originalText: incomingMsg.caption,
//         conversationSnapshot: history,
//       });

//       console.log("handOff =>", handoffRecord);

//       const canGreet = await isFirstReply(incomingMsg.from);
//       const replyText = pendingOrder
//         ? "Awaiting pharmacist's confirmation of your payment..."
//         : "Just give me a minute while I connect you with one of our pharmacists.";

//       await sendWhatsAppReply(
//         incomingMsg.from,
//         canGreet ? withGreeting(replyText, customer.customerName) : replyText,
//       );
//       await markReplied(incomingMsg.from);
//       await markMessageFullyProcessed(incomingMsg.messageId);

//       return NextResponse.json({ message: "Handed off" }, { status: 200 });
//     }

//     // category === "text"
//     await appendMessage(incomingMsg.from, {
//       role: "user",
//       content: incomingMsg.text!,
//     });

//     const pending = await getPendingHandoffsForCustomer(incomingMsg.from);

//     if (pending.length > 0) {
//       const oldest = getOldestPendingHandoff(pending);
//       const elapsedHours = (Date.now() - oldest.timestamp) / (1000 * 60 * 60);
//       const customer = await lookupCustomerByPhone(incomingMsg.from);

//       const reply =
//         elapsedHours < HANDOFF_EXPIRY_HOURS
//           ? HOLDING_MESSAGE
//           : withGreeting(HOLDING_MESSAGE, customer.customerName);

//       await sendWhatsAppReply(incomingMsg.from, reply);
//       await markMessageFullyProcessed(incomingMsg.messageId);

//       return NextResponse.json(
//         { message: "Still pending handoff" },
//         { status: 200 },
//       );
//     }

//     // No pending handoff — Layer 2 (Claude)
//     const conversationSnapshot = await getHistory(incomingMsg.from);
//     const messages: Anthropic.Messages.MessageParam[] =
//       conversationSnapshot.map((m) => ({
//         role: m.role as "user" | "assistant",
//         content: m.content,
//       }));
//     console.log("[CLAUDE] first call starting");
//     let response: Anthropic.Messages.Message = await anthropic.messages.create({
//       model: "claude-sonnet-5",
//       max_tokens: 2048,
//       system: buildSystemPrompt(),
//       tools: erpTools,
//       messages,
//     });
//     console.log("[CLAUDE] first call done, stop_reason:", response.stop_reason);
//     let handoffTriggered = false;

//     while (response.stop_reason === "tool_use") {
//       const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] =
//         response.content.filter(
//           (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
//         );

//       messages.push({ role: "assistant", content: response.content });

//       const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];

//       for (const toolUse of toolUseBlocks) {
//         const result = await executeErpTool(
//           toolUse.name,
//           toolUse.input as Record<string, unknown>,
//           { waId: incomingMsg.from, history: conversationSnapshot },
//         );

//         if (
//           typeof result === "object" &&
//           result !== null &&
//           "handedOff" in result
//         ) {
//           handoffTriggered = true;
//         }

//         toolResultBlocks.push({
//           type: "tool_result",
//           tool_use_id: toolUse.id,
//           content: JSON.stringify(result),
//         });
//       }

//       messages.push({ role: "user", content: toolResultBlocks });
//       console.log("[CLAUDE] second call starting");
//       response = await anthropic.messages.create({
//         model: "claude-sonnet-5",
//         max_tokens: 2048,
//         system: buildSystemPrompt(),
//         tools: erpTools,
//         messages,
//       });
//       console.log(
//         "[CLAUDE] second call done, stop_reason:",
//         response.stop_reason,
//       );
//     }

//     const finalTextBlock = response.content.find(
//       (c): c is Anthropic.Messages.TextBlock => c.type === "text",
//     );
//     const finalText = stripGreetingOpeners(finalTextBlock?.text ?? "");
//     console.log("[FINAL TEXT]", finalText.slice(0, 100));
//     if (finalText) {
//       await appendMessage(incomingMsg.from, {
//         role: "assistant",
//         content: finalText,
//       });
//     }

//     if (!handoffTriggered) {
//       if (finalText) {
//         const customer = await lookupCustomerByPhone(incomingMsg.from);
//         const canGreet = await isFirstReply(incomingMsg.from);
//         await sendWhatsAppReply(
//           incomingMsg.from,
//           canGreet ? withGreeting(finalText, customer.customerName) : finalText,
//         );
//         await markReplied(incomingMsg.from);
//       } else {
//         console.error(
//           "[FALLBACK] Empty final text with no handoff, stop_reason:",
//           response.stop_reason,
//         );
//         const customer = await lookupCustomerByPhone(incomingMsg.from);
//         await createHandoff({
//           waId: incomingMsg.from,
//           customerName: customer.customerName,
//           category: "other",
//           reason: `AI response was empty or incomplete (stop_reason: ${response.stop_reason})`,
//           conversationSnapshot: conversationSnapshot,
//         });
//         const canGreet = await isFirstReply(incomingMsg.from);
//         const fallbackText =
//           "Just give me a minute while I connect you with one of our pharmacists.";
//         await sendWhatsAppReply(
//           incomingMsg.from,
//           canGreet
//             ? withGreeting(fallbackText, customer.customerName)
//             : fallbackText,
//         );
//         await markReplied(incomingMsg.from);
//       }
//     }

//     await markMessageFullyProcessed(incomingMsg.messageId);

//     return NextResponse.json(
//       { message: "Text handled", finalText },
//       { status: 200 },
//     );
//   } catch (error) {
//     console.error("Error processing message:", error);
//     return NextResponse.json({ error: "Processing failed" }, { status: 500 });
//   }
// }

// export const POST = verifySignatureAppRouter(handler);

import Anthropic from "@anthropic-ai/sdk";
import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import {
  isPharmacistEcho,
  parseIncomingMessage,
} from "@/app/utils/ParseIncomingMessages/incomingMsg";
import { lookupCustomerByPhone } from "@/app/utils/erpUtils/erpClient/erpClient";
import { buildSystemPrompt } from "@/app/utils/system_prompt/systemPrompt";
import { erpTools } from "@/app/utils/erpUtils/erpToolSchema/toolSchema";
import { executeErpTool } from "@/app/utils/erpUtils/erpTools/erpToolExecutor";
import {
  appendMessage,
  getHistory,
  createHandoff,
  isFirstReply,
  markReplied,
  isMessageFullyProcessed,
  markMessageFullyProcessed,
  getPendingHandoffsForCustomer,
  getOldestPendingHandoff,
  getAndClearAwaitingPayment,
  markPharmacistEngaged,
  isPharmacistEngaged,
} from "@/app/utils/Redis/RedisSetup";
import { resolveAndStoreMedia } from "@/app/utils/storeMedia/storeMediaFiles";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { stripGreetingOpeners } from "@/app/utils/aiGreeting/stripGreetingOpeners";

const anthropic = new Anthropic();

const HOLDING_MESSAGE =
  "Still with our pharmacist on that — they'll be with you shortly!";
const HANDOFF_EXPIRY_HOURS = 24;

export const maxDuration = 30;

async function handler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const incomingMsg = parseIncomingMessage(body);

  if (!incomingMsg) {
    return NextResponse.json({ message: "No message found" }, { status: 200 });
  }

  if (isPharmacistEcho(incomingMsg)) {
    console.log(
      "[ECHO] Pharmacist reply detected:",
      JSON.stringify(incomingMsg),
    );
    await appendMessage(incomingMsg.customerWaId, {
      role: "assistant",
      content:
        incomingMsg.text ?? `[${incomingMsg.type} message from pharmacist]`,
    });
    await markPharmacistEngaged(incomingMsg.customerWaId);
    return NextResponse.json({ message: "Echo logged" }, { status: 200 });
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
      const customer = await lookupCustomerByPhone(incomingMsg.from);
      const pendingOrder = await getAndClearAwaitingPayment(incomingMsg.from);

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
        customerName: customer.customerName,
        category: pendingOrder ? "payment_proof" : "media_upload",
        reason: pendingOrder
          ? `Payment proof received for order totaling ₦${pendingOrder.total}. Items: ${pendingOrder.items
              .map((i) => `${i.qty} ${i.uom} ${i.item_name}`)
              .join(", ")}`
          : `Received unsupported message type: ${incomingMsg.type}`,
        orderDetails: pendingOrder ?? undefined,
        mediaId: incomingMsg.mediaId,
        mediaUrl,
        mediaType,
        originalText: incomingMsg.caption,
        conversationSnapshot: history,
      });

      console.log("handOff =>", handoffRecord);

      const canGreet = await isFirstReply(incomingMsg.from);
      const replyText = pendingOrder
        ? "Awaiting pharmacist's confirmation of your payment..."
        : "Just give me a minute while I connect you with one of our pharmacists.";

      await sendWhatsAppReply(
        incomingMsg.from,
        canGreet ? withGreeting(replyText, customer.customerName) : replyText,
      );
      await markReplied(incomingMsg.from);
      await markMessageFullyProcessed(incomingMsg.messageId);

      return NextResponse.json({ message: "Handed off" }, { status: 200 });
    }

    // category === "text"
    await appendMessage(incomingMsg.from, {
      role: "user",
      content: incomingMsg.text!,
    });

    const pending = await getPendingHandoffsForCustomer(incomingMsg.from);

    if (pending.length > 0) {
      const engaged = await isPharmacistEngaged(incomingMsg.from);

      if (engaged) {
        console.log(
          "Pharmacist actively engaged, staying silent:",
          incomingMsg.from,
        );
        await markMessageFullyProcessed(incomingMsg.messageId);
        return NextResponse.json(
          { message: "Pharmacist engaged, no reply" },
          { status: 200 },
        );
      }

      const oldest = getOldestPendingHandoff(pending);
      const elapsedHours = (Date.now() - oldest.timestamp) / (1000 * 60 * 60);
      const customer = await lookupCustomerByPhone(incomingMsg.from);

      const reply =
        elapsedHours < HANDOFF_EXPIRY_HOURS
          ? HOLDING_MESSAGE
          : withGreeting(HOLDING_MESSAGE, customer.customerName);

      await sendWhatsAppReply(incomingMsg.from, reply);
      await markMessageFullyProcessed(incomingMsg.messageId);

      return NextResponse.json(
        { message: "Still pending handoff" },
        { status: 200 },
      );
    }

    // No pending handoff — Layer 2 (Claude)
    const conversationSnapshot = await getHistory(incomingMsg.from);
    const messages: Anthropic.Messages.MessageParam[] =
      conversationSnapshot.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    console.log("[CLAUDE] first call starting");
    let response: Anthropic.Messages.Message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 3048,
      system: buildSystemPrompt(),
      tools: erpTools,
      messages,
    });
    console.log("[CLAUDE] first call done, stop_reason:", response.stop_reason);
    let handoffTriggered = false;

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] =
        response.content.filter(
          (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
        );

      messages.push({ role: "assistant", content: response.content });

      const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeErpTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          { waId: incomingMsg.from, history: conversationSnapshot },
        );

        if (
          typeof result === "object" &&
          result !== null &&
          "handedOff" in result
        ) {
          handoffTriggered = true;
        }

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResultBlocks });
      console.log("[CLAUDE] second call starting");
      response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 3048,
        system: buildSystemPrompt(),
        tools: erpTools,
        messages,
      });
      console.log(
        "[CLAUDE] second call done, stop_reason:",
        response.stop_reason,
      );
    }

    const finalTextBlock = response.content.find(
      (c): c is Anthropic.Messages.TextBlock => c.type === "text",
    );
    const finalText = stripGreetingOpeners(finalTextBlock?.text ?? "");
    console.log("[FINAL TEXT]", finalText.slice(0, 100));
    if (finalText) {
      await appendMessage(incomingMsg.from, {
        role: "assistant",
        content: finalText,
      });
    }

    if (!handoffTriggered) {
      if (finalText) {
        const customer = await lookupCustomerByPhone(incomingMsg.from);
        const canGreet = await isFirstReply(incomingMsg.from);
        console.log(
          "[SEND DEBUG] to:",
          incomingMsg.from,
          "text length:",
          finalText.length,
        );
        await sendWhatsAppReply(
          incomingMsg.from,
          canGreet ? withGreeting(finalText, customer.customerName) : finalText,
        );
        await markReplied(incomingMsg.from);
      } else {
        console.error(
          "[FALLBACK] Empty final text with no handoff, stop_reason:",
          response.stop_reason,
        );
        const customer = await lookupCustomerByPhone(incomingMsg.from);
        await createHandoff({
          waId: incomingMsg.from,
          customerName: customer.customerName,
          category: "other",
          reason: `AI response was empty or incomplete (stop_reason: ${response.stop_reason})`,
          conversationSnapshot: conversationSnapshot,
        });
        const canGreet = await isFirstReply(incomingMsg.from);
        const fallbackText =
          "Just give me a minute while I connect you with one of our pharmacists.";
        console.log(
          "[SEND DEBUG] to:",
          incomingMsg.from,
          "text length:",
          finalText.length,
        );
        await sendWhatsAppReply(
          incomingMsg.from,
          canGreet
            ? withGreeting(fallbackText, customer.customerName)
            : fallbackText,
        );
        await markReplied(incomingMsg.from);
      }
    }

    await markMessageFullyProcessed(incomingMsg.messageId);

    return NextResponse.json(
      { message: "Text handled", finalText },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);

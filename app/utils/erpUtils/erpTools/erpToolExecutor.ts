import {
  checkItemStockAndPrice,
  applyDiscount,
  lookupCustomerByPhone,
  ItemLookupResult,
} from "../erpClient/erpClient";
import { withGreeting } from "@/app/utils/aiGreeting/getTimeBasedGreeting";
import { sendWhatsAppReply } from "@/app/utils/handOffNonText/sendWhatsAppReply";
import {
  createHandoff,
  isFirstReply,
  markReplied,
  setAwaitingPayment,
  PendingOrderItem,
  appendMessage,
} from "@/app/utils/Redis/RedisSetup";

type ToolContext = {
  waId: string;
  history: Array<{ role: string; content: string }>;
};

type CheckItemStockAndPriceInput = {
  item_name: string;
  requested_uom?: string;
};

type HandOffToolInput = {
  category: string;
  reason: string;
};

type RecordPendingOrderInput = {
  items: PendingOrderItem[];
  total: number;
};

type HandOffResult = { handedOff: true; handoffId: string };
type RecordOrderResult = { recorded: true };
type ErpToolResult = ItemLookupResult | HandOffResult | RecordOrderResult;

export async function executeErpTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolContext,
): Promise<ErpToolResult> {
  if (toolName === "check_item_stock_and_price") {
    const input = toolInput as CheckItemStockAndPriceInput;
    console.log(
      "input.item_name =>",
      input.item_name,
      "input.requested_uom =>",
      input.requested_uom,
    );
    const result = await checkItemStockAndPrice(
      input.item_name,
      input.requested_uom,
    );

    if (!result.found) return result;
    console.log("[TOOL] stock lookup done, fetching customer discount...");
    const customer = await lookupCustomerByPhone(context.waId);
    console.log("[TOOL] customer lookup done:", JSON.stringify(customer));
    const matchesWithDiscount = result.matches.map((m) => {
      const finalPrice = applyDiscount(
        m.price,
        customer.discountPercentage ?? 0,
        m.is_medicine,
      );
      return {
        ...m,
        price: finalPrice,
        discount_applied: finalPrice !== m.price,
      };
    });
    console.log("[TOOL] check_item_stock_and_price returning to Claude");
    return { found: true, matches: matchesWithDiscount };
  }

  const HANDOFF_REPLIES: Record<string, string> = {
    special_order:
      "The requested medication is not available at the moment. Kindly give us a few hours while we get back to you on how soon we can make it available. We will get back to you shortly.",
    default:
      "Just give me a minute while I connect you with one of our pharmacists.",
  };

  if (toolName === "hand_off_to_pharmacist") {
    const input = toolInput as HandOffToolInput;
    console.log("[HANDOFF] Claude triggered hand-off:", JSON.stringify(input));

    const customer = await lookupCustomerByPhone(context.waId);

    const handoffRecord = await createHandoff({
      waId: context.waId,
      customerName: customer.customerName,
      category: input.category,
      reason: input.reason,
      conversationSnapshot: context.history,
    });

    console.log("[HANDOFF] record created:", handoffRecord.id);

    const canGreet = await isFirstReply(context.waId);
    const replyText =
      HANDOFF_REPLIES[input.category] ?? HANDOFF_REPLIES.default;

    await sendWhatsAppReply(
      context.waId,
      canGreet ? withGreeting(replyText, customer.customerName) : replyText,
    );
    await appendMessage(context.waId, {
      role: "assistant",
      content: `[Escalated to pharmacist — category: ${input.category}. Reason: ${input.reason}]`,
    });
    await markReplied(context.waId);

    console.log("[HANDOFF] reply sent to customer");

    return { handedOff: true, handoffId: handoffRecord.id };
  }

  if (toolName === "record_pending_order") {
    const input = toolInput as RecordPendingOrderInput;
    await setAwaitingPayment(context.waId, {
      items: input.items,
      total: input.total,
      createdAt: Date.now(),
    });
    return { recorded: true };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

import Anthropic from "@anthropic-ai/sdk";

export const erpTools: Anthropic.Tool[] = [
  {
    name: "check_item_stock_and_price",
    description:
      "Look up an item's stock, available units, and price. Call this first without requested_uom to see what units are sellable. If more than one unit is available and the customer hasn't specified which they want, ask them before calling again with requested_uom set.",
    input_schema: {
      type: "object",
      properties: {
        item_name: {
          type: "string",
          description: "The medicine or item name to look up",
        },
        requested_uom: {
          type: "string",
          description:
            "The specific unit the customer wants (e.g. 'Pack', 'Ampoule'). Omit on the first call if unknown.",
        },
      },
      required: ["item_name"],
    },
  },
  {
    name: "hand_off_to_pharmacist",
    description:
      "Escalates the conversation to a human pharmacist instead of answering directly. Use this whenever the customer asks something requiring professional judgment: dosage or usage instructions, drug interactions, side effects, clinical/medical advice, refund or return requests, special/rare medication orders, expiry date or product photo requests, or any request you are not confident answering from stock and pricing data alone. Never guess or provide medical advice yourself — always hand off instead. Once this tool returns, do not send any further message to the customer yourself — the hold message has already been sent.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [
            "clinical_question",
            "refund_request",
            "drug_interaction",
            "special_order",
            "other",
          ],
          description: "The type of request requiring pharmacist attention",
        },
        reason: {
          type: "string",
          description:
            "A short summary of what the customer is asking, for the pharmacist reviewing this ticket",
        },
      },
      required: ["category", "reason"],
    },
  },
  {
    name: "record_pending_order",
    description:
      "Call this exactly once, right after the customer has confirmed they want to proceed with a specific order, and only after you have already told them the order total and payment details in your reply. Do not call this before they've explicitly agreed to proceed.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_name: { type: "string" },
              uom: { type: "string" },
              qty: { type: "number" },
              unit_price: { type: "number" },
            },
            required: ["item_name", "uom", "qty", "unit_price"],
          },
        },
        total: {
          type: "number",
          description: "The full order total the customer agreed to pay",
        },
      },
      required: ["items", "total"],
    },
  },
];

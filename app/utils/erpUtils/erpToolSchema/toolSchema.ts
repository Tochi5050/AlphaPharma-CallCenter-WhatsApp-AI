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
            "controlled_substance",
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
    name: "flag_unavailable_item",
    description:
      "Flags a specific out-of-stock item for a pharmacist to review and source, WITHOUT pausing the rest of the conversation. Use this whenever check_item_stock_and_price returns found: false, or every match has zero stock. After calling this tool, you must tell the customer yourself, in your own natural words, that the item isn't currently available and has been flagged for sourcing — this tool does not send anything to the customer on its own. Continue helping with anything else in the same message if relevant.",
    input_schema: {
      type: "object",
      properties: {
        item_name: {
          type: "string",
          description: "The item the customer asked about that is unavailable",
        },
      },
      required: ["item_name"],
    },
  },
  {
    name: "flag_prescription_format",
    description:
      "Flags a specific drug request for pharmacist review because the customer phrased it with prescription-style dosing instructions (e.g. 'TDS', 'BD', 'OD', 'for 5 days', 'PO', 'stat'), rather than a plain availability or purchase request. This does NOT pause the rest of the conversation — continue helping with any other items or questions in the same or later messages normally. Only the specific flagged item needs pharmacist review.",
    input_schema: {
      type: "object",
      properties: {
        item_name: {
          type: "string",
          description:
            "The medication the prescription-style request was about",
        },
        prescription_text: {
          type: "string",
          description:
            "The exact phrasing the customer used that resembled a prescription",
        },
      },
      required: ["item_name", "prescription_text"],
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

export type msgObj = {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
          user_id: string;
        }>;
        messages: Array<{
          from: string;
          id: string;
          text?: {
            body: string;
          };
          image?: {
            id: string;
            mime_type: string;
            caption?: string;
          };
          document?: {
            id: string;
            mime_type: string;
            filename?: string;
            caption?: string;
          };
          type: string;
          timestamp: string;
          from_user_id: string;
        }>;
        message_echoes?: Array<{
          to: string;
          id: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        field: string;
      };
    }>;
  }>;
};

export type MessageCategory = "text" | "ignore" | "handoff";

export type PharmacistEcho = {
  isEcho: true;
  customerWaId: string;
  messageId: string;
  text?: string;
  type: string;
};

export type ParsedMessage = {
  from: string;
  name?: string;
  messageId: string;
  type: string;
  category: MessageCategory;
  text?: string;
  mediaId?: string;
  mediaMimeType?: string;
  caption?: string;
};

export function isPharmacistEcho(
  msg: ParsedMessage | PharmacistEcho,
): msg is PharmacistEcho {
  return "isEcho" in msg && msg.isEcho === true;
}

function classifyType(type: string): MessageCategory {
  if (type === "text") return "text";
  if (type === "reaction" || type === "sticker") return "ignore";
  return "handoff"; // image, document, audio, video, location, unknown, etc.
}

export function parseIncomingMessage(
  body: msgObj,
): ParsedMessage | PharmacistEcho | null {
  const value = body.entry?.[0]?.changes?.[0]?.value;
  const field = value?.field;
  console.log("body @parsedIncomingMessage -", body.entry?.[0]?.changes);
  console.log("field @parsedIncomingMessage -", field);

  if (field === "smb_message_echoes") {
    const echo = value?.message_echoes?.[0];
    if (!echo) return null;

    return {
      isEcho: true,
      customerWaId: echo.to,
      messageId: echo.id,
      text: echo.text?.body,
      type: echo.type,
    };
  }

  const message = value?.messages?.[0];
  if (!message) return null;

  const base = {
    from: message.from,
    name: value.contacts?.[0]?.profile?.name,
    messageId: message.id,
    type: message.type,
    category: classifyType(message.type),
  };

  if (message.type === "text") {
    return { ...base, text: message.text?.body };
  }

  if (message.type === "image" && message.image) {
    return {
      ...base,
      mediaId: message.image.id,
      mediaMimeType: message.image.mime_type,
      caption: message.image.caption,
    };
  }

  if (message.type === "document" && message.document) {
    return {
      ...base,
      mediaId: message.document.id,
      mediaMimeType: message.document.mime_type,
      caption: message.document.caption,
    };
  }

  return base;
}

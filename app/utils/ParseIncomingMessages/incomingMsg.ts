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
        field: string;
      };
    }>;
  }>;
};

export type MessageCategory = "text" | "ignore" | "handoff";

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

function classifyType(type: string): MessageCategory {
  if (type === "text") return "text";
  if (type === "reaction" || type === "sticker") return "ignore";
  return "handoff"; // image, document, audio, video, location, unknown, etc.
}

export function parseIncomingMessage(body: msgObj): ParsedMessage | null {
  const value = body.entry?.[0]?.changes?.[0]?.value;
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

  return base; // audio, video, location, reaction, sticker, unknown — category already set
}

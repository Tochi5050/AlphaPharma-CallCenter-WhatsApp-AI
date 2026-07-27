export const BASE_URL =
  typeof window !== "undefined"
    ? ""
    : "https://alpha-pharma-call-center-whats-app.vercel.app";

export type OrderDetailsItem = {
  item_name: string;
  uom: string;
  qty: number;
  unit_price: number;
};

export type OrderDetails = {
  items: OrderDetailsItem[];
  total: number;
  createdAt: number;
};

export type ConversationMessage = {
  role: string;
  content: string;
};

export type HandoffRecord = {
  id: string;
  waId: string;
  customerName?: string;
  category: string;
  reason: string;
  mediaUrl?: string;
  mediaType?: string;
  originalText?: string;
  orderDetails?: OrderDetails;
  conversationSnapshot: ConversationMessage[];
  timestamp: number;
  resolvedAt?: number;
  status: "pending" | "resolved";
};
export type HandoffSummary = {
  id: string;
  waId: string;
  customerName?: string;
  category: string;
  reason: string;
  timestamp: number;
  status: "pending" | "resolved";
};

export type SummaryResponse = {
  pending: number;
  awaitingPayment: number;
  resolvedToday: number;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,

    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchSummary(): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>("/api/dashboard/summary");
}

export async function fetchHandoffs(
  status: "pending" | "awaiting_payment" | "resolved" = "pending",
): Promise<{ handoffs: HandoffSummary[] }> {
  return apiFetch<{ handoffs: HandoffSummary[] }>(
    `/api/handsoff?status=${status}`,
  );
}

export async function fetchHandoff(
  id: string,
): Promise<{ handoff: HandoffRecord }> {
  return apiFetch<{ handoff: HandoffRecord }>(`/api/handsoffs/${id}`);
}

export async function resolveHandoff(
  id: string,
): Promise<{ handoff: HandoffRecord }> {
  console.log("resolveHandoff id =>", id);
  return apiFetch<{ handoff: HandoffRecord }>(`/api/handsoffs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "resolved" }),
  });
}

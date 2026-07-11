import { getAllHandoffs } from "@/app/utils/Redis/RedisSetup";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  const all = await getAllHandoffs();

  let filtered = all;
  if (status === "pending") {
    filtered = all.filter(
      (h) => h.status === "pending" && h.category !== "payment_proof",
    );
  } else if (status === "awaiting_payment") {
    filtered = all.filter(
      (h) => h.status === "pending" && h.category === "payment_proof",
    );
  } else if (status === "resolved") {
    filtered = all.filter((h) => h.status === "resolved");
  }

  filtered.sort((a, b) => b.timestamp - a.timestamp);

  const summary = filtered.map((h) => ({
    id: h.id,
    waId: h.waId,
    customerName: h.customerName,
    category: h.category,
    reason: h.reason,
    timestamp: h.timestamp,
    status: h.status,
  }));

  return NextResponse.json({ handoffs: summary });
}

import { getAllHandoffs } from "@/app/utils/Redis/RedisSetup";
import { NextResponse } from "next/server";

function isToday(timestamp: number): boolean {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
  }).format(new Date());
  const tsStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
  }).format(new Date(timestamp));
  return todayStr === tsStr;
}

export async function GET() {
  const all = await getAllHandoffs();

  const pending = all.filter(
    (h) => h.status === "pending" && h.category !== "payment_proof",
  ).length;
  const awaitingPayment = all.filter(
    (h) => h.status === "pending" && h.category === "payment_proof",
  ).length;
  const resolvedToday = all.filter(
    (h) => h.status === "resolved" && h.resolvedAt && isToday(h.resolvedAt),
  ).length;

  return NextResponse.json({ pending, awaitingPayment, resolvedToday });
}

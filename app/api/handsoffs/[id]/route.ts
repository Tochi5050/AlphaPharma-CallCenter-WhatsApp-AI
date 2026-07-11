import { getHandoffById, resolveHandoff } from "@/app/utils/Redis/RedisSetup";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const handoff = await getHandoffById(id);
  if (!handoff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ handoff });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (body.status !== "resolved") {
    return NextResponse.json(
      { error: "Only status: 'resolved' is supported" },
      { status: 400 },
    );
  }

  const updated = await resolveHandoff(id);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ handoff: updated });
}

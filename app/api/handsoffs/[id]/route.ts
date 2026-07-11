import { getHandoffById, resolveHandoff } from "@/app/utils/Redis/RedisSetup";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const handoff = await getHandoffById(params.id);
  if (!handoff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ handoff });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();

  if (body.status !== "resolved") {
    return NextResponse.json(
      { error: "Only status: 'resolved' is supported" },
      { status: 400 },
    );
  }

  const updated = await resolveHandoff(params.id);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ handoff: updated });
}

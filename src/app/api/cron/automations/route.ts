import { NextRequest, NextResponse } from "next/server";
import { processDelayedSteps } from "@/services/automation-engine";

export async function GET(request: NextRequest) {
  // Optional auth for cron security
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDelayedSteps();

  return NextResponse.json({
    success: true,
    processed: result.processed,
  });
}

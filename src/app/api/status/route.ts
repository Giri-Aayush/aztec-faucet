import { NextResponse } from "next/server";
import { FaucetManager } from "@/lib/faucet-manager";

export async function GET() {
  try {
    const manager = FaucetManager.getInstance();
    const status = await manager.getStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error("Status error:", err);
    return NextResponse.json(
      {
        healthy: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

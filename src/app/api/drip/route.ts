import { NextResponse } from "next/server";
import {
  FaucetManager,
  ThrottleError,
  AddressValidationError,
  type Asset,
} from "@/lib/faucet-manager";
import { verifyTurnstileToken } from "@/lib/turnstile";

const VALID_ASSETS: Asset[] = ["eth", "fee-juice", "test-token"];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  try {
    const { address, asset, captchaToken } = body as Record<string, unknown>;

    // Validate inputs
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 },
      );
    }

    if (!asset || !VALID_ASSETS.includes(asset as Asset)) {
      return NextResponse.json(
        { error: `Invalid asset. Must be one of: ${VALID_ASSETS.join(", ")}` },
        { status: 400 },
      );
    }

    // Verify CAPTCHA
    const captchaStr = typeof captchaToken === "string" ? captchaToken : "";
    const captchaValid = await verifyTurnstileToken(captchaStr);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "CAPTCHA verification failed. Please complete the CAPTCHA and try again." },
        { status: 403 },
      );
    }

    // Execute drip
    const manager = FaucetManager.getInstance();
    const result = await manager.drip(address, asset as Asset);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AddressValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 },
      );
    }

    if (err instanceof ThrottleError) {
      return NextResponse.json(
        { error: err.message, retryAfter: err.retryAfter },
        { status: 429 },
      );
    }

    console.error("Drip error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    // Cap error message length to avoid leaking verbose stack traces to client
    const truncated = message.length > 300 ? message.slice(0, 300) + "..." : message;
    return NextResponse.json(
      { error: truncated },
      { status: 500 },
    );
  }
}

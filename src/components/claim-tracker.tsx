"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CopyButton, DataField } from "./drip-result";

type ClaimStatus = "bridging" | "ready" | "expired";

type ClaimData = {
  claimAmount: string;
  claimSecretHex: string;
  claimSecretHashHex: string;
  messageHashHex: string;
  messageLeafIndex: string;
};

type ClaimResponse = {
  status: ClaimStatus;
  elapsedSeconds: number;
  claimData?: ClaimData;
  sdkSnippet?: string;
};

const POLL_INTERVAL_MS = 3_000;

export function ClaimTracker({
  claimId,
  onReset,
}: {
  claimId: string;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<ClaimStatus>("bridging");
  const [elapsed, setElapsed] = useState(0);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [sdkSnippet, setSdkSnippet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/claim/${claimId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Claim not found. It may have expired.");
          setStatus("expired");
        }
        return;
      }

      const data: ClaimResponse = await res.json();
      setStatus(data.status);
      setElapsed(data.elapsedSeconds);

      if (data.status === "ready" && data.claimData) {
        setClaimData(data.claimData);
        setSdkSnippet(data.sdkSnippet ?? null);
      }
    } catch {
      // Silently retry on network errors
    }
  }, [claimId]);

  // Poll the backend
  useEffect(() => {
    if (status !== "bridging") return;

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status, poll]);

  // Local elapsed timer for smooth display
  useEffect(() => {
    if (status !== "bridging") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-400">{error}</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Request again
        </button>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-400">
          This claim has expired.
        </p>
        <p className="mt-1 text-xs text-amber-400/70">
          The L1→L2 message took too long to be included. Please request Fee
          Juice again.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Request again
        </button>
      </div>
    );
  }

  if (status === "bridging") {
    return (
      <div className="mt-6 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-5 w-5">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/30" />
            <div className="relative h-5 w-5 rounded-full border-2 border-purple-500 bg-purple-500/20" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-300">
              Bridging Fee Juice from L1 to L2...
            </p>
            <p className="mt-0.5 text-xs text-purple-400/70">
              Waiting for the L1→L2 message to be picked up by the Aztec
              sequencer. This usually takes 1-2 minutes.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2">
          <span className="text-xs text-zinc-400">Elapsed</span>
          <span className="font-mono text-sm text-zinc-300">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <div className="mt-3">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full animate-pulse rounded-full bg-purple-500/50 transition-all duration-1000"
              style={{ width: `${Math.min((elapsed / 120) * 100, 95)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // status === "ready"
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-medium text-emerald-400">
          Fee Juice is ready to claim!
        </p>
        <p className="mt-1 text-xs text-emerald-400/70">
          The L1→L2 bridge message has been included on L2. Use the data below
          to claim your Fee Juice. See the SDK snippet for both new account
          deployment and existing account usage.
        </p>
      </div>

      {claimData && (
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <DataField label="Claim Amount" value={claimData.claimAmount} />
          <DataField label="Claim Secret" value={claimData.claimSecretHex} />
          <DataField
            label="Claim Secret Hash"
            value={claimData.claimSecretHashHex}
          />
          <DataField label="Message Hash" value={claimData.messageHashHex} />
          <DataField
            label="Message Leaf Index"
            value={claimData.messageLeafIndex}
          />
        </div>
      )}

      {claimData && (
        <details open>
          <summary className="cursor-pointer text-xs text-purple-400 hover:text-purple-300">
            CLI command
          </summary>
          <div className="mt-2 rounded-md border border-zinc-700 bg-zinc-800 p-3">
            <div className="overflow-x-auto">
              <pre className="text-xs text-zinc-300">{`node scripts/claim-fee-juice.mjs \\
  --secret <your-account-secret> \\
  --claim-amount ${claimData.claimAmount} \\
  --claim-secret ${claimData.claimSecretHex} \\
  --message-leaf-index ${claimData.messageLeafIndex}`}</pre>
            </div>
            <div className="mt-2 flex justify-end">
              <CopyButton
                text={`node scripts/claim-fee-juice.mjs \\\n  --secret <your-account-secret> \\\n  --claim-amount ${claimData.claimAmount} \\\n  --claim-secret ${claimData.claimSecretHex} \\\n  --message-leaf-index ${claimData.messageLeafIndex}`}
              />
            </div>
          </div>
        </details>
      )}

      {sdkSnippet && (
        <details>
          <summary className="cursor-pointer text-xs text-purple-400 hover:text-purple-300">
            SDK code snippet
          </summary>
          <div className="mt-2 rounded-md border border-zinc-700 bg-zinc-800 p-3">
            <div className="overflow-x-auto">
              <pre className="text-xs text-zinc-300">{sdkSnippet}</pre>
            </div>
            <div className="mt-2 flex justify-end">
              <CopyButton text={sdkSnippet} />
            </div>
          </div>
        </details>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
      >
        Request another drip
      </button>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

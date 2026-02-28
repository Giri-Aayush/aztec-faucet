import { FaucetForm } from "@/components/faucet-form";
import { NetworkStatus } from "@/components/network-status";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-white"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Aztec Faucet</h1>
          </div>
          <p className="text-sm text-zinc-400">
            Get test tokens for building on the Aztec devnet.
          </p>
        </div>

        {/* Network status */}
        <NetworkStatus />

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <FaucetForm />
        </div>

        {/* Info section for developers */}
        <div className="mt-6 space-y-3">
          <details className="group rounded-lg border border-zinc-800 bg-zinc-900/50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
              How does this work?
            </summary>
            <div className="space-y-2 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
              <p>
                <strong className="text-zinc-300">L1 ETH:</strong> Sent directly
                to your Ethereum address on the configured L1 chain. Used for L1
                gas fees.
              </p>
              <p>
                <strong className="text-zinc-300">Fee Juice:</strong> Bridged
                from L1 to L2 via the Fee Juice portal. You&apos;ll receive claim
                data that you need to submit on L2 to receive the tokens. Fee
                Juice is used to pay for Aztec L2 transaction fees.
              </p>
              <p>
                <strong className="text-zinc-300">Test Token:</strong> An ERC20
                token minted directly on Aztec L2 to your public balance. Useful
                for testing transfers and contract interactions.
              </p>
            </div>
          </details>

          <div className="text-center text-xs text-zinc-600">
            <p>Rate limited to one request per token per hour.</p>
            <p className="mt-1">
              <a
                href="https://docs.aztec.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-400"
              >
                Aztec Documentation
              </a>
              {" · "}
              <a
                href="https://docs.aztec.network/guides/getting_started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-400"
              >
                Getting Started
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

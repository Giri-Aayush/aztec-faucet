/**
 * Checks the L1 ETH balance of an Ethereum address on Sepolia.
 *
 * Usage:
 *   node scripts/check-eth-balance.mjs --address 0xYOUR_ETH_ADDRESS
 *   node scripts/check-eth-balance.mjs --address 0xYOUR_ETH_ADDRESS --rpc https://...
 */
import { createPublicClient, http, formatEther } from "viem";
import { sepolia } from "viem/chains";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

const address = getArg("address");
const rpcUrl = getArg("rpc") || process.env.L1_RPC_URL;

if (!address) {
  console.log(`
  Usage: node scripts/check-eth-balance.mjs --address <eth-address>

  Options:
    --address  Ethereum address (required, 0x + 40 hex chars)
    --rpc      L1 RPC URL (defaults to L1_RPC_URL env var)
`);
  process.exit(1);
}

if (!rpcUrl) {
  console.error("\n  Error: No RPC URL. Set L1_RPC_URL env var or pass --rpc.\n");
  process.exit(1);
}

try {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const balance = await client.getBalance({ address });
  const maskedRpc = rpcUrl.replace(/\/v2\/.*/, "/v2/***");

  console.log(`
  ETH Balance (Sepolia)
  ---------------------
  Address: ${address}
  RPC:     ${maskedRpc}
  Balance: ${formatEther(balance)} ETH (${balance.toString()} wei)
`);

  if (balance === 0n) {
    console.log("  No ETH found. Use the faucet to request Sepolia ETH.\n");
  }
} catch (err) {
  const msg = err.message || String(err);

  if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
    console.error(`\n  Error: Cannot connect to RPC at ${rpcUrl}.\n`);
  } else {
    console.error(`\n  Error: ${msg}\n`);
  }

  process.exit(1);
}

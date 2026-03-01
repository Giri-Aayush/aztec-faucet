/**
 * Checks the L1 ETH balance of an Ethereum address on Sepolia.
 *
 * Usage:
 *   node scripts/check-eth-balance.mjs --address 0xYOUR_ETH_ADDRESS
 *   node scripts/check-eth-balance.mjs --address 0xYOUR_ETH_ADDRESS --rpc https://eth-sepolia.g.alchemy.com/v2/KEY
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
  console.error("Usage: node scripts/check-eth-balance.mjs --address 0xYOUR_ETH_ADDRESS");
  console.error("\nOptions:");
  console.error("  --address  Ethereum address to check (required)");
  console.error("  --rpc      L1 RPC URL (defaults to L1_RPC_URL env var)");
  process.exit(1);
}

if (!rpcUrl) {
  console.error("Error: No RPC URL. Set L1_RPC_URL env var or pass --rpc");
  process.exit(1);
}

try {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  console.log("=== L1 ETH Balance Check ===\n");
  console.log("Address:", address);
  console.log("RPC:", rpcUrl.replace(/\/v2\/.*/, "/v2/***"));

  const balance = await client.getBalance({ address });

  console.log("\nBalance (wei):", balance.toString());
  console.log("Balance (ETH):", formatEther(balance));

  if (balance === 0n) {
    console.log("\nNo ETH found. Use the faucet to request ETH first.");
  } else {
    console.log("\nETH balance confirmed.");
  }
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exit(1);
}

/**
 * Checks the L2 Fee Juice balance of an Aztec address on devnet.
 *
 * Usage:
 *   node scripts/check-fee-juice-balance.mjs --address 0xYOUR_AZTEC_ADDRESS
 *   node scripts/check-fee-juice-balance.mjs --address 0xYOUR_AZTEC_ADDRESS --node https://v4-devnet-2.aztec-labs.com/
 */
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { deriveStorageSlotInMap } from "@aztec/stdlib/hash";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

const address = getArg("address");
const nodeUrl = getArg("node") || process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";

if (!address) {
  console.error("Usage: node scripts/check-fee-juice-balance.mjs --address 0xYOUR_AZTEC_ADDRESS");
  console.error("\nOptions:");
  console.error("  --address  Aztec address to check (required, 0x + 64 hex chars)");
  console.error("  --node     Aztec node URL (defaults to AZTEC_NODE_URL env var or devnet)");
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{64}$/.test(address)) {
  console.error("Error: Invalid Aztec address. Expected 0x + 64 hex characters.");
  process.exit(1);
}

try {
  const node = createAztecNodeClient(nodeUrl);

  console.log("=== L2 Fee Juice Balance Check ===\n");
  console.log("Address:", address);
  console.log("Node:", nodeUrl);

  // Fee Juice contract is at protocol address 0x05
  const feeJuiceAddress = AztecAddress.fromBigInt(5n);
  const owner = AztecAddress.fromString(address);

  // Fee Juice stores balances in a map at storage slot 1
  // Derive the specific storage slot for this address
  const balanceSlot = await deriveStorageSlotInMap(new Fr(1), owner);

  const balanceField = await node.getPublicStorageAt("latest", feeJuiceAddress, balanceSlot);
  const balance = balanceField.toBigInt();

  console.log("\nBalance (raw):", balance.toString());

  // Fee Juice has 18 decimals like ETH
  const formatted = formatFeeJuice(balance);
  console.log("Balance (Fee Juice):", formatted);

  if (balance === 0n) {
    console.log("\nNo Fee Juice found. Possible reasons:");
    console.log("  1. You haven't requested Fee Juice from the faucet yet");
    console.log("  2. The bridge is still pending (~2 minutes)");
    console.log("  3. You haven't claimed the Fee Juice yet (run claim-fee-juice.mjs)");
    console.log("  4. Fee Juice was already spent on transactions");
  } else {
    console.log("\nFee Juice balance confirmed. Your account has gas to transact on Aztec.");
  }

  // Also check if the account is deployed
  try {
    const metadata = await node.getContractMetadata(owner);
    console.log("\nAccount deployed:", metadata.isContractInitialized ? "Yes" : "No");
    if (!metadata.isContractInitialized) {
      console.log("  (Account needs to be deployed via claim-fee-juice.mjs)");
    }
  } catch {
    console.log("\nAccount deployed: Unknown (metadata check failed)");
  }
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exit(1);
}

function formatFeeJuice(raw) {
  const str = raw.toString().padStart(19, "0");
  const intPart = str.slice(0, str.length - 18) || "0";
  const decPart = str.slice(str.length - 18, str.length - 14); // 4 decimal places
  return `${intPart}.${decPart}`;
}

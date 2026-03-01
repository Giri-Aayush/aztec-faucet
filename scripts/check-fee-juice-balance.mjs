/**
 * Checks the L2 Fee Juice balance of an Aztec address.
 *
 * Usage:
 *   node scripts/check-fee-juice-balance.mjs --address 0xYOUR_AZTEC_ADDRESS
 *   node scripts/check-fee-juice-balance.mjs --address 0xYOUR_AZTEC_ADDRESS --node https://...
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

function formatFeeJuice(raw) {
  const str = raw.toString().padStart(19, "0");
  const intPart = str.slice(0, str.length - 18) || "0";
  const decPart = str.slice(str.length - 18, str.length - 14);
  return `${intPart}.${decPart}`;
}

const address = getArg("address");
const nodeUrl = getArg("node") || process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";

if (!address) {
  console.log(`
  Usage: node scripts/check-fee-juice-balance.mjs --address <aztec-address>

  Options:
    --address  Aztec address (required, 0x + 64 hex chars)
    --node     Aztec node URL (defaults to AZTEC_NODE_URL env or devnet)
`);
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{64}$/.test(address)) {
  console.error("\n  Error: Invalid Aztec address. Expected 0x + 64 hex characters.\n");
  process.exit(1);
}

try {
  const node = createAztecNodeClient(nodeUrl);
  const owner = AztecAddress.fromString(address);

  // Fee Juice contract at protocol address 0x05, balances in map at slot 1
  const feeJuiceAddress = AztecAddress.fromBigInt(5n);
  const balanceSlot = await deriveStorageSlotInMap(new Fr(1), owner);
  const balanceField = await node.getPublicStorageAt("latest", feeJuiceAddress, balanceSlot);
  const balance = balanceField.toBigInt();

  console.log(`
  Fee Juice Balance
  -----------------
  Address: ${address}
  Node:    ${nodeUrl}
  Balance: ${formatFeeJuice(balance)} Fee Juice (${balance.toString()} raw)
`);

  if (balance === 0n) {
    console.log(`  No balance found. Possible reasons:
    - Haven't requested Fee Juice from the faucet yet
    - L1→L2 bridge is still pending (~2 minutes)
    - Haven't claimed yet (run claim-fee-juice.mjs)
    - Fee Juice was already spent on transactions
`);
  }
} catch (err) {
  const msg = err.message || String(err);

  if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
    console.error(`\n  Error: Cannot connect to Aztec node at ${nodeUrl}.\n`);
  } else {
    console.error(`\n  Error: ${msg}\n`);
  }

  process.exit(1);
}

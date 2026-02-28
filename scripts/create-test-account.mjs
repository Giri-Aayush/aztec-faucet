/**
 * Creates an Aztec test account on devnet and prints the address.
 * Usage: node scripts/create-test-account.mjs
 */
import { Fr } from "@aztec/aztec.js/fields";
import { AztecAddress } from "@aztec/aztec.js/addresses";

// Generate a random secret key for this test account
const secretKey = Fr.random();
console.log("=== Aztec Test Account ===\n");
console.log("Secret Key:", secretKey.toString());

// To get the actual deployed address, we need to go through EmbeddedWallet
// For now, let's use the Aztec SDK to compute the account address
const { EmbeddedWallet } = await import("@aztec/wallets/embedded");

const nodeUrl = process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";
console.log("\nConnecting to:", nodeUrl);

try {
  const wallet = await EmbeddedWallet.create(nodeUrl, { ephemeral: true });
  const accountManager = await wallet.createSchnorrAccount(secretKey, Fr.ZERO);

  console.log("\nAztec Address:", accountManager.address.toString());
  console.log("\n(Account contract not yet deployed — just the address)\n");
  console.log("Use this address in the faucet to request Fee Juice or Test Tokens.");
  console.log("The faucet will bridge Fee Juice to this address on L2.");
} catch (err) {
  console.error("\nFailed to connect to Aztec node:", err.message);
  console.log("\nFallback: generating a random Aztec-format address for testing...");
  // Generate a random 32-byte hex string as a valid Aztec address format
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  console.log("Test Address:", hex);
  console.log("\n(This is a random address, not a real account)");
}

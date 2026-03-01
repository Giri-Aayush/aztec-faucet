/**
 * Creates a new Aztec account and prints the secret key + address.
 *
 * Usage:
 *   node scripts/create-aztec-account.mjs
 *   node scripts/create-aztec-account.mjs --secret 0xYOUR_EXISTING_SECRET
 */
const { EmbeddedWallet } = await import("@aztec/wallets/embedded");
const { Fr } = await import("@aztec/aztec.js/fields");

const nodeUrl = process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";

// Use provided secret or generate a random one
const existingSecret = process.argv.includes("--secret")
  ? process.argv[process.argv.indexOf("--secret") + 1]
  : null;

console.log("=== Aztec Account Setup ===\n");
console.log("Connecting to:", nodeUrl);

const wallet = await EmbeddedWallet.create(nodeUrl, { ephemeral: true });

let secretKey;
if (existingSecret) {
  secretKey = Fr.fromHexString(existingSecret);
  console.log("Using provided secret key.\n");
} else {
  secretKey = Fr.random();
  console.log("Generated new random secret key.\n");
}

const account = await wallet.createSchnorrAccount(secretKey, Fr.ZERO);

console.log("--- SAVE THESE VALUES ---\n");
console.log("Secret Key (KEEP PRIVATE):");
console.log(`  ${secretKey.toString()}\n`);
console.log("Aztec Address (paste into faucet):");
console.log(`  ${account.address.toString()}\n`);
console.log("--- NEXT STEPS ---\n");
console.log("1. Go to the faucet and select 'Fee Juice'");
console.log("2. Paste your Aztec address above");
console.log("3. Wait ~2 minutes for the bridge");
console.log("4. Copy the claim data");
console.log("5. Run:");
console.log(`   node scripts/claim-fee-juice.mjs \\`);
console.log(`     --secret ${secretKey.toString()} \\`);
console.log(`     --claim-amount <from faucet> \\`);
console.log(`     --claim-secret <from faucet> \\`);
console.log(`     --message-leaf-index <from faucet>\n`);

process.exit(0);

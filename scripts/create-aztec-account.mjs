/**
 * Creates a new Aztec account (or derives one from an existing secret key).
 *
 * Usage:
 *   node scripts/create-aztec-account.mjs
 *   node scripts/create-aztec-account.mjs --secret 0xYOUR_EXISTING_SECRET
 */

// Suppress all SDK logs
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";

const { EmbeddedWallet } = await import("@aztec/wallets/embedded");
const { Fr } = await import("@aztec/aztec.js/fields");

const nodeUrl = process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";
const existingSecret = process.argv.includes("--secret")
  ? process.argv[process.argv.indexOf("--secret") + 1]
  : null;

try {
  process.stdout.write(`\n  Connecting to ${nodeUrl}...`);
  const wallet = await EmbeddedWallet.create(nodeUrl, { ephemeral: true });
  console.log(" done");

  const secretKey = existingSecret ? Fr.fromHexString(existingSecret) : Fr.random();
  const account = await wallet.createSchnorrAccount(secretKey, Fr.ZERO);

  console.log(`
  Aztec Account
  -------------
  Secret Key (KEEP PRIVATE):
    ${secretKey.toString()}

  Address (paste into faucet):
    ${account.address.toString()}

  Next Steps
  ----------
  1. Go to the faucet and select "Fee Juice"
  2. Paste your Aztec address above
  3. Wait ~2 minutes for the L1→L2 bridge
  4. Copy the claim data from the faucet
  5. Run:

     node scripts/claim-fee-juice.mjs \\
       --secret ${secretKey.toString()} \\
       --claim-amount <from faucet> \\
       --claim-secret <from faucet> \\
       --message-leaf-index <from faucet>
`);

  await wallet.stop();
  process.exit(0);
} catch (err) {
  const msg = err.message || String(err);

  if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
    console.error(`\n  Error: Cannot connect to Aztec node at ${nodeUrl}.`);
    console.error("         Check AZTEC_NODE_URL or ensure the node is running.\n");
  } else {
    console.error(`\n  Error: ${msg}\n`);
  }

  process.exit(1);
}

/**
 * Claims bridged Fee Juice on L2 by deploying the test account.
 *
 * The Fee Juice bridge creates an L1→L2 message. To claim the tokens,
 * the recipient account must be deployed using FeeJuicePaymentMethodWithClaim,
 * which claims the Fee Juice AND uses it to pay for the deployment tx.
 *
 * Usage:
 *   node scripts/claim-fee-juice.mjs \
 *     --secret <account-secret-key> \
 *     --claim-amount <amount> \
 *     --claim-secret <secret-from-bridge> \
 *     --message-leaf-index <index>
 */
import { Fr } from "@aztec/aztec.js/fields";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { FeeJuicePaymentMethodWithClaim } from "@aztec/aztec.js/fee";
import { GasSettings } from "@aztec/stdlib/gas";
import { TxHash } from "@aztec/stdlib/tx";
import { retryUntil } from "@aztec/foundation/retry";

const { EmbeddedWallet } = await import("@aztec/wallets/embedded");

// Parse CLI args
function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

const accountSecret = getArg("secret");
const claimAmountStr = getArg("claim-amount");
const claimSecretStr = getArg("claim-secret");
const messageLeafIndexStr = getArg("message-leaf-index");

if (!accountSecret || !claimAmountStr || !claimSecretStr || !messageLeafIndexStr) {
  console.error("Usage: node scripts/claim-fee-juice.mjs \\");
  console.error("  --secret <account-secret-key> \\");
  console.error("  --claim-amount <amount> \\");
  console.error("  --claim-secret <secret-from-bridge> \\");
  console.error("  --message-leaf-index <index>");
  console.error("\nAll arguments are required. These values come from the faucet's Fee Juice drip response.");
  process.exit(1);
}

const nodeUrl = process.env.AZTEC_NODE_URL || "https://v4-devnet-2.aztec-labs.com/";

console.log("=== Fee Juice Claim ===\n");
console.log("Node URL:", nodeUrl);
console.log("Claim Amount:", claimAmountStr);
console.log("Message Leaf Index:", messageLeafIndexStr);

try {
  // Step 1: Create wallet and recreate the account
  console.log("\n[1/4] Creating embedded wallet and account (with prover)...");
  const wallet = await EmbeddedWallet.create(nodeUrl, {
    ephemeral: true,
    pxeConfig: { proverEnabled: true },
  });
  const secretKey = Fr.fromHexString(accountSecret);
  const accountManager = await wallet.createSchnorrAccount(secretKey, Fr.ZERO);
  const address = accountManager.address;
  console.log("Account address:", address.toString());

  // Step 2: Check if account is already deployed
  console.log("\n[2/4] Checking account status...");
  const metadata = await wallet.getContractMetadata(address);
  if (metadata.isContractInitialized) {
    console.log("Account is already deployed! Fee Juice has already been claimed.");
    process.exit(0);
  }
  console.log("Account not yet deployed. Will deploy with Fee Juice claim.");

  // Step 3: Deploy account with claim
  console.log("\n[3/4] Deploying account with Fee Juice claim...");
  const claim = {
    claimAmount: BigInt(claimAmountStr),
    claimSecret: Fr.fromHexString(claimSecretStr),
    messageLeafIndex: BigInt(messageLeafIndexStr),
  };

  const paymentMethod = new FeeJuicePaymentMethodWithClaim(address, claim);
  const deployMethod = await accountManager.getDeployMethod();

  // Get current min fees and add padding
  const node = createAztecNodeClient(nodeUrl);
  const currentMinFees = await node.getCurrentMinFees();
  const maxFeesPerGas = currentMinFees.mul(2);
  const gasSettings = GasSettings.default({ maxFeesPerGas });

  console.log("Sending deploy + claim transaction (proof generation may take ~10s)...");
  const sentTx = await deployMethod.send({
    from: AztecAddress.ZERO,
    fee: { gasSettings, paymentMethod },
  });

  // sentTx may be a TxHash or SentTx object
  const txHashStr = typeof sentTx === "string" ? sentTx : sentTx.toString();
  console.log("Transaction sent! Hash:", txHashStr);

  // Step 4: Wait for mining using polling
  console.log("\n[4/4] Waiting for transaction to be mined...");
  const txHash = TxHash.fromString(txHashStr.startsWith("0x") ? txHashStr : `0x${txHashStr}`);

  const receipt = await retryUntil(
    async () => {
      const r = await node.getTxReceipt(txHash);
      if (r.status === "pending") return undefined;
      return r;
    },
    "tx mined",
    120, // timeout seconds
    2,   // interval seconds
  );

  console.log("\nTransaction mined!");
  console.log("Status:", receipt.status);
  console.log("Execution:", receipt.executionResult);
  console.log("Block:", receipt.blockNumber);
  console.log("Fee:", receipt.transactionFee?.toString());

  if (receipt.executionResult === "success") {
    console.log("\n=== Success! ===");
    console.log("Account deployed at:", address.toString());
    console.log("Fee Juice claimed:", claimAmountStr);
    console.log("\nThe account now has Fee Juice to pay for L2 transactions.");
  } else {
    console.error("\nTransaction failed!");
    console.error("Revert reason:", receipt.revertReason?.toString());
    process.exit(1);
  }
} catch (err) {
  console.error("\nFailed:", err.message);
  if (err.stack) {
    console.error("\nStack:", err.stack);
  }
  process.exit(1);
}

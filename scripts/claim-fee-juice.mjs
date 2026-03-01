/**
 * Claims bridged Fee Juice on L2.
 *
 * - If account is NOT deployed: deploys it with FeeJuicePaymentMethodWithClaim
 *   (claims Fee Juice AND uses it to pay for the deploy tx in one shot)
 * - If account IS deployed: calls FeeJuice.claim() directly and pays with
 *   existing Fee Juice balance
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
  console.log("\n[1/3] Creating embedded wallet and account (with prover)...");
  const wallet = await EmbeddedWallet.create(nodeUrl, {
    ephemeral: true,
    pxeConfig: { proverEnabled: true },
  });
  const secretKey = Fr.fromHexString(accountSecret);
  const accountManager = await wallet.createSchnorrAccount(secretKey, Fr.ZERO);
  const address = accountManager.address;
  console.log("Account address:", address.toString());

  // Step 2: Check if account is already deployed
  console.log("\n[2/3] Checking account status...");
  const metadata = await wallet.getContractMetadata(address);
  const isDeployed = metadata.isContractInitialized;
  console.log("Account deployed:", isDeployed ? "Yes" : "No");

  const claim = {
    claimAmount: BigInt(claimAmountStr),
    claimSecret: Fr.fromHexString(claimSecretStr),
    messageLeafIndex: BigInt(messageLeafIndexStr),
  };

  const node = createAztecNodeClient(nodeUrl);
  const currentMinFees = await node.getCurrentMinFees();
  const maxFeesPerGas = currentMinFees.mul(2);
  const gasSettings = GasSettings.default({ maxFeesPerGas });

  if (!isDeployed) {
    // Account not deployed — deploy + claim in one tx
    console.log("\n[3/3] Deploying account with Fee Juice claim...");
    const paymentMethod = new FeeJuicePaymentMethodWithClaim(address, claim);
    const deployMethod = await accountManager.getDeployMethod();

    // DeployMethod.send() with wait: { returnReceipt: true } returns
    // { txHash, status, blockNumber, transactionFee, contract, instance }
    console.log("Sending deploy + claim transaction (proof generation may take ~10s)...");
    const result = await deployMethod.send({
      from: AztecAddress.ZERO,
      fee: { gasSettings, paymentMethod },
      wait: { returnReceipt: true },
    });

    console.log("\nTransaction mined!");
    console.log("Hash:", result.txHash?.toString());
    console.log("Status:", result.status);
    console.log("Block:", result.blockNumber);
    console.log("Fee:", result.transactionFee?.toString());
    console.log("\n=== Success! ===");
    console.log("Account deployed at:", address.toString());
    console.log("Fee Juice claimed:", claimAmountStr);
  } else {
    // Account already deployed — call claim() directly on the FeeJuice contract
    console.log("\n[3/3] Claiming Fee Juice on already-deployed account...");

    const { FeeJuiceContract } = await import("@aztec/aztec.js/protocol");

    // FeeJuiceContract.at() from @aztec/aztec.js/protocol takes only the wallet —
    // the FeeJuice protocol contract address is hardcoded in the constructor.
    const feeJuice = FeeJuiceContract.at(wallet);

    // BaseContractInteraction.send() calls wallet.sendTx() which already waits
    // for the tx to be mined and returns the receipt directly.
    console.log("Sending claim transaction (proof generation may take ~10s)...");
    const receipt = await feeJuice.methods
      .claim(address, claim.claimAmount, claim.claimSecret, new Fr(claim.messageLeafIndex))
      .send({ from: address, fee: { gasSettings } });

    console.log("\nTransaction mined!");
    console.log("Hash:", receipt.txHash?.toString());
    console.log("Status:", receipt.status);
    console.log("Block:", receipt.blockNumber);
    console.log("Fee:", receipt.transactionFee?.toString());
    console.log("\n=== Success! ===");
    console.log("Fee Juice claimed:", claimAmountStr);
  }

  console.log("\nThe account now has Fee Juice to pay for L2 transactions.");
  console.log("Check balance: node scripts/check-fee-juice-balance.mjs --address", address.toString());
} catch (err) {
  console.error("\nFailed:", err.message);
  if (err.stack) {
    console.error("\nStack:", err.stack);
  }
  process.exit(1);
}

import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { L1FeeJuicePortalManager } from "@aztec/aztec.js/ethereum";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { createExtendedL1Client } from "@aztec/ethereum/client";
import { createEthereumChain } from "@aztec/ethereum/chain";
import { Fr } from "@aztec/aztec.js/fields";
import { Mutex } from "async-mutex";
import { type Hex } from "viem";

export type L2FaucetConfig = {
  aztecNodeUrl: string;
  l1RpcUrl: string;
  l1ChainId: number;
  l1PrivateKey: Hex;
  sponsoredFpcAddress: string;
  tokenContractAddress?: string;
  tokenDripAmount?: number;
  feeJuiceDripAmount?: bigint;
  /** Hex-encoded secret for the faucet's Aztec account. Random if not set. */
  aztecAccountSecret?: string;
};

export type FeeJuiceClaimData = {
  claimAmount: string;
  claimSecretHex: string;
  claimSecretHashHex: string;
  messageHashHex: string;
  messageLeafIndex: string;
};

type WalletState = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any;
  accountAddress: AztecAddress;
};

let cachedWallet: WalletState | null = null;

async function getOrCreateWallet(
  nodeUrl: string,
  fpcAddress: AztecAddress,
  secret?: string,
): Promise<WalletState> {
  if (cachedWallet) return cachedWallet;

  const { EmbeddedWallet } = await import("@aztec/wallets/embedded");
  const wallet = await EmbeddedWallet.create(nodeUrl, { ephemeral: true });

  const accountSecret = secret ? Fr.fromHexString(secret) : Fr.random();
  const salt = Fr.ZERO;
  const accountManager = await wallet.createSchnorrAccount(accountSecret, salt);

  // Deploy the account contract using sponsored fees
  const paymentMethod = new SponsoredFeePaymentMethod(fpcAddress);
  const deployMethod = await accountManager.getDeployMethod();
  await deployMethod.send({
    from: accountManager.address,
    fee: { paymentMethod },
  });

  cachedWallet = { wallet, accountAddress: accountManager.address };
  return cachedWallet;
}

export class L2Faucet {
  private txMutex = new Mutex();
  private aztecNode;
  private fpcAddress: AztecAddress;

  constructor(private config: L2FaucetConfig) {
    this.aztecNode = createAztecNodeClient(config.aztecNodeUrl);
    this.fpcAddress = AztecAddress.fromString(config.sponsoredFpcAddress);
  }

  /**
   * Bridge Fee Juice from L1 to L2 for a recipient.
   * Returns claim data that the recipient uses to claim on L2.
   */
  async bridgeFeeJuice(
    recipientAztecAddress: string,
  ): Promise<FeeJuiceClaimData> {
    const recipient = AztecAddress.fromString(recipientAztecAddress);

    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(this.config.l1PrivateKey);
    const chain = createEthereumChain(
      [this.config.l1RpcUrl],
      this.config.l1ChainId,
    );
    const l1Client = createExtendedL1Client(
      [this.config.l1RpcUrl],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem version mismatch between top-level and @aztec/ethereum
      account as any,
      chain.chainInfo,
    );

    let portalManager;
    try {
      portalManager = await L1FeeJuicePortalManager.new(
        this.aztecNode,
        l1Client,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console as any,
      );
    } catch (err) {
      throw new Error(
        "Failed to connect to Fee Juice portal contracts on L1. " +
        "Ensure the Aztec L1 contracts are deployed on the configured chain. " +
        `(${err instanceof Error ? err.message : String(err)})`,
      );
    }

    let claim;
    try {
      claim = await portalManager.bridgeTokensPublic(
        recipient,
        this.config.feeJuiceDripAmount,
        true, // mint tokens first (test environment)
      );
    } catch (err) {
      throw new Error(
        "Fee Juice bridge transaction failed. " +
        "This usually means the L1 Fee Juice contracts are not deployed or the faucet account has insufficient L1 ETH. " +
        `(${err instanceof Error ? err.message : String(err)})`,
      );
    }

    return {
      claimAmount: claim.claimAmount.toString(),
      claimSecretHex: claim.claimSecret.toString(),
      claimSecretHashHex: claim.claimSecretHash.toString(),
      messageHashHex: claim.messageHash,
      messageLeafIndex: claim.messageLeafIndex.toString(),
    };
  }

  /**
   * Mint L2 test tokens to a recipient's public balance.
   * Uses the Sponsored FPC to pay fees.
   * Requires the faucet account to be a minter on the token contract.
   */
  async mintTestToken(
    recipientAztecAddress: string,
    amount?: number,
  ): Promise<string> {
    if (!this.config.tokenContractAddress) {
      throw new Error("L2 token contract address not configured");
    }

    const recipient = AztecAddress.fromString(recipientAztecAddress);
    const mintAmount = amount ?? this.config.tokenDripAmount ?? 100;
    const tokenAddress = AztecAddress.fromString(
      this.config.tokenContractAddress,
    );
    const paymentMethod = new SponsoredFeePaymentMethod(this.fpcAddress);

    // Serialize L2 transactions to avoid PXE nonce conflicts
    return this.txMutex.runExclusive(async () => {
      let wallet, accountAddress;
      try {
        ({ wallet, accountAddress } = await getOrCreateWallet(
          this.config.aztecNodeUrl,
          this.fpcAddress,
          this.config.aztecAccountSecret,
        ));
      } catch (err) {
        throw new Error(
          "Failed to initialize L2 wallet. " +
          "Ensure the Aztec node is reachable and the Sponsored FPC contract is deployed. " +
          `(${err instanceof Error ? err.message : String(err)})`,
        );
      }

      try {
        const token = TokenContract.at(tokenAddress, wallet);
        const receipt = await token.methods
          .mint_to_public(recipient, mintAmount)
          .send({ from: accountAddress, fee: { paymentMethod } });

        return receipt.txHash.toString();
      } catch (err) {
        throw new Error(
          "Failed to mint test tokens. " +
          "Ensure the faucet account is a minter on the token contract and the Aztec node is reachable. " +
          `(${err instanceof Error ? err.message : String(err)})`,
        );
      }
    });
  }
}

import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { L1FeeJuicePortalManager } from "@aztec/aztec.js/ethereum";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createExtendedL1Client } from "@aztec/ethereum/client";
import { createEthereumChain } from "@aztec/ethereum/chain";
import { type Hex } from "viem";

export type L2FaucetConfig = {
  aztecNodeUrl: string;
  l1RpcUrl: string;
  l1ChainId: number;
  l1PrivateKey: Hex;
  sponsoredFpcAddress: string;
  feeJuiceDripAmount?: bigint;
};

export type FeeJuiceClaimData = {
  claimAmount: string;
  claimSecretHex: string;
  claimSecretHashHex: string;
  messageHashHex: string;
  messageLeafIndex: string;
};

export class L2Faucet {
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

}

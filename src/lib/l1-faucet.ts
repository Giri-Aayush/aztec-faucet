import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  getContract,
  type Hex,
  type Chain,
  type HttpTransport,
  type Account,
} from "viem";
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { sepolia, foundry } from "viem/chains";
import { TestERC20Abi } from "@aztec/l1-artifacts";

export type L1FaucetConfig = {
  rpcUrl: string;
  chainId: number;
  privateKey: Hex;
  ethDripAmount: string; // e.g. "0.1"
};

const CHAIN_MAP: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [foundry.id]: foundry,
};

export class L1Faucet {
  private publicClient;
  private walletClient;
  private account: PrivateKeyAccount;
  private chain: Chain;

  constructor(private config: L1FaucetConfig) {
    this.chain = CHAIN_MAP[config.chainId] ?? {
      id: config.chainId,
      name: `Chain ${config.chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    };

    this.account = privateKeyToAccount(config.privateKey);

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient<HttpTransport, Chain, Account>({
      account: this.account,
      chain: this.chain,
      transport: http(config.rpcUrl),
    });
  }

  get address(): Hex {
    return this.account.address;
  }

  async getBalance(): Promise<bigint> {
    return this.publicClient.getBalance({ address: this.account.address });
  }

  async sendEth(to: Hex): Promise<Hex> {
    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      to,
      value: parseEther(this.config.ethDripAmount),
      chain: this.chain,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async mintERC20(to: Hex, tokenAddress: Hex, amount: bigint): Promise<Hex> {
    const token = getContract({
      address: tokenAddress,
      abi: TestERC20Abi,
      client: this.walletClient,
    });

    const hash = await token.write.mint([to, amount]);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
}

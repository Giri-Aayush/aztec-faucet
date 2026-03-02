<div align="center">

<br />

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width="48" height="48">
  <path d="M16 2L28 16L16 30L4 16L16 2Z" stroke="#D4FF28" stroke-width="1.5" fill="#D4FF28" fill-opacity="0.08"/>
  <path d="M16 8L22 16L16 24L10 16L16 8Z" stroke="#D4FF28" stroke-width="1" fill="#D4FF28" fill-opacity="0.15"/>
</svg>

# Aztec Faucet

**The missing piece between local development and devnet.**
Get L1 ETH, L2 Fee Juice, and L2 test tokens — in one place.

![Sepolia](https://img.shields.io/badge/L1-Sepolia-D4FF28?style=flat-square&labelColor=0a0a0f&color=D4FF28)
![Devnet](https://img.shields.io/badge/L2-Aztec_Devnet-D4FF28?style=flat-square&labelColor=0a0a0f&color=D4FF28)
![SDK](https://img.shields.io/badge/SDK-4.0.0--devnet-2BFAE9?style=flat-square&labelColor=0a0a0f&color=2BFAE9)

</div>

---

## The problem

When you move from local network to devnet, you immediately hit a wall:

- You need **Fee Juice** to pay for your first transaction
- Fee Juice can only be claimed by deploying an account
- Deploying an account requires Fee Juice

The Aztec devnet has no official faucet. The Sponsored FPC can cover your first account deployment — but it gives you nothing to pay for subsequent transactions yourself.

This faucet breaks that loop.

---

## Getting started on devnet

Every new developer on Aztec devnet faces the same bootstrap problem: you need Fee Juice to deploy an account, but you need an account to claim Fee Juice. There are two ways out.

---

### Quickstart — using the included scripts

The faucet ships with scripts that handle the full flow. The `claim-fee-juice.mjs` script automatically detects whether your account is deployed yet and does the right thing either way.

```bash
# Step 1 — derive your Aztec address (no deployment yet)
node scripts/create-aztec-account.mjs
# → prints your secret key and Aztec address

# Step 2 — paste the address into the faucet, request Fee Juice
# → wait ~1–2 min for the L1→L2 bridge

# Step 3 — claim (script auto-detects deployed vs not)
node scripts/claim-fee-juice.mjs \
  --secret <your-secret-key> \
  --claim-amount <from faucet> \
  --claim-secret <from faucet> \
  --message-leaf-index <from faucet>
```

**What `create-aztec-account.mjs` actually does:** it does not deploy anything. On Aztec, every account address is derived deterministically from your secret key — the contract can exist on-chain before it is ever deployed. The script computes that address locally and prints it, so you can give it to the faucet immediately.

**What `claim-fee-juice.mjs` actually does:**
- If your account is **not yet deployed** → deploys the contract and claims Fee Juice **in a single atomic transaction**, using the claimed Fee Juice itself to pay the deployment fee (`FeeJuicePaymentMethodWithClaim`).
- If your account **is already deployed** → calls `FeeJuice.claim()` directly, paying gas from your existing Fee Juice balance.

---

### Path A — New account: atomic deploy + claim (SDK)

If you're building programmatically and don't have a deployed account yet. No Sponsored FPC involved.

```
1. Derive your Aztec address from your secret key (no network call needed)
         │
         ▼
2. Request Fee Juice from this faucet using that address → receive claim data
         │
         ▼  (~1–2 min for the L1→L2 bridge)
3. Deploy your account + claim Fee Juice in one atomic transaction
   — the claimed Fee Juice pays for the deployment itself
         │
         ▼
4. Account is live. Fee Juice balance is funded. Fully self-sufficient.
```

```ts
import { FeeJuicePaymentMethodWithClaim } from "@aztec/aztec.js/fee";
import { Fr } from "@aztec/aztec.js/fields";

// claim data returned by the faucet
const claim = {
  claimAmount: 1000000000000000000000n,
  claimSecret: Fr.fromHexString("0x..."),
  messageLeafIndex: 123n,
};

// deploys your account AND claims Fee Juice in one tx —
// the claimed Fee Juice pays the deployment fee atomically
const paymentMethod = new FeeJuicePaymentMethodWithClaim(accountAddress, claim);
await deployMethod.send({ fee: { paymentMethod } });
```

---

### Path B — Existing account: deploy with Sponsored FPC, then claim

If you've already deployed your account via the Sponsored FPC (e.g. with `aztec-wallet create-account --payment-method=sponsored_fpc --network devnet`), your account exists but has no Fee Juice balance. You claim into it as a separate step.

> **Why the Sponsored FPC?** It's a contract on devnet (`0x09a4df73...caffb2`) that pays transaction fees unconditionally — it breaks the chicken-and-egg problem for your very first deployment. But it gives you no ongoing Fee Juice balance. If you skip it and have no Fee Juice, the only other way to deploy is Path A (atomic claim). There is no third option.

```
1. aztec-wallet create-account --payment-method=sponsored_fpc --network devnet
   → Account deployed, FPC paid the fee, but you have zero Fee Juice
         │
         ▼
2. Request Fee Juice from this faucet → receive claim data
         │
         ▼  (~1–2 min for the L1→L2 bridge)
3. Claim Fee Juice into your existing account
         │
         ▼
4. Account is funded. Fully self-sufficient.
```

**Via SDK:**

```ts
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { AztecAddress } from "@aztec/aztec.js/addresses";

// Step 1 — deploy with Sponsored FPC
const SPONSORED_FPC = AztecAddress.fromString("0x09a4df73aa47f82531a038d1d51abfc85b27665c4b7ca751e2d4fa9f19caffb2");
const paymentMethod = new SponsoredFeePaymentMethod(SPONSORED_FPC);
const deployMethod = await accountManager.getDeployMethod();
await deployMethod.send({ fee: { paymentMethod } });

// Step 2 — after getting claim data from the faucet, claim Fee Juice
import { FeeJuiceContract } from "@aztec/aztec.js/protocol";
import { Fr } from "@aztec/aztec.js/fields";

const feeJuice = FeeJuiceContract.at(wallet);
await feeJuice.methods
  .claim(accountAddress, claim.claimAmount, claim.claimSecret, new Fr(claim.messageLeafIndex))
  .send({ from: accountAddress, fee: { gasSettings } });
```

**Or use the script** (it auto-detects that your account is already deployed):

```bash
node scripts/claim-fee-juice.mjs \
  --secret <your-account-secret> \
  --claim-amount 1000000000000000000000 \
  --claim-secret 0x... \
  --message-leaf-index 123
```

---

## What you get

### `ETH` — L1 Sepolia

Sent directly to your Ethereum address. Use this to pay for L1 transactions and to fund your own bridging operations.

```
0.1 ETH · once per hour · per address
```

---

### `Fee Juice` — L2 gas token

Fee Juice is Aztec's native gas token. Unlike ETH, it **cannot be minted on L2** — it must be bridged from L1 through the Fee Juice Portal contract. The faucet handles the bridge on your behalf and returns everything you need to claim.

```
1000 Fee Juice · once per hour · per address
```

When the bridge is ready (~1–2 min), you receive:

| Field | Description |
|-------|-------------|
| `claimAmount` | Amount of Fee Juice to claim |
| `claimSecret` | Your private claim secret |
| `messageLeafIndex` | Index of the L1→L2 message in the tree |

See [Getting started on devnet](#getting-started-on-devnet) for how to use this data — whether you're deploying a new account or claiming into an existing one.

---

### `Test Token` — L2 ERC20

An ERC20 token minted directly to your Aztec public balance. No bridging, no waiting — instant. Use it to test token transfers, private balances, and FPC payment flows.

```
100 tokens · once per hour · per address
```

```ts
import { TokenContract } from "@aztec/noir-contracts.js/Token";

const token = TokenContract.at(tokenAddress, wallet);
const balance = await token.methods.balance_of_public(myAddress).simulate();
```

---

## Check your Fee Juice balance

The faucet UI includes a **Check Balance** tab. Paste your Aztec address and it generates a single terminal command — no extra tools needed.

Fee Juice is stored in **public storage** on Aztec (unlike private tokens which use encrypted notes). The sequencer reads it directly to verify gas payment before executing any transaction, so it must be publicly visible. This means you can check any address's balance without a wallet or private key.

The generated command installs the required packages once into `~/.aztec-devtools`, then reads the public storage slot directly from the Aztec node:

```bash
# generated by the faucet UI — address pre-filled
mkdir -p ~/.aztec-devtools && \
cd ~/.aztec-devtools && \
echo '{"type":"module"}' > package.json && \
npm install --no-package-lock @aztec/aztec.js@devnet @aztec/stdlib@devnet && \
node --input-type=module << 'AZTEC_EOF'
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { deriveStorageSlotInMap } from "@aztec/stdlib/hash";
const node = createAztecNodeClient("https://v4-devnet-2.aztec-labs.com/");
const owner = AztecAddress.fromString("0x<your-address>");
const slot = await deriveStorageSlotInMap(new Fr(1), owner);
const raw = (await node.getPublicStorageAt("latest", AztecAddress.fromBigInt(5n), slot)).toBigInt();
const s = raw.toString().padStart(19, "0");
console.log("Fee Juice balance:", (s.slice(0, s.length - 18) || "0") + "." + s.slice(s.length - 18, s.length - 14));
AZTEC_EOF
```

Or use the canonical SDK helper directly in your own scripts:

```ts
import { getFeeJuiceBalance } from "@aztec/aztec.js";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { AztecAddress } from "@aztec/aztec.js/addresses";

const node = createAztecNodeClient("https://v4-devnet-2.aztec-labs.com/");
const balance = await getFeeJuiceBalance(AztecAddress.fromString("0x..."), node);
console.log(balance); // bigint, raw units (1 Fee Juice = 10^18)
```

> **Why is balance zero after claiming?** The bridge takes ~1–2 minutes. If you check immediately after requesting Fee Juice, the L1→L2 message hasn't landed yet — wait a moment and check again.

---

## How the Fee Juice bridge works

```
You request Fee Juice
         │
         ▼
Faucet calls bridgeTokensPublic() on the L1 Fee Juice Portal
         │
         ├─ Mints Fee Juice on L1  (devnet privilege)
         ├─ Locks it in the portal contract
         └─ Queues an L1 → L2 message for your address
                    │
                    ▼  (1–2 minutes)
         Aztec sequencer includes the message in a block
                    │
                    ▼
         Claim data is ready — use it to claim on L2
```

The claim data is valid for **30 minutes**. After that, request again.

---

## Devnet details

| | |
|--|--|
| **L1 Network** | Sepolia (`11155111`) |
| **Aztec Node** | `https://v4-devnet-2.aztec-labs.com/` |
| **SDK Version** | `@aztec/*@devnet` (`4.0.0-devnet.2-patch.3`) |
| **Sponsored FPC** | `0x09a4df73...caffb2` |
| **Block Explorer** | [devnet.aztecscan.xyz](https://devnet.aztecscan.xyz) |

---

## API

The faucet exposes a public status endpoint — useful for scripts and CI:

```bash
curl https://<your-faucet-url>/api/status
```

```json
{
  "healthy": true,
  "l1BalanceEth": "1.23",
  "assets": [
    { "name": "eth", "available": true },
    { "name": "fee-juice", "available": true },
    { "name": "test-token", "available": true }
  ]
}
```

---

<div align="center">

[Aztec Documentation](https://docs.aztec.network) · [Getting Started on Devnet](https://docs.aztec.network/developers/getting_started_on_devnet) · [aztec.js SDK](https://docs.aztec.network/developers/docs/aztec-js)

</div>

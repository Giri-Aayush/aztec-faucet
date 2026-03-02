"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Does my secret key ever leave my device?",
    answer:
      "Your secret key never touches any server. The SDK snippets and curl commands run entirely on your own machine, so your keys stay local. The faucet only sees your Aztec address and the Cloudflare Turnstile token used to prevent abuse.",
  },
  {
    question: "Why does it take a minute or two to receive Fee Juice?",
    answer:
      "Fee Juice starts on Ethereum (Sepolia) and has to be bridged to Aztec L2 through the Fee Juice Portal. The Aztec sequencer picks up the bridge message and relays it to L2, which normally takes one to two minutes. The claim tracker on the result screen will update you as soon as it lands.",
  },
  {
    question: "My claim proof seems to have expired. What happened?",
    answer:
      "The claim proof you get after requesting Fee Juice is valid for roughly 30 minutes. If you wait longer than that before deploying your account, the proof will no longer be accepted. Just request a fresh batch from the faucet and use the new claim data right away.",
  },
  {
    question: "How often can I request tokens?",
    answer:
      "Each wallet address can request once every 24 hours per asset. So you can get ETH once per day and Fee Juice once per day. If you hit the limit, try again the next day.",
  },
  {
    question: "What is Fee Juice exactly?",
    answer:
      "Fee Juice is the gas token for the Aztec network, similar to how ETH pays for gas on Ethereum. Every transaction you send on Aztec needs a small amount of Fee Juice. The faucet bridges it from L1 so you can start transacting without needing to buy or bridge anything yourself.",
  },
  {
    question: "Why do I need an Aztec address instead of just my Ethereum address?",
    answer:
      "Aztec and Ethereum are separate networks with different address formats. Aztec accounts live on L2 and are created using the Aztec SDK. Fee Juice and test tokens go directly to your Aztec address on L2, while the ETH goes to your Ethereum address on Sepolia.",
  },
  {
    question: "Will these tokens work on Aztec mainnet?",
    answer:
      "No. These are testnet tokens only and have no real value. They work on the Aztec devnet for building and testing. Never use a wallet with real funds on this faucet.",
  },
  {
    question: "I already deployed my account. Can I still claim Fee Juice?",
    answer:
      "Yes! If your account is already deployed, you can claim the bridged Fee Juice using the Aztec CLI or the SDK snippet shown in the claim tracker. The faucet bridges the tokens regardless of whether your account is deployed yet. Just use the claim data before the proof expires.",
  },
];

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-zinc-200 pr-4">{item.question}</span>
        <span
          className={`shrink-0 text-chartreuse transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? "rotate-45" : ""}`}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {/* grid-template-rows 0fr→1fr animates to unknown heights without JS measurement */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/6 px-5 pb-4 pt-3">
            <p className="text-sm leading-relaxed text-zinc-400">{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqView() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="mx-auto max-w-lg">
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <FaqAccordion
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-zinc-600">
        Still have questions?{" "}
        <a
          href="https://docs.aztec.network"
          target="_blank"
          rel="noopener noreferrer"
          className="text-chartreuse/60 transition-colors hover:text-chartreuse"
        >
          Read the Aztec docs
        </a>
      </p>
    </div>
  );
}

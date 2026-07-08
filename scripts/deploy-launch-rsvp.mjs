import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import solc from "solc";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(join(root, ".env.local"));

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env.local or shell env.");
}

const account = privateKeyToAccount(
  privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
);

const sourcePath = join(root, "contracts", "BaseLaunchRsvp.sol");
const source = readFileSync(sourcePath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "BaseLaunchRsvp.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
if (errors.length) {
  throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
}

const contract = output.contracts["BaseLaunchRsvp.sol"].BaseLaunchRsvp;
const bytecode = `0x${contract.evm.bytecode.object}`;
const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(rpcUrl),
});

console.log(`Deploying BaseLaunchRsvp from ${account.address} on Base...`);

const hash = await walletClient.deployContract({
  abi: contract.abi,
  bytecode,
  args: [],
});

console.log(`Transaction: https://basescan.org/tx/${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`Contract: ${receipt.contractAddress}`);
console.log(
  "Set NEXT_PUBLIC_LAUNCH_RSVP_CONTRACT_ADDRESS to this contract address in Vercel.",
);

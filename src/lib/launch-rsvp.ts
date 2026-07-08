import type { Address } from "viem";

export const launchRsvpAbi = [
  {
    type: "function",
    name: "rsvp",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "hasRsvped",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getEventSummary",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "eventName", type: "string" },
      { name: "venue", type: "string" },
      { name: "eventDate", type: "string" },
      { name: "capacity", type: "uint256" },
      { name: "reserved", type: "uint256" },
    ],
  },
] as const;

export const launchRsvpContractAddress = process.env
  .NEXT_PUBLIC_LAUNCH_RSVP_CONTRACT_ADDRESS as Address | undefined;

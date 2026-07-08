"use client";

import {
  CalendarRange,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import { launchRsvpAbi, launchRsvpContractAddress } from "@/lib/launch-rsvp";

function shortAddress(address?: Address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function LaunchRsvpApp() {
  const [status, setStatus] = useState(
    "Reserve a seat on Base and receive an onchain RSVP record.",
  );
  const [walletStatus, setWalletStatus] = useState("");

  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync, isPending: disconnecting } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const {
    data: hash,
    writeContract,
    isPending: signing,
    error: writeError,
  } = useWriteContract();

  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash });

  const availableConnectors = useMemo(
    () =>
      connectors
        .filter((item) => item.type !== "mock")
        .sort((a, b) => {
          const score = (item: (typeof connectors)[number]) => {
            if (item.id === "baseAccount" || item.name === "Base Account") {
              return 0;
            }
            if (item.type === "injected") return 1;
            return 2;
          };

          return score(a) - score(b);
        }),
    [connectors],
  );

  const eventQuery = useReadContract({
    abi: launchRsvpAbi,
    address: launchRsvpContractAddress,
    functionName: "getEventSummary",
    query: {
      enabled: Boolean(launchRsvpContractAddress),
      refetchInterval: 12000,
    },
  });

  const attendeeQuery = useReadContract({
    abi: launchRsvpAbi,
    address: launchRsvpContractAddress,
    functionName: "hasRsvped",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(launchRsvpContractAddress && address),
      refetchInterval: 12000,
    },
  });

  const summaryTuple = eventQuery.data as
    | readonly [string, string, string, bigint, bigint]
    | undefined;
  const summary = summaryTuple
    ? {
        eventName: summaryTuple[0],
        venue: summaryTuple[1],
        eventDate: summaryTuple[2],
        capacity: summaryTuple[3],
        reserved: summaryTuple[4],
      }
    : undefined;

  const hasRsvped = Boolean(attendeeQuery.data);
  const reserved = Number(summary?.reserved ?? BigInt(0));
  const capacity = Number(summary?.capacity ?? BigInt(0));
  const remainingSeats = Math.max(capacity - reserved, 0);

  const canRsvp =
    Boolean(launchRsvpContractAddress) &&
    isConnected &&
    chainId === base.id &&
    !hasRsvped &&
    remainingSeats > 0;

  const disabledReason = !launchRsvpContractAddress
    ? "Contract address is not configured in this deployment yet."
    : !isConnected
      ? "Connect your wallet to reserve a seat."
      : chainId !== base.id
        ? "Switch your wallet to Base mainnet."
        : hasRsvped
          ? "This wallet has already reserved a seat."
          : remainingSeats <= 0
            ? "All seats have been reserved."
            : null;

  const statusText = confirmed
    ? "RSVP confirmed on Base. Your seat is now reserved."
    : writeError
      ? writeError.message
      : status;

  function reserveSeat() {
    if (!launchRsvpContractAddress) return;

    setStatus("Confirm the RSVP transaction in your wallet.");
    writeContract({
      address: launchRsvpContractAddress,
      abi: launchRsvpAbi,
      functionName: "rsvp",
      chainId: base.id,
    });
  }

  async function connectWallet() {
    const errors: string[] = [];
    setWalletStatus("Opening wallet...");

    for (const item of availableConnectors) {
      try {
        await connectAsync({ connector: item, chainId: base.id });
        setWalletStatus("");
        return;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `${item.name}: ${error.message}`
            : `${item.name}: connection failed`,
        );
      }
    }

    setWalletStatus(
      errors[0] ??
        "No wallet connector is available. Open this app inside Base App or install a wallet.",
    );
  }

  async function disconnectWallet() {
    try {
      if (connector) {
        await disconnectAsync({ connector });
      } else {
        await disconnectAsync();
      }
      setWalletStatus("Wallet disconnected. Tap Connect to reconnect.");
    } catch (error) {
      setWalletStatus(
        error instanceof Error ? error.message : "Could not disconnect wallet.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1d1b18]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#1d1b18] pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-[#1d1b18] bg-[#d2bf7f]">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8c6c16]">
                Base Launch RSVP
              </p>
              <h1 className="text-xl font-black sm:text-2xl">
                Reserve your launch seat onchain.
              </h1>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#1d1b18] bg-white px-3 py-2 text-sm font-semibold">
                {shortAddress(address)}
              </span>
              <button
                className="rounded-full border border-[#1d1b18] bg-[#1d1b18] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={disconnecting}
                onClick={disconnectWallet}
              >
                {disconnecting ? "Disconnecting" : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#1d1b18] bg-[#1d1b18] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={availableConnectors.length === 0 || connecting}
              onClick={connectWallet}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect
            </button>
          )}
          {walletStatus ? (
            <p className="w-full text-right text-xs font-semibold text-[#6d6251]">
              {walletStatus}
            </p>
          ) : null}
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[34px] border border-[#1d1b18] bg-[linear-gradient(180deg,#faf6ef_0%,#efe2c6_100%)] p-5 shadow-[0_18px_48px_rgba(29,27,24,0.10)]">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#1d1b18] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Onchain attendance
              </p>
              <h2 className="text-4xl font-black leading-tight sm:text-6xl">
                RSVP for the next Base launch moment.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d564f] sm:text-lg">
                One wallet, one seat. The RSVP is simple: connect, reserve, and
                receive a permanent onchain attendance record for the event.
              </p>
            </div>

            <div className="mt-8 rounded-[34px] border border-[#1d1b18] bg-[#1d1b18] p-5 text-white">
              <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c995]">
                    Event ticket
                  </p>
                  <h3 className="mt-2 text-3xl font-black">
                    {summary?.eventName ?? "Base Launch Night"}
                  </h3>
                </div>
                <div className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">
                  RSVP pass
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/20 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-[#d8c995]">
                    <CalendarRange className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-[0.18em]">
                      Date
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-black">
                    {summary?.eventDate ?? "Jun 20, 2026"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/20 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-[#d8c995]">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-[0.18em]">
                      Venue
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-black">
                    {summary?.venue ?? "Base Hall"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/20 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-[#d8c995]">
                    <Ticket className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-[0.18em]">
                      Seats left
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-black">
                    {summary ? `${remainingSeats}/${capacity}` : "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#1d1b18] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8c6c16]">
                  Step 1
                </p>
                <p className="mt-2 text-lg font-semibold">Connect wallet</p>
              </div>
              <div className="rounded-[24px] border border-[#1d1b18] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8c6c16]">
                  Step 2
                </p>
                <p className="mt-2 text-lg font-semibold">Reserve one seat</p>
              </div>
              <div className="rounded-[24px] border border-[#1d1b18] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8c6c16]">
                  Step 3
                </p>
                <p className="mt-2 text-lg font-semibold">Show your pass</p>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[34px] border border-[#1d1b18] bg-white p-5 shadow-[0_18px_48px_rgba(29,27,24,0.10)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#efe2c6]">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Reserve seat</h3>
                  <p className="text-sm text-[#5d564f]">
                    One wallet can reserve one place for this event.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm font-semibold text-[#5d564f]">
                <p className="flex items-center gap-2">
                  {launchRsvpContractAddress ? (
                    <CheckCircle2 className="h-4 w-4 text-[#8c6c16]" />
                  ) : (
                    <Sparkles className="h-4 w-4 opacity-60" />
                  )}
                  Contract configured
                </p>
                <p className="flex items-center gap-2">
                  {!hasRsvped ? (
                    <CheckCircle2 className="h-4 w-4 text-[#8c6c16]" />
                  ) : (
                    <Sparkles className="h-4 w-4 opacity-60" />
                  )}
                  Not already reserved
                </p>
              </div>

              {chainId !== base.id && isConnected ? (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1d1b18] px-4 py-3 font-semibold text-white disabled:opacity-60"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: base.id })}
                >
                  {switching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Switch to Base
                </button>
              ) : (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1d1b18] px-4 py-3 font-semibold text-white disabled:opacity-60"
                  disabled={!canRsvp || signing || confirming}
                  onClick={reserveSeat}
                >
                  {signing || confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ticket className="h-4 w-4" />
                  )}
                  {hasRsvped ? "Seat reserved" : "Reserve on Base"}
                </button>
              )}

              {disabledReason ? (
                <p className="mt-3 text-sm leading-6 text-[#7a6d5f]">
                  {disabledReason}
                </p>
              ) : null}
            </section>

            <section className="rounded-[34px] border border-[#1d1b18] bg-[#1d1b18] p-5 text-white shadow-[0_18px_48px_rgba(29,27,24,0.10)]">
              <h3 className="text-2xl font-black">Pass status</h3>
              <p className="mt-4 min-h-16 text-sm leading-6 text-[#d8c995]">
                {statusText}
              </p>

              {!launchRsvpContractAddress ? (
                <p className="rounded-[18px] border border-white/20 bg-white/10 p-3 text-xs leading-6 text-[#d8c995]">
                  Add `NEXT_PUBLIC_LAUNCH_RSVP_CONTRACT_ADDRESS` after
                  deploying the RSVP contract, then redeploy Vercel.
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

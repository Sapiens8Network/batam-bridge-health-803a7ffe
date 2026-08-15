import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { api } from "../api";
import { useUi } from "../ui-store";

/**
 * Realtime bridge. The backend writes to the database, Postgres pushes the
 * change over the realtime socket and the query cache is invalidated, so every
 * dashboard screen updates live. The frontend never receives raw AI output.
 */
export function subscribeLive(queryClient: QueryClient) {
  const channel = supabase
    .channel("hub-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "medical_requests" }, () => {
      void queryClient.invalidateQueries();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "itineraries" }, () => {
      void queryClient.invalidateQueries();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
      void queryClient.invalidateQueries();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_activity_events" }, () => {
      void queryClient.invalidateQueries();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
      void queryClient.invalidateQueries();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let notificationCtx: AudioContext | null = null;

/** Optional soft notification chime for inbound patient messages. */
export function playInboundChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    notificationCtx ??= new Ctor();
    const ctx = notificationCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    /* audio is optional */
  }
}

/** Pushes a message through the same backend pipeline the real webhooks use. */
export async function simulateInboundMessage(input: {
  name: string;
  channel: "WHATSAPP" | "TELEGRAM";
  message: string;
  chime?: boolean;
}) {
  const payload = { name: input.name, message: input.message };
  const res = input.channel === "TELEGRAM" ? await api.webhookTelegram(payload) : await api.webhookWhatsapp(payload);
  if (input.chime !== false) playInboundChime();
  toast.success(`New ${input.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"} inquiry`, {
    description: `${input.name} · ${input.message.slice(0, 70)}…`,
  });
  return res.inquiryId;
}

const DEMO_MESSAGE =
  "I'm from Singapore and need a dental implant. Can you tell me the complete cost including ferry and hotel? Travelling alone for 2 nights.";

/**
 * End-to-end demonstration. Every step is a real backend call: Hermes triage,
 * cost engine, hospital approval, patient delivery and patient confirmation.
 */
export async function runLiveDemo(onInquiry?: (inquiryId: string) => void) {
  const ui = useUi.getState();
  if (ui.demoRunning) return;
  ui.setDemo(true, null);

  try {
    toast.info("Inbound Telegram message received", { description: "Hermes is triaging the request…" });
    const inquiryId = await simulateInboundMessage({
      name: "Joel Mahendran",
      channel: "TELEGRAM",
      message: DEMO_MESSAGE,
    });
    useUi.getState().setDemo(true, inquiryId);
    onInquiry?.(inquiryId);

    await wait(1500);
    const view = await api.inquiry(inquiryId);
    if (view.inquiry.humanTakeover.active || !view.itinerary) {
      toast.warning("Case escalated to a coordinator", {
        description: view.inquiry.humanTakeover.reasons[0] ?? "Hermes could not complete this case automatically.",
      });
      return;
    }

    toast.success("Itinerary generated", {
      description: `${view.inquiry.aiRequest.treatment} · awaiting hospital confirmation`,
    });

    await wait(3500);
    await api.quoteAction(view.itinerary.id, { action: "APPROVE" });
    toast.success("Quote approved by hospital");

    await wait(2500);
    await api.sendItinerary(view.itinerary.id);
    toast.success("Patient notified on Telegram", { description: "Itinerary link delivered." });
  } catch (error) {
    toast.error("Demo could not complete", { description: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    useUi.getState().setDemo(false);
  }
}

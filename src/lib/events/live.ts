import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "../api";
import { useHub } from "../mock/store";

/**
 * Realtime bridge. In mock mode the in-memory store plays the role of the
 * WebSocket/SSE feed: every mutation bumps `version`, and we invalidate the
 * query cache so all screens update live. Replace `subscribeLive` with a real
 * socket subscription and the rest of the app is unchanged.
 */
export function subscribeLive(queryClient: QueryClient) {
  return useHub.subscribe((state, prev) => {
    if (state.version !== prev.version) {
      void queryClient.invalidateQueries();
    }
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let notificationCtx: AudioContext | null = null;

/** Optional soft notification chime for inbound patient messages. */
export function playInboundChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    notificationCtx = notificationCtx ?? new Ctor();
    const ctx = notificationCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    /* audio is optional */
  }
}

/** Simulated inbound webhook — the seam where the real backend webhook plugs in. */
export async function simulateInboundMessage(input: {
  name: string;
  channel: "WHATSAPP" | "TELEGRAM";
  message: string;
  treatmentId?: string;
  chime?: boolean;
}) {
  const payload = {
    name: input.name,
    message: input.message,
    ...(input.treatmentId !== undefined ? { treatmentId: input.treatmentId } : {}),
  };
  const res = input.channel === "TELEGRAM" ? await api.webhookTelegram(payload) : await api.webhookWhatsapp(payload);
  const hub = useHub.getState();
  hub.pushActivity(res.inquiryId, "Message received", "DONE", 120, { channel: input.channel });
  hub.pushFeed(`New ${input.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"} inquiry · ${input.name}`, "INFO", res.inquiryId);
  if (input.chime !== false) playInboundChime();
  toast.success(`New ${input.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"} inquiry`, {
    description: `${input.name} · ${input.message.slice(0, 70)}…`,
  });
  return res.inquiryId;
}

const DEMO_MESSAGE =
  "I'm from Singapore and need a dental implant. Can you tell me the complete cost including ferry and hotel?";

/** Scripted 60-90s end-to-end demonstration driven through the same event path. */
export async function runLiveDemo(onInquiry?: (inquiryId: string) => void) {
  const hub = useHub.getState();
  if (hub.demoRunning) return;
  hub.setDemo(true);

  try {
    const inquiryId = await simulateInboundMessage({
      name: "Joel Mahendran",
      channel: "TELEGRAM",
      message: DEMO_MESSAGE,
      treatmentId: "trt_dental_implant",
    });
    useHub.getState().setDemo(true, inquiryId);
    onInquiry?.(inquiryId);

    const s = () => useHub.getState();
    const beat = async (
      ms: number,
      label: string,
      fn?: () => void,
      tone: "INFO" | "SUCCESS" | "ATTENTION" = "INFO",
    ) => {
      await wait(ms);
      fn?.();
      s().pushFeed(label, tone, inquiryId);
    };

    await beat(2500, "AI processing inquiry", () => {
      s().setInquiryStatus(inquiryId, "AI_PROCESSING");
      s().pushActivity(inquiryId, "Patient identified", "DONE", 340);
    });
    await beat(4000, "Treatment identified: Dental Implant", () =>
      s().pushActivity(inquiryId, "Treatment identified", "DONE", 910, {
        treatment: "Dental Implant",
        confidence: 0.94,
      }),
    );
    await beat(4000, "Treatment pricing retrieved", () => {
      s().pushActivity(inquiryId, "Treatment database searched", "DONE", 210);
      s().pushActivity(inquiryId, "Batam price retrieved", "DONE", 160, { treatmentSgd: 400 });
    });
    await beat(4500, "Singapore comparison calculated", () =>
      s().pushActivity(inquiryId, "Singapore benchmark retrieved", "DONE", 180, { benchmarkSgd: 1800 }),
    );
    await beat(4500, "Travel estimate generated", () => {
      s().pushActivity(inquiryId, "Travel estimate calculated", "DONE", 240, { ferrySgd: 75 });
      s().pushActivity(inquiryId, "Hotel estimate calculated", "DONE", 190, { nights: 1, nightlySgd: 65 });
    });
    await beat(
      5000,
      "Itinerary generated",
      () => {
        s().pushActivity(inquiryId, "Itinerary generated", "DONE", 1450, { steps: 6 });
        s().setInquiryStatus(inquiryId, "AI_ITINERARY_READY");
      },
      "SUCCESS",
    );
    await beat(
      4000,
      "Hospital review required",
      () => {
        s().pushActivity(inquiryId, "Hospital review required", "ATTENTION", null, {
          reasons: ["Hospital confirmation of pricing and availability"],
        });
        s().setInquiryStatus(inquiryId, "HOSPITAL_REVIEW_REQUIRED");
        toast.warning("Hospital review required", { description: "Dental Implant package awaiting confirmation." });
      },
      "ATTENTION",
    );

    await wait(6000);
    const inquiry = s().inquiries.find((i) => i.id === inquiryId);
    if (inquiry) {
      await api.quoteAction(inquiry.quoteId, { action: "APPROVE" });
      toast.success("Quote approved by hospital");
    }

    await wait(5000);
    const itinerary = s().itineraries.find((i) => i.inquiryId === inquiryId);
    if (itinerary) {
      await api.sendItinerary(itinerary.id);
      toast.success("Patient notified on Telegram", { description: "Itinerary link delivered." });
    }

    await wait(3000);
    s().setInquiryStatus(inquiryId, "TRAVEL_READY");
    s().pushFeed("Patient itinerary ready", "SUCCESS", inquiryId);
    toast.success("Patient itinerary ready", { description: "Open the itinerary to view the patient view." });
  } finally {
    useHub.getState().setDemo(false);
  }
}

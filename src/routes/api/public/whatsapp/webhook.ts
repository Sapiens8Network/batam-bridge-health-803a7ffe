import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * WhatsApp Cloud API webhook. GET performs the Meta verification handshake,
 * POST receives messages and pushes them through the same Hermes pipeline as
 * Telegram. Signature verification runs on the raw body before any parsing.
 */
const payloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                contacts: z
                  .array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).partial() }))
                  .optional(),
                messages: z
                  .array(
                    z.object({
                      from: z.string(),
                      type: z.string(),
                      text: z.object({ body: z.string().max(4000) }).optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

function verify(rawBody: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.slice("sha256=".length);
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const verifyToken = process.env["WHATSAPP_VERIFY_TOKEN"];
        const url = new URL(request.url);
        if (
          verifyToken &&
          url.searchParams.get("hub.mode") === "subscribe" &&
          url.searchParams.get("hub.verify_token") === verifyToken
        ) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const appSecret = process.env["WHATSAPP_APP_SECRET"];
        if (!appSecret) return new Response("WhatsApp is not configured", { status: 503 });

        const rawBody = await request.text();
        if (!verify(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const parsed = payloadSchema.safeParse(JSON.parse(rawBody));
        if (!parsed.success) return Response.json({ ok: true, ignored: true });

        const { processInbound } = await import("@/lib/server/hermes.server");
        for (const entry of parsed.data.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const contactName = change.value.contacts?.[0]?.profile?.name;
            for (const message of change.value.messages ?? []) {
              if (message.type !== "text" || !message.text?.body) continue;
              await processInbound({
                channel: "WHATSAPP",
                message: message.text.body,
                name: contactName ?? "WhatsApp patient",
                externalId: message.from,
                phone: `+${message.from}`,
              });
            }
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});

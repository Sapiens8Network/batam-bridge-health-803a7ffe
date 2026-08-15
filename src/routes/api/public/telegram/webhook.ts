import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

const updateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      from: z
        .object({
          id: z.number(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
        })
        .optional(),
      text: z.string().max(4000).optional(),
    })
    .optional(),
  edited_message: z.unknown().optional(),
});

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const connectionKey = process.env["TELEGRAM_API_KEY"];
        if (!connectionKey) return new Response("Telegram is not configured", { status: 503 });

        const expected = createHash("sha256").update(`telegram-webhook:${connectionKey}`).digest("base64url");
        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, expected)) return new Response("Unauthorized", { status: 401 });

        const parsed = updateSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ ok: true, ignored: true });
        const message = parsed.data.message;
        if (!message?.text) return Response.json({ ok: true, ignored: true });

        const { processInbound } = await import("@/lib/server/hermes.server");
        const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
        await processInbound({
          channel: "TELEGRAM",
          message: message.text,
          name: name || "Telegram patient",
          externalId: String(message.chat.id),
        });
        return Response.json({ ok: true });
      },
    },
  },
});

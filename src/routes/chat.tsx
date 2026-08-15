import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Leaf,
  Loader2,
  Send,
  Ship,
  Sparkles,
  User,
} from "lucide-react";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { sgd } from "@/lib/format";
import {
  webChatBook,
  webChatMessage,
  webChatSelect,
  webChatSession,
  type WebChatPayload,
  type WebChatSelections,
} from "@/lib/hub.functions";
import { cn } from "@/lib/utils";

const TITLE = "Plan your Batam treatment trip — MedBridge Pass";
const DESCRIPTION =
  "Chat with the MedBridge Pass care assistant to build a Batam medical trip: treatment, hospital, ferry, hotel and transfers — priced from hospital data and confirmed by the hospital.";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const STORAGE_KEY = "medbridge-chat-token";

const SUGGESTIONS = [
  "I want dental implants in Batam",
  "Looking for LASIK next month",
  "Full health screening, day trip",
];

function ChatPage() {
  const [session, setSession] = useState<WebChatPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const startFn = useServerFn(webChatSession);
  const messageFn = useServerFn(webChatMessage);
  const selectFn = useServerFn(webChatSelect);
  const bookFn = useServerFn(webChatBook);

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
    void startFn({ data: { token } }).then((payload) => {
      window.localStorage.setItem(STORAGE_KEY, payload.token);
      setSession(payload);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [session?.transcript.length]);

  const send = useMutation({
    mutationFn: (text: string) => messageFn({ data: { token: session?.token, text } }),
    onSuccess: (payload) => {
      window.localStorage.setItem(STORAGE_KEY, payload.token);
      setSession(payload);
    },
  });

  const select = useMutation({
    mutationFn: (patch: Partial<WebChatSelections>) =>
      selectFn({ data: { token: session!.token, patch } }),
    onSuccess: setSession,
  });

  const book = useMutation({
    mutationFn: () => bookFn({ data: { token: session!.token, name, phone: phone || undefined } }),
    onSuccess: setSession,
  });

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || send.isPending) return;
    setDraft("");
    send.mutate(value);
  };

  const plan = session?.plan ?? null;
  const selections = session?.selections;

  const total = plan
    ? plan.lines.filter((l) => l.selected).reduce((sum, line) => sum + line.price, 0)
    : 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="journey-gradient text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/80">
            <Leaf className="size-4" />
            MedBridge Pass
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Plan your Batam treatment trip by chat
          </h1>
          <p className="max-w-2xl text-sm text-white/85">
            Tell our care assistant what you need. We build the full plan — hospital, ferry, hotel
            and transfers — from real hospital pricing, and you keep only what you want.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ------------------------------------------------------------ chat */}
        <section className="flex h-[560px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Care assistant</p>
              <p className="text-xs text-muted-foreground">Structured intake · no medical advice</p>
            </div>
            <Pill tone={session?.stage === "BOOKED" ? "success" : "info"}>
              {session?.stage === "BOOKED"
                ? "Submitted"
                : session?.stage === "PLAN_READY"
                  ? "Plan ready"
                  : "Collecting details"}
            </Pill>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!session && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Starting your session…
              </div>
            )}
            {session?.transcript.map((turn, index) => (
              <div
                key={`${turn.at}-${index}`}
                className={cn("flex gap-2", turn.role === "USER" ? "justify-end" : "justify-start")}
              >
                {turn.role === "AGENT" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-3.5" />
                  </span>
                )}
                <p
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    turn.role === "USER"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {turn.text}
                </p>
                {turn.role === "USER" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <User className="size-3.5" />
                  </span>
                )}
              </div>
            ))}
            {send.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Assistant is typing…
              </div>
            )}
          </div>

          {session?.transcript.length === 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                session?.stage === "BOOKED"
                  ? "Your request has been submitted"
                  : "Type your message…"
              }
              disabled={!session || session.stage === "BOOKED"}
              aria-label="Message the care assistant"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!session || send.isPending || session.stage === "BOOKED"}
            >
              <Send className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </section>

        {/* ------------------------------------------------------------ plan */}
        <aside className="space-y-4">
          {!plan && (
            <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              <p className="font-medium text-foreground">Your trip plan appears here</p>
              <p className="mt-1">
                Once we know your treatment, travel date, group size and nights in Batam, we build a
                priced plan you can adjust line by line.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {(
                  [
                    "Treatment",
                    "Travel date",
                    "Patients being treated",
                    "Companions coming along",
                    "Nights in Batam",
                  ] as const
                ).map((label, i) => {
                  const done = [
                    !!session?.slots.treatmentId,
                    !!session?.slots.date,
                    session?.slots.patients != null,
                    session?.slots.companions != null,
                    session?.slots.nights != null,
                  ][i];
                  return (
                    <li key={label} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid size-4 place-items-center rounded-full border",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {done && <Check className="size-3" />}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {selections && (
            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <div>
                <p className="text-sm font-medium">Who is travelling?</p>
                <p className="text-xs text-muted-foreground">
                  Treatment is charged per patient. Companions only add ferry and transfer seats.
                </p>
              </div>
              <Stepper
                label="Patients being treated"
                value={selections.patients}
                min={1}
                disabled={select.isPending || session?.stage === "BOOKED"}
                onChange={(patients) => select.mutate({ patients })}
              />
              <Stepper
                label="Companions (no treatment)"
                value={selections.companions}
                min={0}
                disabled={select.isPending || session?.stage === "BOOKED"}
                onChange={(companions) => select.mutate({ companions })}
              />
              <p className="text-xs text-muted-foreground">
                Total travelling: <span className="font-medium text-foreground">
                  {selections.patients + selections.companions}
                </span>
              </p>
            </div>
          )}

          {plan && (
            <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Recommended plan
                </p>
                <h2 className="mt-1 text-lg font-semibold">{plan.treatment.name}</h2>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="size-3.5" />
                  {plan.hospital.name} · {plan.hospital.location}
                </p>
              </div>

              {plan.missing.length > 0 && (
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  {plan.missing.join(" · ")} — a coordinator will confirm this with you.
                </div>
              )}

              <div className="space-y-2">
                {plan.lines.map((line) => (
                  <div key={line.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.label}</p>
                        <p className="text-xs text-muted-foreground">{line.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            !line.selected && "text-muted-foreground line-through",
                          )}
                        >
                          {sgd(line.price)}
                        </span>
                        {line.optional && selections && (
                          <Switch
                            checked={line.selected}
                            aria-label={`Include ${line.label}`}
                            disabled={select.isPending || session?.stage === "BOOKED"}
                            onCheckedChange={(checked) => {
                              if (line.key === "concierge")
                                return select.mutate({ includeConcierge: checked });
                              if (line.key === "ferry")
                                return select.mutate({
                                  ferryId: checked ? (plan.options.ferries[0]?.id ?? null) : "NONE",
                                });
                              if (line.key === "hotel")
                                return select.mutate(
                                  checked
                                    ? {
                                        hotelId: plan.options.hotels[0]?.id ?? null,
                                        nights: Math.max(1, selections.nights),
                                      }
                                    : { hotelId: "NONE" },
                                );
                              if (line.key === "transport")
                                return select.mutate({
                                  transportId: checked
                                    ? (plan.options.transports[0]?.id ?? null)
                                    : "NONE",
                                });
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {line.key === "hotel" && line.selected && plan.options.hotels.length > 1 && (
                      <OptionSwitcher
                        label="Choose your hotel"
                        options={plan.options.hotels}
                        activeId={selections?.hotelId ?? plan.options.hotels[0]?.id ?? null}
                        onPick={(id) => select.mutate({ hotelId: id })}
                        suffix="/night"
                      />
                    )}
                    {line.key === "ferry" && line.selected && plan.options.ferries.length > 1 && (
                      <OptionSwitcher
                        label="Choose your ferry"
                        options={plan.options.ferries}
                        activeId={selections?.ferryId ?? plan.options.ferries[0]?.id ?? null}
                        onPick={(id) => select.mutate({ ferryId: id })}
                        suffix="/way"
                      />
                    )}
                    {line.key === "treatment" && plan.options.hospitals.length > 1 && (
                      <OptionSwitcher
                        label="Choose your hospital (base treatment price per patient)"
                        options={plan.options.hospitals}
                        activeId={selections?.hospitalId ?? plan.hospital.id}
                        onPick={(id) => select.mutate({ hospitalId: id })}
                      />
                    )}
                    {line.key === "transport" &&
                      line.selected &&
                      plan.options.transports.length > 1 && (
                        <OptionSwitcher
                          label="Choose your transfer"
                          options={plan.options.transports}
                          activeId={
                            selections?.transportId ?? plan.options.transports[0]?.id ?? null
                          }
                          onPick={(id) => select.mutate({ transportId: id })}
                        />
                      )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-muted/60 p-4">
                <ul className="space-y-1 border-b pb-3 text-xs">
                  {plan.lines
                    .filter((l) => l.selected)
                    .map((l) => (
                      <li key={l.key} className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-muted-foreground">{l.label}</span>
                        <span className="shrink-0 font-medium">{sgd(l.price)}</span>
                      </li>
                    ))}
                </ul>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Your total</span>
                  <span className="text-2xl font-semibold">{sgd(total)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Singapore equivalent</span>
                  <span className="line-through">{sgd(plan.benchmarkTotal)}</span>
                </div>
                {plan.savings > 0 && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    Estimated saving {sgd(plan.savings)} ({plan.savingsPct}%)
                  </p>
                )}
              </div>


              {session?.stage === "BOOKED" ? (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Request {session.booking?.reference} sent to {plan.hospital.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The hospital confirms pricing and availability, then your itinerary is
                    finalised.
                  </p>
                  {session.booking?.itineraryToken && (
                    <Button asChild className="w-full">
                      <a href={`/itinerary/${session.booking.itineraryToken}`}>
                        View my itinerary <ArrowRight className="ml-1 size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (name.trim()) book.mutate();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="chat-name">Your name</Label>
                    <Input
                      id="chat-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chat-phone">Mobile (optional)</Label>
                    <Input
                      id="chat-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+65…"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={book.isPending || !name.trim()}
                  >
                    {book.isPending ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <Ship className="mr-1 size-4" />
                    )}
                    Book this plan
                  </Button>
                  {book.isError && (
                    <p className="text-xs text-destructive">
                      We couldn't submit that — please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          <MedicalDisclaimer />
        </aside>
      </div>
    </main>
  );
}

function OptionSwitcher({
  options,
  activeId,
  onPick,
  suffix = "",
  label = "Choose an option",
}: {
  options: { id: string; name: string; detail: string; price: number }[];
  activeId: string | null;
  onPick: (id: string) => void;
  suffix?: string;
  label?: string;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {options.map((option) => {
        const active = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(option.id)}
            className={cn(
              "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
              active
                ? "border-primary bg-primary/5 text-foreground"
                : "text-muted-foreground hover:border-primary/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40",
              )}
            >
              {active && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{option.name}</span>
              <span className="block text-[11px]">
                {option.detail}
                {option.price > 0 ? ` · ${sgd(option.price)}${suffix}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}


function Stepper({
  label,
  value,
  min,
  max = 20,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

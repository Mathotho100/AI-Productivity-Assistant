import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { generateEmail } from "@/lib/ai.functions";
import { useDebounced } from "@/hooks/use-debounced";
import { AppShell, Panel, SegmentedControl, StatusBadge } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — CareerBoost AI" },
      {
        name: "description",
        content:
          "Turn rough notes into a polished workplace email. Pick a tone and audience, and watch the draft write itself in a live preview.",
      },
      { property: "og:title", content: "Smart Email Generator — CareerBoost AI" },
      {
        property: "og:description",
        content: "Draft professional emails with tone and audience controls plus a live preview.",
      },
    ],
  }),
  component: EmailTool,
});

const TONES = ["Formal", "Informal", "Persuasive"] as const;
const AUDIENCES = ["Client", "Manager", "Team"] as const;

function EmailTool() {
  const [tone, setTone] = useState<(typeof TONES)[number]>("Formal");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Client");
  const [senderName, setSenderName] = useState("");
  const [keyPoints, setKeyPoints] = useState(
    "Thanks for the Q3 call. Confirm the revised scope and the $48k budget, plus a 6-week timeline with a mid-point review.",
  );

  const debouncedPoints = useDebounced(keyPoints);
  const debouncedName = useDebounced(senderName);
  const run = useServerFn(generateEmail);
  const enabled = debouncedPoints.trim().length >= 10;

  const query = useQuery({
    queryKey: ["email", tone, audience, debouncedPoints, debouncedName],
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: () =>
      run({
        data: {
          tone,
          audience,
          keyPoints: debouncedPoints.trim(),
          senderName: debouncedName.trim() || undefined,
        },
      }),
  });

  const typing = debouncedPoints !== keyPoints || debouncedName !== senderName;
  const state = !enabled
    ? "idle"
    : typing
      ? "typing"
      : query.isFetching
        ? "working"
        : query.isError
          ? "error"
          : "ready";

  const draft = query.data;
  const plainText = draft
    ? `Subject: ${draft.subject}\n\n${draft.greeting}\n\n${draft.body.join("\n\n")}\n\n${draft.signOff}`
    : "";

  return (
    <AppShell>
      <section className="relative mb-10 overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-6 hidden skew-tab select-none font-display text-[9rem] uppercase leading-none text-border/50 lg:block"
        >
          Draft
        </span>
        <div className="relative max-w-2xl animate-rise">
          <p className="label-mono mb-3 flex items-center gap-2">
            <span className="h-0.5 w-6 bg-accent" aria-hidden="true" />
            01 / Smart Email Generator
          </p>
          <h1 className="text-balance font-display text-5xl uppercase leading-[0.9] tracking-tight md:text-6xl">
            Write it once.
            <br />
            <span className="text-accent">Ship it right.</span>
          </h1>
          <p className="mt-4 max-w-md text-pretty text-muted-foreground">
            Spin a polished draft from rough notes. Set the tone, pick your audience, watch it land.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Compose" badge={<StatusBadge state={state} />} className="space-y-5">
          <SegmentedControl label="Tone" options={TONES} value={tone} onChange={setTone} />
          <SegmentedControl
            label="Audience"
            options={AUDIENCES}
            value={audience}
            onChange={setAudience}
            tone="light"
          />
          <div>
            <label className="label-mono" htmlFor="sender">
              Your name (optional)
            </label>
            <input
              id="sender"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Marcus Vale"
              className="mt-2 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none ring-accent focus-visible:ring-2"
            />
          </div>
          <div>
            <label className="label-mono" htmlFor="points">
              Key points
            </label>
            <textarea
              id="points"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              rows={6}
              placeholder="What should this email say?"
              className="mt-2 w-full resize-y rounded-lg bg-muted p-3 text-sm outline-none ring-accent focus-visible:ring-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              The preview refreshes on its own a moment after you stop typing.
            </p>
          </div>
        </Panel>

        <Panel
          title="Preview"
          badge={<span className="label-mono">To: {audience}</span>}
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <div className="relative min-h-[280px] border-t border-border pt-4">
            <div className="absolute bottom-0 left-0 top-0 w-px origin-top animate-sweep bg-accent" />
            <div className="space-y-3 pl-4">
              {!enabled ? (
                <p className="text-sm text-muted-foreground">
                  Add a few key points and your draft appears here.
                </p>
              ) : query.isError ? (
                <p className="text-sm text-destructive">
                  {(query.error as Error).message || "Could not generate the draft."}
                </p>
              ) : !draft ? (
                <div className="space-y-2">
                  {[90, 70, 100, 80].map((w) => (
                    <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Subject: {draft.subject}
                  </p>
                  <p className="text-sm">{draft.greeting}</p>
                  {draft.body.map((para, i) => (
                    <p key={i} className="text-pretty text-sm leading-relaxed">
                      {para}
                    </p>
                  ))}
                  <p className="whitespace-pre-line text-sm">{draft.signOff}</p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(plainText)}
                      className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Copy draft
                    </button>
                    <button
                      type="button"
                      onClick={() => query.refetch()}
                      className="rounded-sm px-3 py-1.5 text-xs font-medium ring-1 ring-border"
                    >
                      Regenerate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

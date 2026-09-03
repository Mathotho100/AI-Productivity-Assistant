import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { summarizeNotes } from "@/lib/ai.functions";
import { useDebounced } from "@/hooks/use-debounced";
import { AppShell, Panel, SectionHeading, StatusBadge } from "@/components/layout/AppShell";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — CareerBoost AI" },
      {
        name: "description",
        content:
          "Paste raw meeting notes or a transcript and get key points, decisions, owners and deadlines in a live summary.",
      },
      { property: "og:title", content: "Meeting Notes Summarizer — CareerBoost AI" },
      {
        property: "og:description",
        content: "Key points, decisions, action items and deadlines pulled from any transcript.",
      },
    ],
  }),
  component: NotesTool,
});

const SAMPLE =
  "Standup 14:00 — launch moved to Sept 12, onboarding flow is the main bottleneck. Agreed to ship mobile onboarding behind a flag and freeze scope until QA sign-off. Priya to draft release notes by Sep 8. Tom to fix the login edge case by Sep 10.";

function NotesTool() {
  const [notes, setNotes] = useState(SAMPLE);
  const debounced = useDebounced(notes, 1100);
  const run = useServerFn(summarizeNotes);
  const enabled = debounced.trim().length >= 25;

  const query = useQuery({
    queryKey: ["notes", debounced],
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: () => run({ data: { notes: debounced.trim() } }),
  });

  const typing = debounced !== notes;
  const state = !enabled
    ? "idle"
    : typing
      ? "typing"
      : query.isFetching
        ? "working"
        : query.isError
          ? "error"
          : "ready";
  const s = query.data;

  return (
    <AppShell>
      <SectionHeading
        eyebrow="02 / Meeting Notes Summarizer"
        title={
          <>
            Cut the noise.
            <br />
            Keep the decisions.
          </>
        }
        aside="Paste a transcript and get key points, decisions, actions and deadlines — updated as you type."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Raw notes" badge={<StatusBadge state={state} />}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={14}
            aria-label="Raw meeting notes"
            placeholder="Paste your meeting notes or transcript…"
            className="w-full resize-y rounded-lg bg-muted p-3 text-sm leading-relaxed outline-none ring-accent focus-visible:ring-2"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="label-mono">{notes.trim().split(/\s+/).filter(Boolean).length} words</span>
            <button
              type="button"
              onClick={() => setNotes("")}
              className="rounded-sm px-3 py-1.5 text-xs font-medium ring-1 ring-border"
            >
              Clear
            </button>
          </div>
        </Panel>

        <Panel
          title="Live summary"
          badge={<span className="label-mono">Auto</span>}
          className="md:sticky md:top-24 md:self-start"
        >
          {!enabled ? (
            <p className="text-sm text-muted-foreground">
              Paste at least a couple of sentences to see the summary.
            </p>
          ) : query.isError ? (
            <p className="text-sm text-destructive">
              {(query.error as Error).message || "Could not summarize these notes."}
            </p>
          ) : !s ? (
            <div className="space-y-2">
              {[80, 95, 60, 90, 70].map((w) => (
                <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <Block title="Key points" empty="Nothing flagged.">
                {s.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">—</span>
                    <span className="text-pretty">{k}</span>
                  </li>
                ))}
              </Block>
              <Block title="Decisions" empty="No decisions recorded.">
                {s.decisions.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">—</span>
                    <span className="text-pretty">{d}</span>
                  </li>
                ))}
              </Block>
              <Block title="Action items" empty="No actions assigned.">
                {s.actionItems.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex gap-2">
                      <span className="text-accent">—</span>
                      <span>
                        {a.task} — <span className="font-medium">{a.owner}</span>
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{a.due}</span>
                  </li>
                ))}
              </Block>
              <Block title="Deadlines" empty="No dates mentioned.">
                {s.deadlines.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">—</span>
                    <span className="text-pretty">{d}</span>
                  </li>
                ))}
              </Block>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Block({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{title}</p>
      {children.length ? (
        <ul className="mt-1 space-y-1.5 pl-1">{children}</ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

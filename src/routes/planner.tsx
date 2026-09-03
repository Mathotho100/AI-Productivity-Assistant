import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { buildPlan } from "@/lib/ai.functions";
import { useDebounced } from "@/hooks/use-debounced";
import { AppShell, Panel, SectionHeading, SegmentedControl, StatusBadge } from "@/components/layout/AppShell";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — CareerBoost AI" },
      {
        name: "description",
        content:
          "Enter tasks and deadlines and get a prioritized daily, weekly or custom plan that reschedules itself as you edit.",
      },
      { property: "og:title", content: "AI Task Planner — CareerBoost AI" },
      {
        property: "og:description",
        content: "Prioritized day-by-day schedules built from your tasks, deadlines and importance.",
      },
    ],
  }),
  component: PlannerTool,
});

const RANGES = ["Daily", "Weekly", "Custom"] as const;
const IMPORTANCE = ["High", "Medium", "Low"] as const;

type Task = {
  id: string;
  title: string;
  deadline: string;
  importance: (typeof IMPORTANCE)[number];
  estimate: string;
};

const newTask = (): Task => ({
  id: crypto.randomUUID(),
  title: "",
  deadline: "",
  importance: "Medium",
  estimate: "",
});

function PlannerTool() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Weekly");
  const [customDays, setCustomDays] = useState(3);
  const [tasks, setTasks] = useState<Task[]>([
    { id: "a", title: "Ship onboarding flag build", deadline: "today", importance: "High", estimate: "3h" },
    { id: "b", title: "Review QA sign-off checklist", deadline: "tomorrow", importance: "High", estimate: "1h" },
    { id: "c", title: "Prep week-3 review deck", deadline: "Friday", importance: "Medium", estimate: "2h" },
    { id: "d", title: "Schedule client check-in", deadline: "", importance: "Low", estimate: "15m" },
  ]);

  const filled = tasks.filter((t) => t.title.trim().length > 1);
  const signature = JSON.stringify({ range, customDays, filled });
  const debounced = useDebounced(signature, 1200);
  const run = useServerFn(buildPlan);
  const enabled = filled.length > 0;

  const query = useQuery({
    queryKey: ["plan", debounced],
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: () => {
      const snapshot = JSON.parse(debounced) as {
        range: (typeof RANGES)[number];
        customDays: number;
        filled: Task[];
      };
      return run({
        data: {
          range: snapshot.range,
          customDays: snapshot.customDays,
          tasks: snapshot.filled.map((t) => ({
            title: t.title.trim(),
            deadline: t.deadline.trim() || undefined,
            importance: t.importance,
            estimate: t.estimate.trim() || undefined,
          })),
        },
      });
    },
  });

  const typing = debounced !== signature;
  const state = !enabled
    ? "idle"
    : typing
      ? "typing"
      : query.isFetching
        ? "working"
        : query.isError
          ? "error"
          : "ready";

  const update = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <AppShell>
      <SectionHeading
        eyebrow="03 / AI Task Planner"
        title={
          <>
            Stack the day.
            <br />
            Beat the deadline.
          </>
        }
        aside="Edit anything and the schedule reprioritizes itself around urgency, deadlines and importance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tasks" badge={<StatusBadge state={state} />} className="space-y-5">
          <SegmentedControl label="Plan range" options={RANGES} value={range} onChange={setRange} />
          {range === "Custom" && (
            <div>
              <label className="label-mono" htmlFor="days">
                Days to plan ({customDays})
              </label>
              <input
                id="days"
                type="range"
                min={1}
                max={14}
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-accent)]"
              />
            </div>
          )}

          <div className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={t.title}
                    onChange={(e) => update(t.id, { title: e.target.value })}
                    placeholder="Task"
                    aria-label="Task title"
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${t.title || "task"}`}
                    onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
                    className="font-mono text-xs text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    value={t.deadline}
                    onChange={(e) => update(t.id, { deadline: e.target.value })}
                    placeholder="Deadline"
                    aria-label="Deadline"
                    className="rounded-sm bg-background px-2 py-1 text-xs outline-none ring-accent focus-visible:ring-2"
                  />
                  <select
                    value={t.importance}
                    onChange={(e) =>
                      update(t.id, { importance: e.target.value as Task["importance"] })
                    }
                    aria-label="Importance"
                    className="rounded-sm bg-background px-2 py-1 text-xs outline-none ring-accent focus-visible:ring-2"
                  >
                    {IMPORTANCE.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <input
                    value={t.estimate}
                    onChange={(e) => update(t.id, { estimate: e.target.value })}
                    placeholder="Estimate"
                    aria-label="Estimate"
                    className="rounded-sm bg-background px-2 py-1 text-xs outline-none ring-accent focus-visible:ring-2"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTasks((prev) => [...prev, newTask()])}
            className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            + Add task
          </button>
        </Panel>

        <Panel
          title="Prioritized plan"
          tone="dark"
          badge={<span className="label-mono">P1 → P3</span>}
          className="lg:sticky lg:top-24 lg:self-start"
        >
          {!enabled ? (
            <p className="text-sm text-background/60">Add a task to build your schedule.</p>
          ) : query.isError ? (
            <p className="text-sm text-destructive">
              {(query.error as Error).message || "Could not build the plan."}
            </p>
          ) : !query.data ? (
            <div className="space-y-2">
              {[70, 100, 85, 60].map((w) => (
                <div
                  key={w}
                  className="h-8 animate-pulse rounded bg-background/10"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {query.data.days.map((day) => (
                <div key={day.label}>
                  <p className="label-mono mb-2" style={{ color: "color-mix(in oklab, var(--paper) 55%, transparent)" }}>
                    {day.label}
                  </p>
                  <div className="space-y-2.5">
                    {day.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg bg-background/5 py-2.5 pl-2 pr-3"
                      >
                        <span
                          className={`mt-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
                            item.priority === "P1"
                              ? "bg-accent text-accent-foreground"
                              : item.priority === "P2"
                                ? "bg-accent/25 text-accent"
                                : "bg-background/10 text-background/70"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="flex-1 text-sm">
                          {item.title}
                          <span className="block text-xs text-background/50">{item.note}</span>
                        </span>
                        <span className="font-mono text-[10px] text-background/50">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-background/60">{query.data.rationale}</p>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="text-xs font-semibold text-accent"
              >
                + Re-prioritize
              </button>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

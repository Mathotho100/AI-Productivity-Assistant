import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TOOLS = [
  { to: "/", label: "Email" },
  { to: "/notes", label: "Notes" },
  { to: "/planner", label: "Planner" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 skew-tab place-items-center bg-primary">
              <span className="skew-tab-inner font-display text-lg tracking-tight text-primary-foreground">
                CB
              </span>
            </div>
            <div className="leading-none">
              <p className="font-display text-xl uppercase tracking-tight">CareerBoost</p>
              <p className="label-mono mt-0.5">AI Workspace</p>
            </div>
          </Link>

          <nav className="hidden skew-tab items-center gap-1 bg-primary p-1 md:flex">
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="skew-tab-inner block px-4 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background"
                activeOptions={{ exact: t.to === "/" }}
                activeProps={{
                  className:
                    "skew-tab-inner block px-4 py-2 text-sm font-semibold bg-accent text-accent-foreground",
                }}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <span className="label-mono hidden sm:inline">v1.0</span>
        </div>
      </header>

      <div className="sticky top-16 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden">
        {TOOLS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="shrink-0 px-3 py-1.5 text-sm text-muted-foreground"
            activeOptions={{ exact: t.to === "/" }}
            activeProps={{
              className:
                "shrink-0 px-3 py-1.5 text-sm font-semibold bg-primary text-primary-foreground",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-10">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-2 px-5 py-4 sm:flex-row">
          <p className="label-mono">© CareerBoost AI · Built to work, not to fuss.</p>
          <p className="flex items-center gap-2 text-xs text-foreground">
            <span className="size-1.5 skew-tab bg-accent" aria-hidden="true" />
            <span className="font-medium">AI outputs may contain bias - please validate.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex animate-rise flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label-mono mb-2 flex items-center gap-2">
          <span className="h-0.5 w-6 bg-accent" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className="text-balance font-display text-3xl uppercase tracking-tight md:text-4xl">
          {title}
        </h2>
      </div>
      {aside ? <p className="max-w-xs text-pretty text-sm text-muted-foreground">{aside}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  badge,
  children,
  tone = "light",
  className = "",
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const skin =
    tone === "dark"
      ? "bg-primary text-background"
      : "bg-card text-card-foreground ring-1 ring-border";
  return (
    <section className={`animate-rise rounded-xl p-5 ${skin} ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg uppercase tracking-tight">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "dark",
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  tone?: "dark" | "light";
}) {
  const track = tone === "dark" ? "bg-primary" : "bg-muted";
  return (
    <div>
      <span className="label-mono">{label}</span>
      <div className={`mt-2 flex gap-1 rounded-lg p-1 ${track}`} role="group" aria-label={label}>
        {options.map((opt) => {
          const active = opt === value;
          const idle = tone === "dark" ? "text-background/60" : "text-muted-foreground";
          const on =
            tone === "dark"
              ? "bg-accent text-accent-foreground font-semibold"
              : "bg-primary text-background font-semibold";
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              className={`flex-1 rounded-md px-2 py-1.5 text-sm transition-colors ${active ? on : idle}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatusBadge({ state }: { state: "idle" | "typing" | "working" | "ready" | "error" }) {
  const text =
    state === "working"
      ? "Generating"
      : state === "typing"
        ? "Listening"
        : state === "ready"
          ? "Live"
          : state === "error"
            ? "Error"
            : "Idle";
  const skin =
    state === "error"
      ? "bg-destructive/15 text-destructive"
      : state === "working" || state === "typing"
        ? "bg-accent/25 text-accent-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${skin}`}>
      {text}
    </span>
  );
}

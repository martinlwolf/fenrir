import { LandingContainer } from "./LandingContainer";
import { STATS } from "./data";

export function StatsStrip() {
  return (
    <section className="border-y border-[var(--fen-border)] bg-[var(--fen-surface)] py-10">
      <LandingContainer>
        <div className="grid grid-cols-2 items-center gap-y-8 md:flex md:justify-between">
          {STATS.map((s, i) => (
            <div key={s.label} className="flex items-center md:contents">
              {i > 0 && (
                <span className="mr-4 hidden h-[54px] w-px bg-[var(--fen-rule)] md:block" />
              )}
              <div className="flex flex-col gap-1.5">
                <span
                  className={
                    "font-mono text-[28px] font-bold lg:text-[36px] " +
                    (s.tone === "verified"
                      ? "text-[var(--fen-verified)]"
                      : "text-[var(--fen-ink)]")
                  }
                >
                  {s.value}
                </span>
                <span className="text-[15px] text-[var(--fen-muted)]">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

import { LandingContainer } from "./LandingContainer";
import { SectionHeading } from "./SectionHeading";
import { PROJECT_TYPES } from "./data";

export function ProjectTypes() {
  return (
    <section id="dao" className="bg-[var(--fen-bg)] py-20 lg:py-[104px]">
      <LandingContainer className="flex flex-col items-center gap-12 lg:gap-[52px]">
        <SectionHeading
          className="max-w-[1000px]"
          eyebrow="DOS FORMAS DE CREAR CONFIANZA"
          title="Un mismo motor, dos tipos de proyecto"
        />

        <div className="grid w-full gap-6 lg:grid-cols-2">
          {PROJECT_TYPES.map((t) => (
            <div
              key={t.title}
              className="flex flex-col gap-[22px] rounded-[18px] border border-[var(--fen-border)] bg-white p-8 lg:p-10"
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    "flex size-14 items-center justify-center rounded-[14px] font-bold text-white " +
                    (t.iconBg === "ink"
                      ? "bg-[var(--fen-ink)] text-[26px]"
                      : "bg-[var(--fen-verified)] text-[22px]")
                  }
                >
                  {t.icon}
                </span>
                <span
                  className={
                    "rounded-full px-3.5 py-2 text-xs font-bold " +
                    (t.tagTone === "verified"
                      ? "bg-[var(--fen-verified-soft)] text-[var(--fen-verified)]"
                      : "bg-[var(--fen-surface-2)] text-[var(--fen-body)]")
                  }
                >
                  {t.tag}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <h3 className="text-[28px] font-bold text-[var(--fen-ink)]">{t.title}</h3>
                <p className="text-base leading-[25px] text-[var(--fen-body)]">{t.body}</p>
              </div>

              <div className="h-px w-full bg-[var(--fen-divider)]" />

              <ul className="flex flex-col gap-3">
                {t.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5">
                    <span className="text-[15px] text-[var(--fen-verified)]">✓</span>
                    <span className="text-[15px] text-[var(--fen-ink-2)]">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

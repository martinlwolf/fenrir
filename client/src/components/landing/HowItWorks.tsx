import { LandingContainer } from "./LandingContainer";
import { SectionHeading } from "./SectionHeading";
import { HOW_IT_WORKS } from "./data";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-[var(--fen-bg)] py-20 lg:py-[104px]">
      <LandingContainer className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow="CÓMO FUNCIONA"
          title="Confianza programada, no prometida"
          subtitle="Tres pasos, todos verificables en la cadena. Nadie toca los fondos hasta que el DAO lo aprueba."
        />

        <div className="grid w-full gap-7 lg:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.step}
              className="flex flex-col gap-[18px] rounded-2xl border border-[var(--fen-border)] bg-white p-8"
            >
              <span
                className={
                  "flex size-[50px] items-center justify-center rounded-xl font-mono text-[19px] font-bold " +
                  (s.accent
                    ? "bg-[var(--fen-verified-soft)] text-[var(--fen-verified)]"
                    : "bg-[var(--fen-surface-2)] text-[var(--fen-ink)]")
                }
              >
                {s.step}
              </span>
              <h3 className="text-[22px] font-bold text-[var(--fen-ink)]">{s.title}</h3>
              <p className="text-base leading-[25px] text-[var(--fen-body)]">{s.body}</p>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

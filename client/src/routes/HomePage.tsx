import { Link } from "react-router-dom";
import { ArrowRight, Building2, ShieldCheck, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { CardsSkeleton } from "@/components/domain/states";
import { ScrollSequenceHero } from "@/components/landing/ScrollSequenceHero";
import { AnimationGrid, RevealFromTop } from "@/components/motion/Reveal";
import { useProjects } from "@/hooks/useProjects";

const STEPS = [
  {
    Icon: Building2,
    title: "Fondear el proyecto",
    body: "Los inversores aportan ETH al contrato. Los fondos quedan en custodia on-chain, no en manos de un fiduciario.",
  },
  {
    Icon: Vote,
    title: "Votar cada hito",
    body: "Cuando el developer reporta un avance, el DAO vota públicamente si se cumplió. Voto registrado en la cadena.",
  },
  {
    Icon: ShieldCheck,
    title: "Liberar por tranches",
    body: "Si el hito se aprueba, el contrato libera ese tramo. Si se rechaza, el dinero sigue protegido para los inversores.",
  },
];

export function HomePage() {
  const { data, isLoading } = useProjects({});
  const recent = data?.items.slice(0, 6) ?? [];

  return (
    <div>
      {/* HERO con secuencia de imágenes dirigida por scroll (pin + scrub sobre canvas). */}
      <ScrollSequenceHero />

      {/* PROYECTOS RECIENTES */}
      <section className="container py-16 lg:py-20">
        <RevealFromTop className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fen-accent-strong)]">
              <span className="h-px w-6 bg-[var(--fen-accent)]" />
              Oportunidades abiertas
            </span>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--fen-ink)]">
              Proyectos recientes
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link to="/projects">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </RevealFromTop>

        {isLoading ? (
          <CardsSkeleton count={3} />
        ) : (
          <AnimationGrid className="grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <ProjectCard key={p.address} project={p} />
            ))}
          </AnimationGrid>
        )}
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="border-y border-[var(--fen-border)] bg-[var(--fen-surface)]">
        <div className="container py-16 lg:py-20">
          <RevealFromTop className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fen-ink)]">
              Cómo funciona
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-[var(--fen-body)]">
              Tres pasos, cero intermediarios. El contrato hace de fiduciario.
            </p>
          </RevealFromTop>
          <AnimationGrid className="gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-[var(--fen-border)] bg-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--fen-accent-soft)] text-[var(--fen-accent-strong)]">
                  <s.Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--fen-ink)]">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fen-body)]">{s.body}</p>
              </div>
            ))}
          </AnimationGrid>
        </div>
      </section>
    </div>
  );
}

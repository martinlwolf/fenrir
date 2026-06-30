import { Link } from "react-router-dom";
import { ArrowRight, Building2, ShieldCheck, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { CardsSkeleton } from "@/components/domain/states";
import { useProjects } from "@/hooks/useProjects";

const HERO_IMG = "/buildings/inv-05.jpg";

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
      {/* HERO full-bleed: foto de edificio a pantalla completa con el header transparente encima */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Skyline"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--fen-ink)]/85 via-[var(--fen-ink)]/55 to-[var(--fen-ink)]/85" />

        <div className="container relative z-10 pt-20">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[var(--fen-accent)]" />
              Fideicomiso inmobiliario descentralizado · on-chain
            </span>

            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Invertí en ladrillos.
              <br />
              Validá cada hito on-chain.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
              Fenrir reemplaza al fiduciario humano por smart contracts y un DAO. Vos y la
              comunidad votan, de forma pública y verificable, si cada etapa de la obra se
              cumplió — y recién ahí se liberan los fondos.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="brand" size="lg" asChild>
                <Link to="/projects">
                  Explorar proyectos <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                asChild
              >
                <Link to="/developers/register">Soy desarrollador</Link>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-white/80">
              {["Sin intermediarios", "Votación on-chain", "Fondos en custodia"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[var(--fen-accent)]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center">
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/40 p-1.5">
            <span className="size-1.5 animate-bounce rounded-full bg-white/80" />
          </div>
        </div>
      </section>

      {/* PROYECTOS RECIENTES */}
      <section className="container py-16 lg:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
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
        </div>

        {isLoading ? (
          <CardsSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p, i) => (
              <div
                key={p.address}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 9) * 60}ms` }}
              >
                <ProjectCard project={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="border-y border-[var(--fen-border)] bg-[var(--fen-surface)]">
        <div className="container py-16 lg:py-20">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fen-ink)]">
              Cómo funciona
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-[var(--fen-body)]">
              Tres pasos, cero intermediarios. El contrato hace de fiduciario.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="animate-fade-up rounded-2xl border border-[var(--fen-border)] bg-card p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--fen-accent-soft)] text-[var(--fen-accent-strong)]">
                  <s.Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--fen-ink)]">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fen-body)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

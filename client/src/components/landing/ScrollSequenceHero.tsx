import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

// Secuencia de frames servida desde un CDN. frame001.jpg ... frame119.jpg
const FRAME_COUNT = 119;
const frameSrc = (i: number) =>
  `https://cdn.overflow.nl/modus-sequence-v2/frame${String(i + 1).padStart(3, "0")}.jpg`;

// Cuánto scroll "consume" la secuencia antes de soltar la página.
const SCRUB_DISTANCE = "500%";

// Descargas simultáneas máximas. 4 es un buen balance: no satura la conexión
// pero mantiene el pipeline lleno sin que el frame siguiente espere al anterior.
const MAX_CONCURRENT = 4;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Cuántos frames adelante precargar según la velocidad de conexión estimada.
// En conexiones lentas precargamos menos para no bloquear el frame actual con
// descargas de frames lejanos que el usuario no ha llegado todavía.
function lookahead(): number {
  const conn = (navigator as any).connection;
  const type: string = conn?.effectiveType ?? "4g";
  if (type === "slow-2g" || type === "2g") return 4;
  if (type === "3g") return 12;
  return 25;
}

/**
 * Hero con secuencia de imágenes dirigida por scroll (estilo "scrollytelling").
 *
 * Estrategia de carga:
 * 1. Frame 0 se encola primero → aparece en pantalla sin esperar al resto.
 * 2. Los siguientes LOOKAHEAD frames se encolan con prioridad alta.
 * 3. El resto se encola al final de la cola, cargando de a MAX_CONCURRENT.
 * 4. Al scrollear, los frames del cursor al cursor+LOOKAHEAD se mueven al
 *    frente de la cola para que siempre estén listos antes de que el scroll
 *    llegue ahí.
 */
export function ScrollSequenceHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // images[i] es null mientras no haya cargado.
    const images = new Array<HTMLImageElement | null>(FRAME_COUNT).fill(null);
    const state = { frame: 0 };

    const loaded = new Set<number>();
    const inFlight = new Set<number>();
    const queue: number[] = [];
    const LOOKAHEAD = lookahead();

    const draw = () => {
      const img = images[clamp(Math.round(state.frame), 0, FRAME_COUNT - 1)];
      if (!img) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    // Arranca la descarga real de un frame y lo registra en images[] al terminar.
    const startLoad = (i: number) => {
      inFlight.add(i);
      const img = new Image();
      img.src = frameSrc(i);
      img.onload = () => {
        images[i] = img;
        inFlight.delete(i);
        loaded.add(i);
        if (i === 0) draw();
        if (loaded.size === FRAME_COUNT) ScrollTrigger.refresh();
        pump();
      };
      img.onerror = () => {
        inFlight.delete(i);
        pump();
      };
    };

    // Consume la cola respetando el límite de concurrencia.
    const pump = () => {
      while (inFlight.size < MAX_CONCURRENT && queue.length > 0) {
        const i = queue.shift()!;
        if (!loaded.has(i) && !inFlight.has(i)) startLoad(i);
      }
    };

    // Agrega un frame a la cola si todavía no está cargado ni en vuelo.
    const enqueue = (i: number, front = false) => {
      if (loaded.has(i) || inFlight.has(i) || queue.includes(i)) return;
      if (front) queue.unshift(i);
      else queue.push(i);
    };

    // Cuando el scroll llega al frame `frameIdx`, mueve el rango
    // [frameIdx, frameIdx+LOOKAHEAD] al frente de la cola para que se
    // descarguen con prioridad sobre frames más lejanos.
    const prioritizeAround = (frameIdx: number) => {
      const until = Math.min(frameIdx + LOOKAHEAD, FRAME_COUNT - 1);
      const priority = new Set<number>();
      for (let i = frameIdx; i <= until; i++) priority.add(i);

      const front = queue.filter((i) => priority.has(i));
      const rest = queue.filter((i) => !priority.has(i));
      queue.length = 0;
      queue.push(...front, ...rest);

      // Encola frames del rango que todavía no hayan entrado a la cola.
      for (let i = frameIdx; i <= until; i++) enqueue(i, true);
      pump();
    };

    // Arranque: frame 0 primero → primeros LOOKAHEAD en alta prioridad → resto al fondo.
    enqueue(0, true);
    for (let i = 1; i <= Math.min(LOOKAHEAD, FRAME_COUNT - 1); i++) enqueue(i, true);
    for (let i = LOOKAHEAD + 1; i < FRAME_COUNT; i++) enqueue(i);
    pump();

    resize();
    window.addEventListener("resize", resize);

    // Respeta a quien pidió menos movimiento: mostramos el primer frame estático y dejamos
    // que la página scrollee normal, sin pin ni scrubbing.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      return () => window.removeEventListener("resize", resize);
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: `+=${SCRUB_DISTANCE}`,
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
      },
    });

    // Línea de tiempo normalizada a [0, 1]:
    // 0.00 → 1.00  reproduce la secuencia de frames + reordena la cola de carga.
    // 0.00 → 0.06  desaparece el indicador de scroll apenas arranca.
    // 0.78 → 1.00  se van los textos justo al llegar a los últimos frames.
    tl.to(
      state,
      {
        frame: FRAME_COUNT - 1,
        duration: 1,
        ease: "none",
        snap: "frame",
        onUpdate: () => {
          draw();
          prioritizeAround(Math.round(state.frame));
        },
      },
      0,
    );
    tl.to(hintRef.current, { autoAlpha: 0, duration: 0.06, ease: "none" }, 0);
    tl.to(overlayRef.current, { autoAlpha: 0, y: -60, duration: 0.22, ease: "power1.in" }, 0.78);

    return () => {
      window.removeEventListener("resize", resize);
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100svh] w-full overflow-hidden bg-[var(--fen-ink)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      {/* Scrims en capas para que el texto y el navbar se lean SIEMPRE, sin tapar la imagen:
          (1) franja superior para el header, (2) lavado izquierdo para la columna de texto,
          (3) base inferior. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-44 bg-gradient-to-b from-[var(--fen-ink)]/85 via-[var(--fen-ink)]/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[var(--fen-ink)]/92 via-[var(--fen-ink)]/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-t from-[var(--fen-ink)]/75 to-transparent" />

      <div ref={overlayRef} className="container relative z-10 flex h-full items-center">
        <div className="relative max-w-2xl animate-fade-up pt-16 [text-shadow:0_2px_30px_rgba(8,12,20,0.55)]">
          {/* Halo difuminado detrás del texto: garantiza contraste aunque el sol florezca justo
              detrás del párrafo, sin meter una caja de bordes duros. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] bg-[var(--fen-ink)]/55 blur-2xl"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm [text-shadow:none]">
            <span className="size-1.5 rounded-full bg-[var(--fen-accent)]" />
            Fideicomiso inmobiliario descentralizado · on-chain
          </span>

          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Invertí en ladrillos.
            <br />
            Validá cada hito on-chain.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white">
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

      {/* Indicador de scroll: invita a empezar la animación. */}
      <div ref={hintRef} className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
          Scrolleá para descubrir
        </span>
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/40 p-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-white/80" />
        </div>
      </div>
    </section>
  );
}

// Recorrido virtual PROPIO (sin iframe): reconstruimos el comportamiento del tour con nuestros
// assets, controlandolo 100%. Flujo: fachada marketinera + boton "Ingresar" -> video de transicion
// -> vista de pisos con fade entre pisos, zoom/pan, sidebar centrado y boton "Exterior". Una card
// ocultable arriba a la izquierda muestra proyecto + hito actual + motivo. Solo se muestran los
// pisos cuyo hito ya declaro el developer (Declared+); asi la cantidad de botones sigue a la
// cantidad de hitos. Se usa solo en proyectos mock con tour configurado (lib/mock/tourProjects.ts).
import { useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Home, Info, Minus, Plus, RotateCcw, ShieldCheck, SkipForward, X } from "lucide-react";
import type { MilestoneResponse } from "@shared/schemas/project.schema";
import type { MilestoneStatusValue } from "@shared/constants/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FenrirLogo } from "@/components/landing/FenrirLogo";
import { cn } from "@/lib/utils";
import type { TourConfig, TourFloor } from "@/lib/mock/tourProjects";

// Un piso queda habilitado cuando su hito esta declarado por el developer o mas avanzado.
const REACHED: ReadonlySet<MilestoneStatusValue> = new Set(["Declared", "Voting", "Approved"]);
// Zoom base de las imagenes de piso. Subilo (p.ej. 1.15) para MAS zoom / menos borde visible.
// (El object-cover de la imagen ya elimina las franjas negras; esto es zoom adicional.)
const BASE_SCALE = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.35;
// Duracion del fade al cambiar de piso. Subila para transiciones mas lentas.
const FADE_MS = 700;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toolBtn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/90 transition-colors hover:bg-white/15";

type Phase = "facade" | "transition" | "floors";

export function RenderTourShowcase({
  tour,
  milestones,
  title,
  currentMilestoneIndex,
  className,
}: {
  tour: TourConfig;
  milestones: MilestoneResponse[];
  title?: string;
  currentMilestoneIndex?: number;
  className?: string;
}) {
  const statusByIndex = useMemo(() => {
    const map = new Map<number, MilestoneStatusValue>();
    for (const m of milestones) map.set(m.milestoneIndex, m.status);
    return map;
  }, [milestones]);

  // Pisos habilitados, en orden de obra (PB primero).
  const unlockedFloors = useMemo(
    () =>
      tour.floors.filter(
        (f) => f.image && REACHED.has(statusByIndex.get(f.milestoneIndex) ?? "Pending"),
      ),
    [tour.floors, statusByIndex],
  );

  // Hito actual para la card: el indicado por el proyecto, o el primero no aprobado, o el ultimo.
  const currentMilestone = useMemo(
    () =>
      milestones.find((m) => m.milestoneIndex === currentMilestoneIndex) ??
      milestones.find((m) => m.status !== "Approved") ??
      milestones[milestones.length - 1] ??
      null,
    [milestones, currentMilestoneIndex],
  );

  const [phase, setPhase] = useState<Phase>("facade");
  const [selectedKey, setSelectedKey] = useState<string | null>(unlockedFloors[0]?.key ?? null);
  const [infoOpen, setInfoOpen] = useState(true);

  // Zoom + pan de la imagen del piso.
  const [scale, setScale] = useState(BASE_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const selectedFloor: TourFloor | null =
    unlockedFloors.find((f) => f.key === selectedKey) ?? unlockedFloors[0] ?? null;
  const noFloors = unlockedFloors.length === 0;

  function resetView() {
    setScale(BASE_SCALE);
    setOffset({ x: 0, y: 0 });
  }
  function selectFloor(key: string) {
    setSelectedKey(key);
    resetView();
  }
  function finishTransition() {
    if (!selectedKey && unlockedFloors[0]) setSelectedKey(unlockedFloors[0].key);
    resetView();
    setPhase("floors");
  }

  // Al volver scale a 1, recentramos.
  useEffect(() => {
    if (scale <= BASE_SCALE) setOffset({ x: 0, y: 0 });
  }, [scale]);

  // Zoom con la rueda (listener no-pasivo para poder preventDefault sin scrollear la pagina).
  useEffect(() => {
    if (phase !== "floors") return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(+(s - Math.sign(e.deltaY) * ZOOM_STEP).toFixed(2), MIN_SCALE, MAX_SCALE));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [phase]);

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  }
  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  // Card ocultable: proyecto + hito actual + motivo. Se muestra en fachada y en pisos.
  const infoCard = (
    <div className="absolute left-3 top-3 z-20 max-w-[min(80vw,20rem)]">
      {infoOpen ? (
        <div className="animate-fade-in rounded-2xl bg-background/90 p-3.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <FenrirLogo size={22} wordSize={13} />
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Ocultar tarjeta"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proyecto</p>
              <p className="font-semibold leading-tight">{title ?? "Proyecto"}</p>
            </div>
            {currentMilestone && (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Hito actual · {currentMilestone.milestoneIndex + 1}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {currentMilestone.display.label}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-foreground/90">
                  {currentMilestone.description}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="animate-fade-in flex items-center gap-2 rounded-full bg-background/90 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-md"
          aria-label="Mostrar información del proyecto"
        >
          <Info className="size-4 text-primary" />
          <span className="max-w-[45vw] truncate text-xs font-medium">{title ?? "Proyecto"}</span>
        </button>
      )}
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative h-[70svh] min-h-[440px] w-full overflow-hidden bg-neutral-900">
          {/* --- Fachada marketinera + ingreso --- */}
          {phase === "facade" && (
            <div className="absolute inset-0">
              <img
                src={tour.facadeImage}
                alt={title ? `Fachada de ${title}` : "Fachada del edificio"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/45" />

              {/* Marca Fenrir arriba a la derecha */}
              <div className="absolute right-4 top-4 animate-fade-in">
                <FenrirLogo onDark size={26} wordSize={15} />
              </div>

              {/* Hero */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 p-6 pb-10 text-center sm:pb-14">
                <span
                  className="animate-fade-up inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur"
                >
                  <ShieldCheck className="size-3.5" /> Recorrido verificado on-chain por Fenrir
                </span>
                <h3
                  className="animate-fade-up text-3xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-4xl"
                  style={{ animationDelay: "60ms" }}
                >
                  {title ?? "Recorrido virtual"}
                </h3>
                <p
                  className="animate-fade-up max-w-md text-sm text-white/80"
                  style={{ animationDelay: "120ms" }}
                >
                  Explorá el edificio piso por piso. Cada nivel se habilita cuando el desarrollador
                  declara el hito y la comunidad lo verifica.
                </p>
                <button
                  type="button"
                  onClick={() => setPhase("transition")}
                  disabled={noFloors}
                  style={{ animationDelay: "180ms" }}
                  className="group animate-fade-up relative inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-2xl ring-1 ring-white/25 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    aria-hidden
                    className="absolute -inset-1 rounded-full bg-primary/40 opacity-70 blur-lg transition-opacity group-hover:opacity-100"
                  />
                  <DoorOpen className="relative size-5" />
                  <span className="relative">
                    {noFloors ? "Aún no hay pisos habilitados" : "Ingresar al edificio"}
                  </span>
                </button>
              </div>

              {infoCard}
            </div>
          )}

          {/* --- Video de transicion --- */}
          {phase === "transition" && (
            <div className="absolute inset-0 bg-black">
              <video
                src={tour.transitionVideo}
                autoPlay
                muted
                playsInline
                onEnded={finishTransition}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={finishTransition}
                className="absolute bottom-4 right-4 gap-1.5 opacity-90"
              >
                Saltar <SkipForward className="size-4" />
              </Button>
            </div>
          )}

          {/* --- Pisos: imagen con fade + zoom/pan, sidebar centrado, controles --- */}
          {phase === "floors" && (
            <>
              <div
                ref={viewportRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className={cn(
                  "absolute inset-0 touch-none overflow-hidden",
                  scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
                )}
              >
                {selectedFloor ? (
                  <div
                    // key -> remonta al cambiar de piso, disparando el fade (transicion entre pisos).
                    key={selectedFloor.key}
                    className="animate-fade-in absolute inset-0"
                    style={{
                      animationDuration: `${FADE_MS}ms`,
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                      transition: dragging ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <img
                      src={selectedFloor.image}
                      alt={`Piso ${selectedFloor.label}`}
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                    {/* Pins de departamentos (decorativos, sin funcionalidad). Ajustar x/y (%) en
                        tourProjects.ts. Se contra-escalan para mantener su tamaño al hacer zoom. */}
                    {selectedFloor.pins?.map((pin) => (
                      <div
                        key={pin.label}
                        className="pointer-events-none absolute z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-md ring-1 ring-black/5"
                        style={{
                          left: `${pin.x}%`,
                          top: `${pin.y}%`,
                          transform: `translate(-50%, -50%) scale(${1 / scale})`,
                        }}
                      >
                        <span className="size-2.5 shrink-0 rounded-full bg-[#21316d]" />
                        {pin.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/70">
                    Aún no hay pisos habilitados.
                  </div>
                )}
              </div>

              {/* Etiqueta del piso actual */}
              {selectedFloor && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/55 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                  {selectedFloor.label === "PB" ? "Planta baja" : `Piso ${selectedFloor.label}`}
                </div>
              )}

              {/* Toolbar: volver al exterior + zoom */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl bg-black/55 p-1 backdrop-blur-sm">
                <button type="button" className={toolBtn} onClick={() => setPhase("facade")}>
                  <Home className="size-4" /> Exterior
                </button>
                <span className="mx-0.5 h-5 w-px bg-white/20" />
                <button
                  type="button"
                  className={cn(toolBtn, "px-2")}
                  onClick={() => setScale((s) => clamp(+(s - ZOOM_STEP).toFixed(2), MIN_SCALE, MAX_SCALE))}
                  aria-label="Alejar"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  type="button"
                  className={cn(toolBtn, "px-2")}
                  onClick={() => setScale((s) => clamp(+(s + ZOOM_STEP).toFixed(2), MIN_SCALE, MAX_SCALE))}
                  aria-label="Acercar"
                >
                  <Plus className="size-4" />
                </button>
                <button type="button" className={cn(toolBtn, "px-2")} onClick={resetView} aria-label="Restablecer vista">
                  <RotateCcw className="size-4" />
                </button>
              </div>

              {/* Botones de piso: centrados verticalmente, solo los habilitados (mayor arriba, PB abajo). */}
              <div className="absolute right-3 top-1/2 z-10 flex max-h-[calc(70svh-2rem)] w-fit -translate-y-1/2 flex-col gap-1.5 overflow-y-auto rounded-2xl bg-background/85 p-2.5 shadow-md backdrop-blur-sm">
                {[...unlockedFloors].reverse().map((f) => (
                  <Button
                    key={f.key}
                    type="button"
                    size="sm"
                    variant={f.key === selectedFloor?.key ? "default" : "secondary"}
                    className="h-11 w-20 shrink-0 justify-center rounded-xl text-sm font-semibold"
                    onClick={() => selectFloor(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {infoCard}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import {
  Children,
  isValidElement,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

// Borde por el que "entra" el elemento. top = aparece desde arriba (cae a su lugar).
export type RevealFrom = "top" | "bottom" | "left" | "right";

const offsetFor = (from: RevealFrom, distance: number): { x?: number; y?: number } => {
  switch (from) {
    case "top":
      return { y: -distance };
    case "bottom":
      return { y: distance };
    case "left":
      return { x: -distance };
    case "right":
      return { x: distance };
  }
};

interface RevealProps {
  children: ReactNode;
  /** Borde desde el que aparece. Default "bottom" (clásico fade-up). */
  from?: RevealFrom;
  /** Retardo en segundos (lo usa el stagger de los contenedores). */
  delay?: number;
  duration?: number;
  /** Distancia del desplazamiento inicial en px. */
  distance?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Envuelve cualquier contenido y lo hace aparecer (fade + desplazamiento) cuando entra
 * en el viewport. Construido sobre GSAP ScrollTrigger, dispara una sola vez.
 */
export function Reveal({
  children,
  from = "bottom",
  delay = 0,
  duration = 0.7,
  distance = 40,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        autoAlpha: 0,
        ...offsetFor(from, distance),
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    }, ref);

    return () => ctx.revert();
  }, [from, delay, duration, distance]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/** Atajo semántico: el contenido aparece desde arriba. */
export function RevealFromTop(props: Omit<RevealProps, "from">) {
  return <Reveal {...props} from="top" />;
}

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  /** Borde desde el que entra cada hijo. */
  from?: RevealFrom;
  /** Retardo incremental entre hijos, en segundos. */
  stagger?: number;
  duration?: number;
  distance?: number;
}

// Recorre los children de React y envuelve cada uno en un <Reveal> con delay incremental,
// de modo que aparecen en cascada. `as` define si el contenedor es grid o flex.
function staggered(
  { children, className, from = "bottom", stagger = 0.09, duration, distance }: AnimatedContainerProps,
  base: string,
) {
  return (
    <div className={cn(base, className)}>
      {Children.map(children, (child, i) =>
        isValidElement(child) ? (
          <Reveal from={from} delay={i * stagger} duration={duration} distance={distance}>
            {child}
          </Reveal>
        ) : (
          child
        ),
      )}
    </div>
  );
}

/**
 * Grid que anima en cascada cada uno de sus hijos a medida que aparecen. Pasale las
 * columnas/gaps por `className` (ej: "grid-cols-3 gap-5") igual que un grid de Tailwind.
 */
export function AnimationGrid(props: AnimatedContainerProps) {
  return staggered(props, "grid");
}

/** Igual que AnimationGrid pero con layout flex. */
export function AnimationFlex(props: AnimatedContainerProps) {
  return staggered(props, "flex");
}

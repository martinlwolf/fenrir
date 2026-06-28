import { cn } from "@/lib/utils";

// Ancho de contenido del diseño: 1920 con 160px de padding lateral → caja de 1600 centrada.
// max-w-[1600px] + mx-auto reproduce exacto esos 160px de margen a 1920; el px-* es solo el
// gutter para viewports más angostos (mobile-first).
export function LandingContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-10", className)}
    >
      {children}
    </div>
  );
}

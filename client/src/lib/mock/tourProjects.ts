// Configuracion del recorrido virtual PROPIO de los proyectos mock. Ya no usamos el iframe de
// urbania3d: mostramos nuestros propios assets (fachada + video de transicion + una imagen por
// piso) y reconstruimos el comportamiento (botones de piso gateados por hito, zoom y pan) en un
// componente que controlamos 100% (RenderTourShowcase). Este modulo es liviano (no importa las
// fixtures del mock) porque lo consume ProjectDetailPage, que tambien se monta en modo real.
//
// Los assets son URLs de Cloudinary (CDN publico). Cuando se descarguen a local, basta cambiar
// estas URLs por rutas de client/public.

import type { ProjectTypeValue } from "@shared/constants/enums";

// Address del proyecto mock "Brigos Palermo". Lo importa fixtures.ts para que el proyecto y su
// tour compartan exactamente el mismo address (una sola fuente de verdad).
export const BRIGOS_PALERMO_ADDRESS = "0xb219b219b219b219b219b219b219b219b219b219";

// Pin decorativo (sin funcionalidad) que se dibuja sobre la imagen del piso, por departamento.
export interface TourPin {
  label: string;
  x: number; // posicion horizontal en % (0-100) sobre la imagen
  y: number; // posicion vertical en % (0-100) sobre la imagen
}

export interface TourFloor {
  key: string; // id estable para React y para la seleccion
  label: string; // texto del boton ("PB", "1°", ...)
  image: string; // render/imagen del piso
  milestoneIndex: number; // hito que habilita este piso (se revela con el hito Declarado+)
  pins?: TourPin[]; // marcadores de departamentos (decorativos). Ajustar x/y a ojo por piso.
}

export interface TourConfig {
  facadeImage: string; // fachada inicial del edificio (pantalla de ingreso)
  transitionVideo: string; // video de transicion que se reproduce al ingresar
  floors: TourFloor[]; // en orden de abajo hacia arriba (PB primero)
}

const CLOUD = "https://res.cloudinary.com/dvszm4cwu";

// Config de assets demo (Brigos Palermo). Hoy se usa para TODOS los proyectos (ver getProjectTour).
export const MOCK_TOURS: Record<string, TourConfig> = {
  [BRIGOS_PALERMO_ADDRESS]: {
    facadeImage:
      `${CLOUD}/image/upload/v1772725645/projects/brigos-palermo/buildings/brigos-palermo/exterior-content/media/02_Fachada_izquierda_con_margen-convertido-de-png_nsjqxx.webp`,
    transitionVideo:
      `${CLOUD}/video/upload/v1774721661/projects/brigos-palermo/buildings/brigos-palermo/floors-intro/media/Izquierda_A_P13_HB_jtpidi.mp4`,
    // Edificio de 14 niveles: PB + 1° a 13° (milestoneIndex 0..13, uno por hito; coincide con
    // brigosMilestones en fixtures.ts). Un piso se muestra solo si su hito esta Declarado+.
    floors: [
      {
        key: "PB",
        label: "PB",
        milestoneIndex: 0,
        image: `${CLOUD}/image/upload/v1773852951/projects/brigos-palermo/buildings/brigos-palermo/floors/media/Piso00-convertido-de-png_me0pig.webp`,
        pins: [
          { label: "PB A", x: 34, y: 30 },
          { label: "Local Comercial", x: 63, y: 35 },
        ],
      },
      {
        key: "1",
        label: "1°",
        milestoneIndex: 1,
        image: `${CLOUD}/image/upload/v1773665583/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P1_4_-convertido-de-png_oflji5.webp`,
        pins: [
          { label: "1° D", x: 34, y: 32 },
          { label: "1° B", x: 74, y: 32 },
          { label: "1° C", x: 25, y: 57 },
          { label: "1° A", x: 70, y: 57 },
        ],
      },
      {
        key: "2",
        label: "2°",
        milestoneIndex: 2,
        image: `${CLOUD}/image/upload/v1773523934/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P2-convertido-de-png_2_nakqjf.webp`,
      },
      {
        key: "3",
        label: "3°",
        milestoneIndex: 3,
        image: `${CLOUD}/image/upload/v1773523959/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P3-convertido-de-png_1_pxhho6.webp`,
      },
      {
        key: "4",
        label: "4°",
        milestoneIndex: 4,
        image: `${CLOUD}/image/upload/v1773523976/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P4-convertido-de-png_1_fmkl7d.webp`,
      },
      {
        key: "5",
        label: "5°",
        milestoneIndex: 5,
        image: `${CLOUD}/image/upload/v1772318752/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P5-convertido-de-png_1_idsexj.webp`,
      },
      {
        key: "6",
        label: "6°",
        milestoneIndex: 6,
        image: `${CLOUD}/image/upload/v1772318749/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P6-convertido-de-png_1_zumlsc.webp`,
      },
      {
        key: "7",
        label: "7°",
        milestoneIndex: 7,
        image: `${CLOUD}/image/upload/v1772318751/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P7-convertido-de-png_1_xniv1p.webp`,
      },
      {
        key: "8",
        label: "8°",
        milestoneIndex: 8,
        image: `${CLOUD}/image/upload/v1772318753/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P8-convertido-de-png_1_fxkava.webp`,
      },
      {
        key: "9",
        label: "9°",
        milestoneIndex: 9,
        image: `${CLOUD}/image/upload/v1772318753/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P9-convertido-de-png_1_yzc8ix.webp`,
      },
      {
        key: "10",
        label: "10°",
        milestoneIndex: 10,
        image: `${CLOUD}/image/upload/v1772318856/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P10-convertido-de-png_pduyyu.webp`,
      },
      {
        key: "11",
        label: "11°",
        milestoneIndex: 11,
        image: `${CLOUD}/image/upload/v1772318856/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P11-convertido-de-png_tmrx3f.webp`,
      },
      {
        key: "12",
        label: "12°",
        milestoneIndex: 12,
        image: `${CLOUD}/image/upload/v1772318854/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P12-convertido-de-png_j1wgkw.webp`,
      },
      {
        key: "13",
        label: "13°",
        milestoneIndex: 13,
        image: `${CLOUD}/image/upload/v1772318856/projects/brigos-palermo/buildings/brigos-palermo/floors/media/P13-convertido-de-png_nt73tc.webp`,
      },
    ],
  },
};

// Por ahora TODOS los proyectos de Inversion usan los mismos assets demo (Brigos), gateados por sus
// hitos reales. Los Civicos (obra publica) no tienen recorrido de edificio.
const DEFAULT_TOUR: TourConfig = MOCK_TOURS[BRIGOS_PALERMO_ADDRESS]!;

/**
 * Config del recorrido virtual de un proyecto, o undefined si no corresponde (proyectos Civicos).
 * Hoy los proyectos de Inversion devuelven los assets demo compartidos; que pisos se ven depende de
 * los hitos reales del proyecto. Cuando cada proyecto tenga sus renders, elegir aca por proyecto.
 */
export function getProjectTour(projectType: ProjectTypeValue): TourConfig | undefined {
  if (projectType === "Civic") return undefined;
  return DEFAULT_TOUR;
}

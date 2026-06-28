// Datos mockeados localmente para la landing. No hay llamadas a la API acá: la landing es
// marketing estático. Los valores reproducen el contenido del diseño (Fenrir · Home).
import type { ProjectStatusValue } from "@shared/constants/enums";

export type ProjectType = "Investment" | "Civic";

export interface FeaturedProject {
  address: string; // ya acortada para mostrar (0x…)
  type: ProjectType;
  status: ProjectStatusValue;
  raised: string; // ej. "142 ETH"
  progressPct: number; // 0-100
  /** Color de la barra de progreso tal cual el diseño. */
  progressTone: "accent" | "verified";
  ff: string; // objetivo (Funding Final)
  fmpa: string; // mínimo (Funding Mínimo para Aprobar)
}

export const HERO_PROJECT = {
  ref: "PROYECTO #042",
  name: "Parque Solar Norte",
  type: "Civic" as ProjectType,
  funded: "68.4 / 100 ETH",
  progressPct: 68.4,
  milestones: [
    { n: 1, label: "Terreno y permisos", state: "Liberado" as const },
    { n: 2, label: "Instalación de paneles", state: "En votación" as const },
    { n: 3, label: "Conexión a red eléctrica", state: "Pendiente" as const },
  ],
};

export const STATS = [
  { value: "2 480 ETH", label: "Valor en custodia", tone: "ink" as const },
  { value: "37", label: "Proyectos activos", tone: "ink" as const },
  { value: "1 284", label: "Inversores votando", tone: "ink" as const },
  { value: "152", label: "Hitos aprobados", tone: "verified" as const },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    accent: false,
    title: "Fondear el proyecto",
    body: "Los inversores aportan ETH al contrato. Los fondos quedan bloqueados en custodia on-chain — no en manos de un fiduciario.",
  },
  {
    step: "02",
    accent: false,
    title: "Votar cada hito",
    body: "Cuando el developer reporta un avance, el DAO vota públicamente si se cumplió. Voto ponderado por tokens, registrado en la cadena.",
  },
  {
    step: "03",
    accent: true,
    title: "Liberar por tranches",
    body: "Si el hito se aprueba, el contrato libera ese tramo automáticamente. Si se rechaza, el dinero sigue protegido para los inversores.",
  },
];

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    address: "0x6F3a…1bC2",
    type: "Investment",
    status: "Funding",
    raised: "142 ETH",
    progressPct: 71,
    progressTone: "accent",
    ff: "200 ETH",
    fmpa: "80 ETH",
  },
  {
    address: "0x91Ee…77Bf",
    type: "Civic",
    status: "Building",
    raised: "88 ETH",
    progressPct: 73,
    progressTone: "verified",
    ff: "120 ETH",
    fmpa: "60 ETH",
  },
  {
    address: "0x3aE1…A1d8",
    type: "Investment",
    status: "Selling",
    raised: "150 ETH",
    progressPct: 100,
    progressTone: "verified",
    ff: "150 ETH",
    fmpa: "90 ETH",
  },
  {
    address: "0x0c4F…9d04",
    type: "Civic",
    status: "Funding",
    raised: "39 ETH",
    progressPct: 26,
    progressTone: "accent",
    ff: "150 ETH",
    fmpa: "70 ETH",
  },
];

export const PROJECT_TYPES = [
  {
    icon: "↑",
    iconBg: "ink" as const,
    tag: "CON FINES DE LUCRO",
    tagTone: "neutral" as const,
    title: "Fenrir Inversión",
    body: "Proyectos con retorno económico. Al vender, el contrato reparte la ganancia entre los inversores según su participación.",
    points: [
      "Tokens FDT que representan tu parte",
      "Reparto automático al cerrar la venta",
      "Comisión transparente del protocolo",
    ],
  },
  {
    icon: "♦",
    iconBg: "verified" as const,
    tag: "SIN FINES DE LUCRO",
    tagTone: "verified" as const,
    title: "Fenrir Cívico",
    body: "Obra pública y bienes comunes. Sin reparto de ganancia: el objetivo es que la obra se cumpla, auditada por la comunidad.",
    points: [
      "Trazabilidad total del gasto público",
      "La comunidad vota cada avance de obra",
      "Cero intermediarios, cero opacidad",
    ],
  },
];

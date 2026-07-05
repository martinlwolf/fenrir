// Helpers de identidad visual para avatares deterministas (developers, wallets). Sin estado:
// el mismo input siempre da las mismas iniciales y el mismo gradiente.

/** Iniciales (hasta 2) de una razon social / nombre. Ignora palabras vacias. */
export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return Math.abs(h);
}

// Paleta de gradientes coherente con Slate & Emerald: tonos profundos, sobrios.
const GRADIENTS = [
  "linear-gradient(135deg, #0f7a52, #0b5c3e)",
  "linear-gradient(135deg, #1b2430, #38414c)",
  "linear-gradient(135deg, #2c5f6f, #1b3a44)",
  "linear-gradient(135deg, #6d5bd0, #4a3da3)",
  "linear-gradient(135deg, #b0863c, #8a6520)",
  "linear-gradient(135deg, #2f6f5b, #1f4a3d)",
];

/** Gradiente CSS determinista para el avatar de una wallet/identidad. */
export function avatarGradient(seed: string | null | undefined): string {
  return GRADIENTS[hash(seed ?? "0x0") % GRADIENTS.length];
}

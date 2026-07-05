import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockDevelopers, mockProjects } from "../fixtures";

const base = env.apiUrl;

// Construye los certificados (credenciales soulbound) de una wallet a partir de su historico:
// `completed` certificados de Finalizacion + `failed` de Proyecto Fallido. Cuando se puede,
// los referencia a proyectos reales de esa wallet para que el perfil sea coherente.
function certificatesFor(wallet: string, completed: number, failed: number) {
  const own = mockProjects.filter((p) => p.developerWallet === wallet).map((p) => p.address);
  const pick = (i: number) => own[i % own.length] ?? mockProjects[i % mockProjects.length].address;
  const certs: {
    type: "Completion" | "Failed";
    tokenId: number;
    projectAddress: string;
    mintedAtBlock: string;
  }[] = [];
  let tokenId = 1;
  for (let i = 0; i < completed; i++) {
    certs.push({
      type: "Completion",
      tokenId: tokenId++,
      projectAddress: pick(i),
      mintedAtBlock: String(900000 + tokenId * 17),
    });
  }
  for (let i = 0; i < failed; i++) {
    certs.push({
      type: "Failed",
      tokenId: tokenId++,
      projectAddress: pick(completed + i),
      mintedAtBlock: String(900000 + tokenId * 17),
    });
  }
  return certs;
}

export const developerHandlers = [
  // Directorio: lista ordenable (completed/failed/razonSocial) y filtrable, paginada.
  http.get(`${base}/developers`, ({ request }) => {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") ?? "completed";
    const order = url.searchParams.get("order") ?? "desc";
    const filter = url.searchParams.get("filter") ?? "all";
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    let rows = mockDevelopers.map((d) => ({
      wallet: d.wallet,
      razonSocial: d.razonSocial,
      cuit: d.cuit,
      completed: d.completed,
      failed: d.failed,
    }));

    if (filter === "withCompleted") rows = rows.filter((d) => d.completed > 0);
    if (filter === "withFailed") rows = rows.filter((d) => d.failed > 0);

    rows.sort((a, b) => {
      let cmp = 0;
      if (sort === "razonSocial") cmp = a.razonSocial.localeCompare(b.razonSocial, "es");
      else if (sort === "failed") cmp = a.failed - b.failed;
      else cmp = a.completed - b.completed;
      return order === "asc" ? cmp : -cmp;
    });

    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
    });
  }),

  http.get(`${base}/developers/:wallet`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    const dev =
      mockDevelopers.find((d) => d.wallet === wallet) ??
      mockDevelopers.find(() => mockProjects.some((p) => p.developerWallet === wallet));
    return HttpResponse.json({
      wallet,
      razonSocial: dev?.razonSocial ?? "Constructora del Norte S.A.",
      cuit: dev?.cuit ?? "30-71234567-8",
      verificationDocsUrl:
        dev?.verificationDocsUrl ??
        "http://localhost:4000/docs/verif-" + wallet.slice(0, 6) + ".pdf",
    });
  }),

  http.get(`${base}/developers/:wallet/reputation`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    const dev = mockDevelopers.find((d) => d.wallet === wallet);
    const completed = dev?.completed ?? 1;
    const failed = dev?.failed ?? 0;
    return HttpResponse.json({
      wallet,
      completed,
      failed,
      certificates: certificatesFor(wallet, completed, failed),
    });
  }),

  http.post(`${base}/developers/:wallet/verification`, () => new HttpResponse(null, { status: 200 })),
];

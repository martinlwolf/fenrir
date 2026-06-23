// Handlers MSW de proyectos / hitos / reportes (US1). Replican el contrato de
// contracts/api.md y devuelven datos que validan contra los schemas de shared/.
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects, mockReports, mockVerification } from "../fixtures";

const base = env.apiUrl;

function paginate<T>(items: T[], url: URL) {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

export const projectHandlers = [
  http.get(`${base}/projects`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    let items = mockProjects.map(({ milestones: _m, ...p }) => p);
    if (type) items = items.filter((p) => p.projectType === type);
    if (status) items = items.filter((p) => p.status === status);
    return HttpResponse.json(paginate(items, url));
  }),

  http.get(`${base}/projects/buyer-view`, ({ request }) => {
    const url = new URL(request.url);
    const items = mockProjects
      .filter((p) => p.status === "Selling")
      .map(({ milestones: _m, ...p }) => p);
    return HttpResponse.json(paginate(items, url));
  }),

  http.get(`${base}/projects/:address`, ({ params }) => {
    const project = mockProjects.find((p) => p.address === params.address);
    if (!project) {
      return HttpResponse.json(
        { error: "Proyecto no encontrado", error_code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return HttpResponse.json(project);
  }),

  http.get(`${base}/projects/:address/milestones`, ({ params }) => {
    const project = mockProjects.find((p) => p.address === params.address);
    return HttpResponse.json(project?.milestones ?? []);
  }),

  http.get(`${base}/reports/:id`, ({ params }) => {
    const report = mockReports[String(params.id)];
    if (!report) {
      return HttpResponse.json(
        { error: "Reporte no encontrado", error_code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return HttpResponse.json(report);
  }),

  http.get(`${base}/reports/:id/verification`, ({ params }) => {
    const verification = mockVerification[String(params.id)] ?? {
      computedHash: "0x" + "00".repeat(32),
      onChainHash: null,
      hashMatch: null,
    };
    return HttpResponse.json(verification);
  }),
];

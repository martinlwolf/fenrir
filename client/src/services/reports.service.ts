import { api } from "@/lib/api";
import {
  createReportResponseSchema,
  reportResponseSchema,
  reportVerificationSchema,
  type CreateReportResponse,
  type ReportResponse,
  type ReportVerification,
} from "@shared/schemas/report.schema";

// Sube el reporte de un hito (multipart: texto + media + docs). Requiere sesion de firma
// (Authorization: Wallet <...>, ya adjuntado por el interceptor). Devuelve reportUrl +
// reportHash para la tx on-chain declareMilestone.
export async function createReport(
  address: string,
  milestoneIndex: number,
  input: { text: string; media?: File[]; documents?: File[] },
): Promise<CreateReportResponse> {
  const form = new FormData();
  form.append("text", input.text);
  input.media?.forEach((f) => form.append("media", f));
  input.documents?.forEach((f) => form.append("documents", f));
  const { data } = await api.post(
    `/projects/${address}/milestones/${milestoneIndex}/report`,
    form,
  );
  return createReportResponseSchema.parse(data);
}

export async function getReport(reportId: number | string): Promise<ReportResponse> {
  const { data } = await api.get(`/reports/${reportId}`);
  return reportResponseSchema.parse(data);
}

export async function getReportVerification(
  reportId: number | string,
): Promise<ReportVerification> {
  const { data } = await api.get(`/reports/${reportId}/verification`);
  return reportVerificationSchema.parse(data);
}

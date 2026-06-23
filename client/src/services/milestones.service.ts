import { z } from "zod";
import { api } from "@/lib/api";
import {
  milestoneResponseSchema,
  type MilestoneResponse,
} from "@shared/schemas/project.schema";

export async function listMilestones(address: string): Promise<MilestoneResponse[]> {
  const { data } = await api.get(`/projects/${address}/milestones`);
  return z.array(milestoneResponseSchema).parse(data);
}

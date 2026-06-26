import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects } from "../fixtures";

const base = env.apiUrl;

export const investorHandlers = [
  http.get(`${base}/investors/:wallet/investments`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    // Demo: el inversor participa en los dos primeros proyectos.
    const items = mockProjects.slice(0, 2).map((p) => ({
      projectAddress: p.address,
      investorWallet: wallet,
      amount: (10n ** 18n).toString(),
      txHash: "0x" + "ab".repeat(32),
      block: "1000000",
    }));
    return HttpResponse.json(items);
  }),

  http.get(`${base}/investors/:wallet/claimable`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    return HttpResponse.json({
      wallet,
      items: [
        { projectAddress: mockProjects[3].address, type: "Refund", amount: (10n ** 18n).toString() },
      ],
    });
  }),
];

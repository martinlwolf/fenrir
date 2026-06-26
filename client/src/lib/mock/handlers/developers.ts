import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects } from "../fixtures";

const base = env.apiUrl;

export const developerHandlers = [
  http.get(`${base}/developers/:wallet`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    return HttpResponse.json({
      wallet,
      razonSocial: "Constructora del Norte S.A.",
      cuit: "30-71234567-8",
      verificationDocsUrl: "http://localhost:4000/docs/verif-" + wallet.slice(0, 6) + ".pdf",
    });
  }),

  http.get(`${base}/developers/:wallet/reputation`, ({ params }) => {
    const wallet = String(params.wallet).toLowerCase();
    return HttpResponse.json({
      wallet,
      completed: 1,
      failed: 0,
      certificates: [
        {
          type: "Completion",
          tokenId: 1,
          projectAddress: mockProjects[2].address,
          mintedAtBlock: "999000",
        },
      ],
    });
  }),

  http.post(`${base}/developers/:wallet/verification`, () => new HttpResponse(null, { status: 200 })),
];

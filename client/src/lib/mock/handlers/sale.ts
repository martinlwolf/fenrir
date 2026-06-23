import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects } from "../fixtures";

const base = env.apiUrl;
const ETH = (n: number) => (BigInt(Math.round(n * 1000)) * 10n ** 15n).toString();
const selling = mockProjects[2]; // a3, status Selling

export const saleHandlers = [
  http.get(`${base}/projects/:address/offers`, ({ params }) => {
    if (params.address !== selling.address) return HttpResponse.json([]);
    return HttpResponse.json([
      {
        offerId: 1,
        buyerWallet: "0x" + "f1".repeat(20),
        amount: ETH(78),
        proposalId: 10,
        status: "Voting",
      },
      {
        offerId: 2,
        buyerWallet: "0x" + "f2".repeat(20),
        amount: ETH(60),
        proposalId: 11,
        status: "Rejected",
      },
    ]);
  }),

  http.get(`${base}/projects/:address/distribution`, ({ params }) => {
    return HttpResponse.json({
      projectAddress: String(params.address),
      salePrice: null,
      distributionPool: ETH(0),
      shares: [],
    });
  }),
];

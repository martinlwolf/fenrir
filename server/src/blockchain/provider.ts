// Provider ethers hacia Sepolia y fabricas de contratos. Soporta RPC http(s) y
// websocket. Es la unica puerta de entrada al "afuera" on-chain; las llamadas view
// se hacen desde services, nunca desde controllers (skill backend-architecture).
import { Contract, JsonRpcProvider, WebSocketProvider, type Provider } from "ethers";
import { env } from "../config/env";
import { ABIS } from "./abis";

function buildProvider(): Provider {
  const url = env.SEPOLIA_RPC_URL;
  const network = { chainId: env.SEPOLIA_CHAIN_ID, name: "sepolia" };
  if (url.startsWith("ws")) {
    return new WebSocketProvider(url, network);
  }
  return new JsonRpcProvider(url, network, { staticNetwork: true });
}

export const provider: Provider = buildProvider();

export function factoryContract(): Contract {
  return new Contract(env.FENRIR_FACTORY_ADDRESS, ABIS.FenrirFactory, provider);
}

export function projectContract(address: string): Contract {
  return new Contract(address, ABIS.FenrirProject, provider);
}

export function governorContract(address: string): Contract {
  return new Contract(address, ABIS.FenrirGovernor, provider);
}

export function tokenContract(address: string): Contract {
  return new Contract(address, ABIS.FenrirToken, provider);
}

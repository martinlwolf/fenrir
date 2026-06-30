// TEMP (Claude): compara las dos factories candidatas.
import 'dotenv/config';
import { Contract, JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const ABI = [
  'function projectsCount() view returns (uint256)',
  'function allProjects(uint256) view returns (address)',
];
const FACTORIES = {
  'OLD (frontend/client.env) 0xB6e8dc': '0xB6e8dc6432D56438B7119f6fB1cC0AFBb86F5451',
  'NEW (backend .env)        0x5F95eA': '0x265cAaAa1D0362a5098F92d0EDec81325628c06a',
};

for (const [label, addr] of Object.entries(FACTORIES)) {
  try {
    const c = new Contract(addr, ABI, provider);
    const code = await provider.getCode(addr);
    if (code === '0x') { console.log(`${label}: SIN CODIGO (no es un contrato desplegado)`); continue; }
    const n = await c.projectsCount();
    const list = [];
    for (let i = 0; i < Number(n); i++) list.push(await c.allProjects(i));
    console.log(`${label}: projectsCount=${n}`);
    list.forEach((a, i) => console.log(`    [${i}] ${a}`));
  } catch (e) {
    console.log(`${label}: ERROR ${e.shortMessage || e.message}`);
  }
}
process.exit(0);

// Deploy de FenrirFactory a Sepolia con ethers v6, sin runtime de Hardhat.
//
// El factory depende de 3 libraries `external` (TokenDeployer, GovernorDeployer,
// ProjectDeployer): hay que desplegarlas primero y linkear sus direcciones en el
// bytecode de creacion del factory antes de enviarlo. Este script lee los artifacts
// que dejo `hardhat compile`, hace el linking a mano con las `linkReferences` del
// artifact y deploya todo con la wallet de PRIVATE_KEY.
//
// Uso:
//   1) hardhat compile   (ya hecho)
//   2) completar contracts/.env con SEPOLIA_RPC_URL y PRIVATE_KEY (con SepoliaETH)
//   3) node scripts/deploy.mjs
//
// Al final imprime la address del factory y el bloque de despliegue, que van a
// FENRIR_FACTORY_ADDRESS e INGESTION_START_BLOCK del server/.env.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { ethers } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = resolve(__dirname, "../artifacts/src");

function loadArtifact(relPath) {
  return JSON.parse(readFileSync(resolve(ART, relPath), "utf8"));
}

// Reemplaza los placeholders de libraries en el bytecode de creacion usando las
// posiciones (start/length, en bytes) que da linkReferences. addresses: { libName: 0x... }
function linkBytecode(artifact, addresses) {
  let bytecode = artifact.bytecode;
  for (const file of Object.keys(artifact.linkReferences ?? {})) {
    for (const libName of Object.keys(artifact.linkReferences[file])) {
      const addr = addresses[libName];
      if (!addr) throw new Error(`Falta la direccion de la library ${libName}`);
      const cleanAddr = addr.replace(/^0x/, "").toLowerCase();
      for (const { start, length } of artifact.linkReferences[file][libName]) {
        if (length !== 20) throw new Error(`length inesperado para ${libName}`);
        // El bytecode es hex string sin 0x al inicio; cada byte = 2 chars.
        const head = bytecode.slice(0, 2 + start * 2); // +2 por el "0x"
        const tail = bytecode.slice(2 + start * 2 + length * 2);
        bytecode = head + cleanAddr + tail;
      }
    }
  }
  return bytecode;
}

async function deploy(name, artifact, signer, args = [], libraries = null) {
  const bytecode = libraries ? linkBytecode(artifact, libraries) : artifact.bytecode;
  const factory = new ethers.ContractFactory(artifact.abi, bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`  ${name}: ${address}`);
  return { address, contract };
}

async function main() {
  const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL) throw new Error("Falta SEPOLIA_RPC_URL en contracts/.env");
  if (!PRIVATE_KEY) throw new Error("Falta PRIVATE_KEY en contracts/.env");

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(signer.address);
  console.log(`Red: chainId ${network.chainId}`);
  console.log(`Deployer: ${signer.address} (${ethers.formatEther(balance)} ETH)`);
  if (balance === 0n) throw new Error("El deployer no tiene SepoliaETH. Pedi en un faucet.");

  console.log("\nDeployando libraries...");
  const tokenDep = await deploy(
    "TokenDeployer",
    loadArtifact("deployers/TokenDeployer.sol/TokenDeployer.json"),
    signer,
  );
  const governorDep = await deploy(
    "GovernorDeployer",
    loadArtifact("deployers/GovernorDeployer.sol/GovernorDeployer.json"),
    signer,
  );
  const projectDep = await deploy(
    "ProjectDeployer",
    loadArtifact("deployers/ProjectDeployer.sol/ProjectDeployer.json"),
    signer,
  );

  console.log("\nDeployando FenrirFactory (linkeando libraries)...");
  const factoryArtifact = loadArtifact("FenrirFactory.sol/FenrirFactory.json");
  const { address: factoryAddress, contract: factory } = await deploy(
    "FenrirFactory",
    factoryArtifact,
    signer,
    [],
    {
      TokenDeployer: tokenDep.address,
      GovernorDeployer: governorDep.address,
      ProjectDeployer: projectDep.address,
    },
  );

  const deployTx = factory.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("\n========================================");
  console.log("DEPLOY OK. Copia esto a server/.env:");
  console.log(`FENRIR_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`INGESTION_START_BLOCK=${receipt.blockNumber}`);
  console.log("========================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// ABIs de los 4 contratos de /contracts, en formato Human-Readable de ethers
// (solo eventos + las pocas funciones view que el backend lee). Los contratos se
// compilan/despliegan manualmente via Remix (constitution Principio IV); aca solo
// vive lo necesario para escuchar eventos y leer estado puntual.
import FenrirFactory from "./FenrirFactory.json";
import FenrirProject from "./FenrirProject.json";
import FenrirGovernor from "./FenrirGovernor.json";
import FenrirToken from "./FenrirToken.json";

export const ABIS = {
  FenrirFactory: FenrirFactory as string[],
  FenrirProject: FenrirProject as string[],
  FenrirGovernor: FenrirGovernor as string[],
  FenrirToken: FenrirToken as string[],
};

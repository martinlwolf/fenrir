// Las ABIs de los 4 contratos viven en shared/ (fuente unica compartida con el client).
// Aca solo se reexponen con la forma `ABIS` que consumen el listener y el provider.
import {
  FENRIR_FACTORY_ABI,
  FENRIR_GOVERNOR_ABI,
  FENRIR_PROJECT_ABI,
  FENRIR_TOKEN_ABI,
} from "@shared/chain/abis";

export const ABIS = {
  FenrirFactory: FENRIR_FACTORY_ABI,
  FenrirProject: FENRIR_PROJECT_ABI,
  FenrirGovernor: FENRIR_GOVERNOR_ABI,
  FenrirToken: FENRIR_TOKEN_ABI,
};

// Wiring central de rutas. Cada router declara sus paths completos y se montan todos
// en la raiz del API para evitar confusion de prefijos compartidos.
import { Router } from "express";
import { projectRouter } from "./project.routes";
import { investorRouter } from "./investor.routes";
import { reportRouter } from "./report.routes";
import { authRouter } from "./auth.routes";
import { governanceRouter } from "./governance.routes";
import { developerRouter } from "./developer.routes";
import { saleRouter } from "./sale.routes";

export function buildApiRouter(): Router {
  const router = Router();
  router.use(authRouter);
  router.use(projectRouter);
  router.use(governanceRouter);
  router.use(reportRouter);
  router.use(saleRouter);
  router.use(investorRouter);
  router.use(developerRouter);
  return router;
}

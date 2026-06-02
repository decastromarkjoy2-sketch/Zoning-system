import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import zoningRouter from "./zoning";
import boundariesRouter from "./boundaries";
import koboRouter from "./kobo";
import approvalsRouter from "./approvals";
import auditRouter from "./audit";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(zoningRouter);
router.use(boundariesRouter);
router.use(koboRouter);
router.use(approvalsRouter);
router.use(auditRouter);
router.use(notificationsRouter);
router.use(reportsRouter);

export default router;

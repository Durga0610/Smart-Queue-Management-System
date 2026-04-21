import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import branchesRouter from "./branches";
import servicesRouter from "./services";
import bookingsRouter from "./bookings";
import queueRouter from "./queue";
import swapRouter from "./swap";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(branchesRouter);
router.use(servicesRouter);
router.use(bookingsRouter);
router.use(queueRouter);
router.use(swapRouter);
router.use(adminRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tagerRouter from "./tager";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tagerRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tagerRouter from "./tager";
import presentationRouter from "./presentation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(presentationRouter);
router.use(tagerRouter);

export default router;

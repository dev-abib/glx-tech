import { Router } from "express";
import { createUser } from "./user.controller.js";
const router = Router();

router.route("/create-user").post(createUser);


export default router;

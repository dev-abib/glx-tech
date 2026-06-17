import express from "express";
const router = express.Router();

import userRoutes from "../modules/user/user.routes.js";

// user routes
router.use("/users", userRoutes);

export default router;

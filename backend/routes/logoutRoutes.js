import express from "express";
import { logout } from "../controllers/logoutController.js";

const router = express.Router();

// Route to logout a user and if admin delete the room
router.post("/", logout);

export default router;

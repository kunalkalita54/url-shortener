import { Router } from "express";
import * as authController from '../controllers/auth.controller.js';

const redirectRouter= Router();

redirectRouter.get('/:shortCode', authController.redirect_url);

export default redirectRouter;
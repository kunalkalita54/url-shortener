import { Router } from "express";
import * as authController from '../controllers/auth.controller.js';
import * as rateLimiterMiddleware from '../middlewares/rateLimiter.middleware.js';

const redirectRouter= Router();

redirectRouter.get('/:shortCode', rateLimiterMiddleware.rateLimiter , authController.redirect_url);

export default redirectRouter;
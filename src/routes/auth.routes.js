import { Router } from "express";
import * as analyticsController from '../controllers/analytics.controller.js';
import * as authController from '../controllers/auth.controller.js';
import * as authMiddleware from '../middlewares/auth.middleware.js';

const authRouter= Router();

//Register the user
authRouter.post('/register', authController.register);

//Login a user
authRouter.post('/login', authController.login);

//Creating a short url
authRouter.post('/shorten_url', authMiddleware.verifyToken, authController.shorten_url);


authRouter.get('/getUrlAnalytics/:shortCode', authMiddleware.verifyToken, analyticsController.getUrlAnalytics);

export default authRouter;

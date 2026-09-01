import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import redirectRouter from './routes/redirect.routes.js';

import { addClickEvent } from './queue.js';

const app=express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/url', authRouter);

app.use('/', redirectRouter);


export default app;



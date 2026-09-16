import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import redirectRouter from './routes/redirect.routes.js';



const app=express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use('/api/url', authRouter);

app.use('/', redirectRouter);


export default app;



import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRouter from './routes/auth.routes.js';
import redirectRouter from './routes/redirect.routes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://url-shortener-indol-nine-24.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());


app.use('/api/url', authRouter);

app.use('/', redirectRouter);


export default app;



import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/database.js';

const PORT = process.env.PORT || 3000;

try {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server is running at port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
}
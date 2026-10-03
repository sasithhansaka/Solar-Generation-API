import mongoose from 'mongoose';
import { mongodbUri } from './env.js';

async function connectDatabase() {
  await mongoose.connect(mongodbUri);
  console.log('MongoDB connected');
}

export { connectDatabase };

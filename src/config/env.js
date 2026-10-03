import 'dotenv/config';

for (const name of ['MONGODB_URI', 'JWT_SECRET', 'DEVICE_TOKEN_SECRET']) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
}

export const port = process.env.PORT || 3000;
export const nodeEnv = process.env.NODE_ENV || 'development';
export const mongodbUri = process.env.MONGODB_URI;
export const jwtSecret = process.env.JWT_SECRET;
export const deviceTokenSecret = process.env.DEVICE_TOKEN_SECRET;
export const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

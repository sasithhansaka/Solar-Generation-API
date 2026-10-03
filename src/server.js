import app from './app.js';
import { port } from './config/env.js';
import { connectDatabase } from './config/database.js';

async function start() {
  await connectDatabase();
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
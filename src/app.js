import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { acceptJson } from './middleware/acceptJson.js';

const app = express();

// ETags are set explicitly by sendJson (conditional GET), not by Express.
app.set('etag', false);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'solar-generation-api' });
});

app.use('/api/v1', acceptJson, routes);

app.use(notFound);
app.use(errorHandler);

export default app;

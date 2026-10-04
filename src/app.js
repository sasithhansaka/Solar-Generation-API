import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi.js';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { acceptJson } from './middleware/acceptJson.js';

const app = express();

// ETags are set explicitly by sendJson (conditional GET), not by Express.
app.set('etag', false);

// upgrade-insecure-requests is switched off so Swagger UI also loads over plain http (local development);
// the deployed API is served over HTTPS anyway.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests': null } },
  })
);
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'solar-generation-api' });
});

// Live OpenAPI documentation (public, no token needed to read it).
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Solar Generation API' }));

app.use('/api/v1', acceptJson, routes);

app.use(notFound);
app.use(errorHandler);

export default app;

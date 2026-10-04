import swaggerJSDoc from 'swagger-jsdoc';
import { apiBaseUrl } from '../config/env.js';

// OpenAPI 3.0 description of the API. Served by Swagger UI at /api-docs (raw JSON at /api-docs.json).
// Keep it in step with the routes: every endpoint, status code and header documented here exists.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const param = (name) => ({ $ref: `#/components/parameters/${name}` });
const response = (name) => ({ $ref: `#/components/responses/${name}` });
const jsonContent = (schema) => ({ 'application/json': { schema } });

// { data: [...], pagination: {...} }
const pageOf = (itemSchema, description) => ({
  type: 'object',
  description,
  required: ['data', 'pagination'],
  properties: {
    data: { type: 'array', items: ref(itemSchema) },
    pagination: ref('Pagination'),
  },
});

// Headers sent with a 200 on a conditional GET.
const etagHeader = { ETag: { $ref: '#/components/headers/ETag' } };

// Security: SLSEA users read, devices write.
const userAuth = [{ userBearer: [] }];
const deviceAuth = [{ deviceBearer: [] }];

// Responses shared by every authenticated GET.
const readErrors = {
  401: response('Unauthorized'),
  403: response('Forbidden'),
  406: response('NotAcceptable'),
  405: response('MethodNotAllowed'),
};

// A GET that returns one body, with conditional-GET support.
function conditionalGet({ tags, summary, description, parameters = [], schema, notFound = true }) {
  return {
    tags,
    summary,
    description,
    security: userAuth,
    parameters: [...parameters, param('IfNoneMatch')],
    responses: {
      200: { description: 'OK', headers: etagHeader, content: jsonContent(schema) },
      304: response('NotModified'),
      400: response('BadRequest'),
      ...readErrors,
      ...(notFound ? { 404: response('NotFound') } : {}),
    },
  };
}

const paging = [param('Page'), param('Limit')];

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Real-Time Solar Generation Data API',
    version: '1.0.0',
    description: [
      'REST API for the Sri Lanka Sustainable Energy Authority (SLSEA).',
      '',
      'Hierarchy: Province, District, Grid Substation, Solar Installation, Generation Reading.',
      '',
      '**Two kinds of client**',
      '- **SLSEA users** read data. Log in with `POST /api/v1/auth/login`, then send `Authorization: Bearer <token>` (**userBearer**). National users see everything, province users their province, district users their district.',
      '- **Metering devices** write readings. A device token identifies exactly one installation and may only `POST` readings for it (**deviceBearer**).',
      '',
      '**Conditional GET.** Every successful read returns an `ETag`. Send it back in `If-None-Match`; if nothing changed the API answers `304 Not Modified` with an empty body.',
      '',
      '**Errors** always use the same body: `{ "error": { "code", "message", "detail" } }`.',
      '',
      '**Collections** return `{ data, pagination }`. Default `limit` is 10, maximum 100.',
    ].join('\n'),
  },
  servers: [{ url: apiBaseUrl, description: 'API base URL (from API_BASE_URL)' }],
  tags: [
    { name: 'Health', description: 'Technical health check' },
    { name: 'Auth', description: 'User login' },
    { name: 'Provinces' },
    { name: 'Districts' },
    { name: 'Substations' },
    { name: 'Installations' },
    { name: 'Readings', description: 'Generation readings: history (users) and ingestion (devices)' },
  ],

  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'The service is running',
            content: jsonContent({
              type: 'object',
              properties: { status: { type: 'string', example: 'ok' }, service: { type: 'string', example: 'solar-generation-api' } },
            }),
          },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in as an SLSEA user',
        description: 'Returns a JWT (valid for 8 hours) to send as `Authorization: Bearer <token>`.',
        security: [],
        requestBody: { required: true, content: jsonContent(ref('LoginRequest')) },
        responses: {
          200: { description: 'Logged in', content: jsonContent(ref('LoginResponse')) },
          400: response('BadRequest'),
          401: {
            description: 'Wrong email or password (the same answer for both)',
            content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.', detail: 'The supplied credentials are not valid.' } } } },
          },
          405: response('MethodNotAllowed'),
          415: response('UnsupportedMediaType'),
        },
      },
    },

    '/api/v1/provinces': {
      get: {
        tags: ['Provinces'],
        summary: 'List provinces',
        description: 'Only the provinces inside your jurisdiction: all for national users, your own province for province users, none for district users.',
        security: userAuth,
        parameters: [...paging, param('IfNoneMatch')],
        responses: {
          200: { description: 'A page of provinces', headers: etagHeader, content: jsonContent(pageOf('Province', 'A page of provinces')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
        },
      },
    },
    '/api/v1/provinces/{provinceId}': {
      get: conditionalGet({
        tags: ['Provinces'],
        summary: 'Get a province',
        parameters: [param('ProvinceId')],
        schema: ref('Province'),
      }),
    },
    '/api/v1/provinces/{provinceId}/districts': {
      get: {
        tags: ['Provinces', 'Districts'],
        summary: 'List the districts of a province',
        security: userAuth,
        parameters: [param('ProvinceId'), ...paging, param('IfNoneMatch')],
        responses: {
          200: { description: 'A page of districts', headers: etagHeader, content: jsonContent(pageOf('District', 'A page of districts')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
          404: response('NotFound'),
        },
      },
    },

    '/api/v1/districts/{districtId}': {
      get: conditionalGet({
        tags: ['Districts'],
        summary: 'Get a district',
        parameters: [param('DistrictId')],
        schema: ref('District'),
      }),
    },
    '/api/v1/districts/{districtId}/substations': {
      get: {
        tags: ['Districts', 'Substations'],
        summary: 'List the grid substations of a district',
        security: userAuth,
        parameters: [param('DistrictId'), ...paging, param('IfNoneMatch')],
        responses: {
          200: { description: 'A page of substations', headers: etagHeader, content: jsonContent(pageOf('GridSubstation', 'A page of grid substations')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
          404: response('NotFound'),
        },
      },
    },
    '/api/v1/districts/{districtId}/generation-summary': {
      get: conditionalGet({
        tags: ['Districts'],
        summary: 'Generation summary of a district',
        description:
          'Derived resource. `currentPowerKw` is the sum of every installation\'s latest `powerKw`. `todayEnergyKwh` is the energy generated since midnight in Sri Lanka time (UTC+5:30), summed over the installations. ' +
          'The ETag is weak and is computed from the figures only, so it stays the same while `generatedAt` changes.',
        parameters: [param('DistrictId')],
        schema: ref('GenerationSummary'),
      }),
    },

    '/api/v1/substations/{substationId}': {
      get: conditionalGet({
        tags: ['Substations'],
        summary: 'Get a grid substation',
        parameters: [param('SubstationId')],
        schema: ref('GridSubstation'),
      }),
    },
    '/api/v1/substations/{substationId}/installations': {
      get: {
        tags: ['Substations', 'Installations'],
        summary: 'List the solar installations of a substation',
        security: userAuth,
        parameters: [param('SubstationId'), ...paging, param('IfNoneMatch')],
        responses: {
          200: { description: 'A page of installations', headers: etagHeader, content: jsonContent(pageOf('SolarInstallation', 'A page of solar installations')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
          404: response('NotFound'),
        },
      },
    },

    '/api/v1/installations/{installationId}': {
      get: conditionalGet({
        tags: ['Installations'],
        summary: 'Get an installation (composite)',
        description: 'The installation with its substation, district, province and latest reading. The readings history is not included. The ancestors are shown as context even to users who cannot read them directly.',
        parameters: [param('InstallationId')],
        schema: ref('InstallationComposite'),
      }),
    },
    '/api/v1/installations/{installationId}/last-reading': {
      get: conditionalGet({
        tags: ['Installations', 'Readings'],
        summary: 'Get the latest reading of an installation',
        description: 'Operational view: what the installation is generating now. 404 if the installation has no readings yet.',
        parameters: [param('InstallationId')],
        schema: ref('GenerationReading'),
      }),
    },

    '/api/v1/installations/{installationId}/readings': {
      get: {
        tags: ['Readings'],
        summary: 'Reading history of an installation',
        description: 'Analytical view. Filter by time window, sort by timestamp (newest first by default) and page through the results. `total` counts every matching reading.',
        security: userAuth,
        parameters: [param('InstallationId'), ...paging, param('Sort'), param('From'), param('To'), param('IfNoneMatch')],
        responses: {
          200: { description: 'A page of readings', headers: etagHeader, content: jsonContent(pageOf('GenerationReading', 'A page of generation readings')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
          404: response('NotFound'),
        },
      },
      post: {
        tags: ['Readings'],
        summary: 'Submit a reading (metering device)',
        description:
          'Device ingestion. The device token must belong to the installation in the path. Readings are append-only: they cannot be changed or deleted (`PUT`, `PATCH` and `DELETE` return 405). ' +
          'A second reading with the same timestamp for the same installation returns 409.',
        security: deviceAuth,
        requestBody: { required: true, content: jsonContent(ref('ReadingCreate')) },
        parameters: [param('InstallationId')],
        responses: {
          201: {
            description: 'Reading created',
            headers: { Location: { $ref: '#/components/headers/Location' } },
            content: jsonContent(ref('GenerationReading')),
          },
          400: response('BadRequest'),
          401: response('Unauthorized'),
          403: {
            description: 'The device token belongs to a different installation',
            content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'FORBIDDEN', message: 'Forbidden.', detail: 'This device token does not belong to this installation.' } } } },
          },
          404: response('NotFound'),
          405: response('MethodNotAllowed'),
          406: response('NotAcceptable'),
          409: response('Conflict'),
          415: response('UnsupportedMediaType'),
        },
      },
    },
    '/api/v1/installations/{installationId}/readings/{readingId}': {
      get: conditionalGet({
        tags: ['Readings'],
        summary: 'Get one reading',
        parameters: [param('InstallationId'), param('ReadingId')],
        schema: ref('GenerationReading'),
      }),
    },

    '/api/v1/readings': {
      get: {
        tags: ['Readings'],
        summary: 'Readings across installations',
        description:
          'Filter by province, district and/or substation and by time window. Results are always limited to your jurisdiction, and naming a province, district or substation outside it returns 403. ' +
          'The filters must agree with each other (for example the district must belong to the province), otherwise 400.',
        security: userAuth,
        parameters: [
          ...paging,
          param('Sort'),
          param('From'),
          param('To'),
          param('ProvinceIdFilter'),
          param('DistrictIdFilter'),
          param('SubstationIdFilter'),
          param('IfNoneMatch'),
        ],
        responses: {
          200: { description: 'A page of readings', headers: etagHeader, content: jsonContent(pageOf('GenerationReading', 'A page of generation readings')) },
          304: response('NotModified'),
          400: response('BadRequest'),
          ...readErrors,
        },
      },
    },
  },

  components: {
    securitySchemes: {
      userBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'SLSEA user token from `POST /api/v1/auth/login` (claim `type: "user"`). Needed for every read.',
      },
      deviceBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Metering device token (claims `sub` = installation id, `type: "device"`). Only accepted by `POST /installations/{installationId}/readings`.',
      },
    },

    headers: {
      ETag: {
        description: 'Version of the representation. Send it back in `If-None-Match` to get `304 Not Modified` when nothing changed.',
        schema: { type: 'string', example: '"9a0364b9e99bb480dd25e1f0284c8555"' },
      },
      Location: {
        description: 'URI of the created reading.',
        schema: { type: 'string', example: '/api/v1/installations/000400000000000000000001/readings/6ac147b483de378a214de394' },
      },
    },

    parameters: {
      IfNoneMatch: {
        name: 'If-None-Match',
        in: 'header',
        required: false,
        description: 'ETag from an earlier response. If it still matches, the API returns `304 Not Modified` with an empty body.',
        schema: { type: 'string' },
        example: '"9a0364b9e99bb480dd25e1f0284c8555"',
      },
      ProvinceId: { name: 'provinceId', in: 'path', required: true, description: 'Province id (24 hex characters).', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      DistrictId: { name: 'districtId', in: 'path', required: true, description: 'District id (24 hex characters).', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      SubstationId: { name: 'substationId', in: 'path', required: true, description: 'Grid substation id (24 hex characters).', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      InstallationId: { name: 'installationId', in: 'path', required: true, description: 'Solar installation id (24 hex characters).', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      ReadingId: { name: 'readingId', in: 'path', required: true, description: 'Reading id (24 hex characters).', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      Page: { name: 'page', in: 'query', required: false, description: 'Page number, starting at 1.', schema: { type: 'integer', minimum: 1, default: 1 } },
      Limit: { name: 'limit', in: 'query', required: false, description: 'Items per page (a larger value is capped at 100).', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
      Sort: { name: 'sort', in: 'query', required: false, description: 'Sort by timestamp.', schema: { type: 'string', enum: ['timestamp:asc', 'timestamp:desc'], default: 'timestamp:desc' } },
      From: { name: 'from', in: 'query', required: false, description: 'Start of the time window (inclusive). ISO 8601 date, or date-time with `Z` or an offset. Write `+` as `%2B` in a URL.', schema: { type: 'string', example: '2026-10-02T00:00:00Z' } },
      To: { name: 'to', in: 'query', required: false, description: 'End of the time window (inclusive). Must not be earlier than `from`.', schema: { type: 'string', example: '2026-10-03T00:00:00Z' } },
      ProvinceIdFilter: { name: 'provinceId', in: 'query', required: false, description: 'Only readings of installations in this province.', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      DistrictIdFilter: { name: 'districtId', in: 'query', required: false, description: 'Only readings of installations in this district.', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      SubstationIdFilter: { name: 'substationId', in: 'query', required: false, description: 'Only readings of installations on this substation.', schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
    },

    schemas: {
      Error: {
        type: 'object',
        description: 'Every error response has this shape.',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'detail'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR', 'INVALID_QUERY', 'AUTHENTICATION_REQUIRED', 'INVALID_CREDENTIALS', 'FORBIDDEN',
                  'JURISDICTION_FORBIDDEN', 'RESOURCE_NOT_FOUND', 'CONFLICT', 'PRECONDITION_FAILED', 'NOT_ACCEPTABLE',
                  'METHOD_NOT_ALLOWED', 'INTERNAL_ERROR',
                ],
                example: 'RESOURCE_NOT_FOUND',
              },
              message: { type: 'string', example: 'Installation not found.' },
              detail: { type: 'string', example: 'No installation exists for the supplied identifier.' },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        required: ['page', 'limit', 'total', 'next', 'previous'],
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', description: 'Number of items matching the filters (not the size of this page).', example: 672 },
          next: { type: 'string', nullable: true, description: 'Link to the next page (keeps the filters and sort), or null.', example: '/api/v1/installations/000400000000000000000001/readings?page=2&limit=10' },
          previous: { type: 'string', nullable: true, description: 'Link to the previous page, or null.', example: null },
        },
      },

      Province: {
        type: 'object',
        properties: { _id: { type: 'string', example: '000100000000000000000001' }, name: { type: 'string', example: 'Western' } },
      },
      District: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '000200000000000000000001' },
          name: { type: 'string', example: 'Colombo' },
          provinceId: { type: 'string', example: '000100000000000000000001' },
        },
      },
      GridSubstation: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '000300000000000000000001' },
          name: { type: 'string', example: 'Colombo Grid Substation 1' },
          code: { type: 'string', example: 'GSS-COL-01' },
          districtId: { type: 'string', example: '000200000000000000000001' },
        },
      },
      SolarInstallation: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '000400000000000000000001' },
          name: { type: 'string', example: 'Colombo Rooftop Solar 001' },
          meterId: { type: 'string', example: 'MTR-000001' },
          latitude: { type: 'number', example: 6.991411 },
          longitude: { type: 'number', example: 79.891844 },
          substationId: { type: 'string', example: '000300000000000000000001' },
        },
      },
      GenerationReading: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6ac147b483de378a214de394' },
          installationId: { type: 'string', example: '000400000000000000000001' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-10-03T10:30:00.000Z' },
          powerKw: { type: 'number', description: 'Instantaneous power in kW.', example: 5.42 },
          energyKwh: { type: 'number', description: 'Cumulative energy in kWh.', example: 182.71 },
          voltage: { type: 'number', description: 'Voltage in V.', example: 231.4 },
        },
      },
      InstallationComposite: {
        allOf: [
          ref('SolarInstallation'),
          {
            type: 'object',
            properties: {
              substation: ref('GridSubstation'),
              district: ref('District'),
              province: ref('Province'),
              lastReading: { nullable: true, allOf: [ref('GenerationReading')], description: 'The most recent reading, or null.' },
            },
          },
        ],
      },
      GenerationSummary: {
        type: 'object',
        properties: {
          districtId: { type: 'string', example: '000200000000000000000001' },
          currentPowerKw: { type: 'number', description: 'Sum of each installation\'s latest powerKw.', example: 14.404 },
          todayEnergyKwh: { type: 'number', description: 'Energy generated since midnight in Sri Lanka time, summed over the installations.', example: 839.984 },
          installationCount: { type: 'integer', example: 24 },
          generatedAt: { type: 'string', format: 'date-time', example: '2026-10-03T12:00:00.000Z' },
        },
      },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'solar#out1st1@gmail.com' },
          password: { type: 'string', format: 'password', example: 'solar#1st' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT for the userBearer scheme (valid for 8 hours).' },
          role: { type: 'string', enum: ['national', 'province', 'district'], example: 'district' },
          jurisdictionType: { type: 'string', enum: ['all', 'province', 'district'], example: 'district' },
          jurisdictionId: { type: 'string', nullable: true, description: 'Province or district id; null for national users.', example: '000200000000000000000001' },
        },
      },
      ReadingCreate: {
        type: 'object',
        description: 'The installation comes from the URL. Any other field is rejected.',
        required: ['timestamp', 'powerKw', 'energyKwh', 'voltage'],
        additionalProperties: false,
        properties: {
          timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 with Z or an offset. Must not be in the future.', example: '2026-10-03T10:30:00Z' },
          powerKw: { type: 'number', minimum: 0, example: 5.42 },
          energyKwh: { type: 'number', minimum: 0, example: 182.71 },
          voltage: { type: 'number', exclusiveMinimum: true, minimum: 0, example: 231.4 },
        },
      },
    },

    responses: {
      NotModified: {
        description: 'Not Modified. The `If-None-Match` ETag is still current; the body is empty.',
        headers: etagHeader,
      },
      BadRequest: {
        description: 'Malformed id, invalid query parameter or invalid body (`VALIDATION_ERROR` or `INVALID_QUERY`).',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'INVALID_QUERY', message: 'Unsupported query parameter.', detail: 'Unknown parameter(s): foo. Supported: page, limit.' } } } },
      },
      Unauthorized: {
        description: 'Missing, malformed, expired or wrong-type token (`AUTHENTICATION_REQUIRED`). A user token is not accepted where a device token is needed, and the other way round.',
        headers: { 'WWW-Authenticate': { schema: { type: 'string', example: 'Bearer realm="solar-generation-api"' } } },
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.', detail: 'Send an "Authorization: Bearer <token>" header.' } } } },
      },
      Forbidden: {
        description: 'The resource is outside your jurisdiction (`JURISDICTION_FORBIDDEN`).',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'JURISDICTION_FORBIDDEN', message: 'Outside your jurisdiction.', detail: 'Your account is not allowed to access this district.' } } } },
      },
      NotFound: {
        description: 'The resource does not exist (`RESOURCE_NOT_FOUND`).',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Installation not found.', detail: 'No installation exists for the supplied identifier.' } } } },
      },
      MethodNotAllowed: {
        description: 'The method is not supported on this path (`METHOD_NOT_ALLOWED`). The `Allow` header lists the supported methods. Readings cannot be updated or deleted.',
        headers: { Allow: { schema: { type: 'string', example: 'GET, HEAD, POST' } } },
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', detail: 'Allowed methods: GET, HEAD, POST.' } } } },
      },
      NotAcceptable: {
        description: 'The `Accept` header excludes `application/json` (`NOT_ACCEPTABLE`).',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'NOT_ACCEPTABLE', message: 'Not acceptable.', detail: 'This API only produces application/json (Accept: text/html).' } } } },
      },
      Conflict: {
        description: 'This installation already has a reading with this timestamp (`CONFLICT`).',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'CONFLICT', message: 'Reading already exists.', detail: 'This installation already has a reading with this timestamp.' } } } },
      },
      UnsupportedMediaType: {
        description: 'The body is not sent as `application/json`.',
        content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'VALIDATION_ERROR', message: 'Unsupported media type.', detail: 'Send the body as Content-Type: application/json.' } } } },
      },
    },
  },
};

// swagger-jsdoc validates and assembles the OpenAPI document (no JSDoc comments are used).
export const openapiSpec = swaggerJSDoc({ definition, apis: [] });

# Solar Generation API: Implementation Prompts

Build order for the SLSEA solar API. Each phase has one prompt to give the
coding agent. Run the phase, check the result against the "Verify" list,
commit, then move to the next. The full spec is in `project.md`; the data
model is in `data model.txt` (final, do not change).

Stack: Node.js, Express, MongoDB, Mongoose. Base path `/api/v1`.

Architecture in one view:

-   **Write path (metering devices):** `POST /installations/:installationId/readings`, authenticated by a device token for that one installation.
-   **Read path (SLSEA users):** all `GET` routes, authenticated by user login (JWT) and limited to the user's jurisdiction.
-   `GenerationReading` is append-only: no PUT or DELETE on readings.

------------------------------------------------------------------------

## Phase 1: Setup and Models

```text
Set up a Node.js + Express + Mongoose project. Read project.md and data model.txt first.

1. package.json with scripts: start (node src/server.js), dev (nodemon), seed (node src/database/seed/seed.js).
2. Install: express, mongoose, dotenv, cors, helmet, jsonwebtoken, bcryptjs.
3. src/config/env.js and database.js (MONGODB_URI from .env). src/app.js exports the app; src/server.js connects and listens on process.env.PORT || 3000.
4. GET /health returns { "status": "ok", "service": "solar-generation-api" }.
5. Six Mongoose models in src/models/ with exactly the fields in data model.txt: Province, District, GridSubstation, SolarInstallation, GenerationReading, User. Use ObjectId refs for parent IDs. No timestamps option. The User schema must enforce: national -> all -> null, province -> province -> Province id, district -> district -> District id.
6. Indexes: see project.md section 7 (readings: unique { installationId: 1, timestamp: -1 }).
7. .env.example and .gitignore (node_modules, .env, device-tokens.json).

Do not add a Device model. Do not add any other routes.
```

Verify: `/health` returns 200; app connects to MongoDB; indexes exist.
Commit: `chore: initialize Express API project`, `feat: add core domain models`

------------------------------------------------------------------------

## Phase 2: Seed Data

```text
Write the seed script in src/database/seed/ (seed.js plus one file per entity). Insert in this order: clear collections, provinces, districts, substations, installations, users, readings.

Scale:
- 9 provinces, 25 districts (real Sri Lankan names)
- at least 25 substations (at least one per district)
- at least 200 installations spread across substations, with a unique meterId, and latitude/longitude near the district
- readings every 15 minutes for the last 7 days per installation (672 each), ending at the current 15-minute boundary

Readings: powerKw follows a daytime curve (about 0 at night, rising in the morning, peak at midday, falling in the evening, using Sri Lanka time UTC+5:30) with small noise and a per-installation capacity. energyKwh is the running sum of powerKw * 0.25 and must always increase. voltage is about 230 with small noise. Use a seeded PRNG so every run gives identical data. Insert readings with insertMany in batches of 5000.

Users (bcrypt hashed): 1 national, 1 province (Western), 2 district users in different districts. Print their emails and passwords.

Write one device JWT per installation, signed with DEVICE_TOKEN_SECRET with claims { sub: <installationId>, type: "device" }, to device-tokens.json.

Every foreign key must reference an existing parent. No orphans.
```

Verify: counts are 9 / 25 / 25+ / 200+ / at least 134,400; no orphan references; re-running gives the same data.
Commit: `feat: add seed dataset`

------------------------------------------------------------------------

## Phase 3: Error Contract and Hierarchy Endpoints

```text
Add the error handling and the hierarchy read routes. No authentication yet.

1. A centralized error handler. Every error response uses this body:
   { "error": { "code": "...", "message": "...", "detail": "..." } }
   Codes: VALIDATION_ERROR, INVALID_QUERY, AUTHENTICATION_REQUIRED, INVALID_CREDENTIALS, FORBIDDEN, JURISDICTION_FORBIDDEN, RESOURCE_NOT_FOUND, CONFLICT, PRECONDITION_FAILED, NOT_ACCEPTABLE, INTERNAL_ERROR.
   Also handle unknown routes (404), malformed JSON (400), invalid ObjectId (400), and wrong HTTP method on a known path (405 with an Allow header).
2. Routes (routes -> controllers -> services):
   GET /api/v1/provinces
   GET /api/v1/provinces/:provinceId
   GET /api/v1/provinces/:provinceId/districts
   GET /api/v1/districts/:districtId
   GET /api/v1/districts/:districtId/substations
   GET /api/v1/substations/:substationId
   GET /api/v1/substations/:substationId/installations
   GET /api/v1/installations/:installationId
3. Collection routes return { "data": [...], "pagination": { page, limit, total, next, previous } }. Default limit 10, maximum 100. next and previous are URLs or null.
4. Member routes return a bare object. Malformed id -> 400, valid but missing id -> 404 (never 200 with null).
5. Return 404 for a missing parent when listing children.

Do not add a bare /readings route yet. Do not add PUT, PATCH or DELETE.
```

Verify: each route returns seed data; bad id gives 400; missing id gives 404; every error has the standard body.
Commit: `feat: add error contract`, then one commit per resource group.

------------------------------------------------------------------------

## Phase 4: Composite and Last Reading

```text
1. Update GET /api/v1/installations/:installationId into a composite resource. Return the installation fields plus: substation, district, province (each as an object) and lastReading (the most recent GenerationReading or null). Do not embed the readings history.
2. Add GET /api/v1/installations/:installationId/last-reading. Query readings by installationId, sort timestamp descending, limit 1. Return a bare reading object. 404 if the installation has no readings. Path must be lowercase with hyphens.
3. Add one shared helper getLastReading(installationId) used by both routes.
```

Verify: composite includes lastReading and has no history; last-reading returns the newest timestamp.
Commit: `feat: add installation composite and last reading resource`

------------------------------------------------------------------------

## Phase 5: History Query Surface

```text
Add the readings history routes with pagination, filtering and sorting.

1. GET /api/v1/installations/:installationId/readings
   Query params: page, limit (default 10, max 100), sort (timestamp:asc or timestamp:desc, default timestamp:desc), from, to (ISO 8601, from <= to).
2. GET /api/v1/readings
   Same params plus provinceId, districtId, substationId. Resolve the filter by finding the installation ids in that scope (province -> districts -> substations -> installations), then query readings with installationId $in. Reject conflicting filters with 400.
3. Response: { "data": [...], "pagination": { page, limit, total, next, previous } }. total is the count of ALL records matching the filters, not the page size. next and previous URLs keep the active filters and sort.
4. Pipeline order: filter, then sort, then paginate. Use .lean().
5. Validate every query param. Unknown params -> 400 INVALID_QUERY. Invalid dates or ids -> 400.
6. Do not add POST yet.
```

Verify: total is 672 for one installation over 7 days; next and previous work; asc and desc order are correct; from/to narrow the result.
Commit: `feat: add reading pagination`, `feat: add reading filters`, `feat: add reading sorting`

------------------------------------------------------------------------

## Phase 6: Conditional GET

```text
Add conditional GET to every GET route that returns a resource or collection.

1. Write a helper sendJson(req, res, body): compute an ETag (sha1 of the JSON body, in quotes) and set the ETag header.
2. If the request has If-None-Match matching the ETag: return 304 Not Modified with an EMPTY body.
3. Otherwise return 200 with the ETag header and the body.
5. Apply it to atomic resources, the installation composite, last-reading, and both readings collections.
6. Reject requests whose Accept header excludes application/json with 406 NOT_ACCEPTABLE.
```

Verify: second request with `If-None-Match` returns 304 and an empty body; a changed resource returns a new ETag.
Commit: `feat: add conditional GET`

------------------------------------------------------------------------

## Phase 7: Authentication (User Login and Device Write Path)

```text
Add both authentication schemes.

1. POST /api/v1/auth/login: body { email, password }. Compare with bcrypt. Wrong email or password -> 401 INVALID_CREDENTIALS (same message for both). Success -> { token, role, jurisdictionType, jurisdictionId }. JWT signed with JWT_SECRET, claims { sub: userId, type: "user" }, expiry 8 hours.
2. Middleware authenticateUser: apply to every GET route except /health and /api-docs. Missing, malformed or invalid token -> 401 AUTHENTICATION_REQUIRED. A device token must be rejected here.
3. Middleware authenticateDevice: verify with DEVICE_TOKEN_SECRET, require type "device", attach req.device = { installationId }. A user token must be rejected here.
4. POST /api/v1/installations/:installationId/readings (device only):
   - 401 if no or invalid device token
   - 403 FORBIDDEN if req.device.installationId does not equal :installationId
   - 404 if the installation does not exist
   - 415 if Content-Type is not application/json
   - 400 VALIDATION_ERROR if the body is invalid: timestamp required (ISO 8601, not in the future), powerKw number >= 0, energyKwh number >= 0, voltage number > 0, unknown fields rejected. installationId comes only from the URL.
   - 409 CONFLICT if a reading with the same installationId and timestamp exists
   - 201 Created, Location header /api/v1/installations/:installationId/readings/:readingId, and the created reading as the body
5. Add GET /api/v1/installations/:installationId/readings/:readingId (bare object, 404 if missing).
6. PUT, PATCH, DELETE on readings are not allowed: return 405 with an Allow header.
```

Verify: login works; no token gives 401; own installation POST gives 201 and Location; another installation gives 403; duplicate gives 409; a user token on POST fails; a device token on GET fails.
Commit: `feat: add user authentication`, `feat: add device authentication`, `feat: add reading ingestion`

------------------------------------------------------------------------

## Phase 8: Jurisdiction Authorization

```text
Add jurisdiction scoping to every read route, using req.user from the JWT. Do not trust ids from the request for scope.

Rules:
- national: all data
- province: only the user's province (its districts, substations, installations, readings)
- district: only the user's district (its substations, installations, readings)

Implement authorizationService with:
- getInstallationScope(user): Mongo filter for the installations the user may see (via substations, districts).
- assertCanAccess(user, resource): walk up from the resource (installation -> substation -> district -> province) and compare with user.jurisdictionId. Out of scope -> 403 JURISDICTION_FORBIDDEN. Non-existent -> 404.

Apply:
- Collections only return in-scope items.
- Single resources out of scope return 403.
- /readings with a provinceId/districtId/substationId outside the user's scope returns 403, and results are always limited to the user's scope.
- Run the check before computing the ETag, so out-of-scope users never get a 304.
```

Verify with the four seeded users: national reads everything; province user reads only their province; district user reads their district and gets 403 for another district.
Commit: `feat: enforce jurisdiction authorization`

------------------------------------------------------------------------

## Phase 9: Stretch, District Generation Summary

```text
Add GET /api/v1/districts/:districtId/generation-summary (authenticated and jurisdiction scoped, with ETag like other GETs).
Response: { districtId, currentPowerKw, todayEnergyKwh, installationCount, generatedAt }.
- currentPowerKw: sum of each installation's latest powerKw in the district.
- todayEnergyKwh: for each installation, last energyKwh today minus first energyKwh today (Sri Lanka midnight), summed.
- Use one aggregation pipeline, not a query per installation.
```

Verify: values are plausible and match the individual last-reading values.
Commit: `feat: add district generation summary`

------------------------------------------------------------------------

## Phase 10: OpenAPI and Deployment

```text
1. Add swagger-jsdoc and swagger-ui-express. Serve Swagger UI at /api-docs. Document every endpoint: security schemes (userBearer, deviceBearer), path and query params, request and response bodies, status codes, the Error and Pagination schemas, and the ETag, If-None-Match and Location headers. Use API_BASE_URL as the server URL.
2. Add a README with env vars, how to seed, and how to run.
```

Deployment (by hand): MongoDB Atlas free cluster, Render web service
(start `node src/server.js`), env vars in the platform dashboard, run the
seed against Atlas, confirm HTTPS and `/api-docs`.

Verify on the live URL: login, device POST (201 and 403), pagination, filters, sort, 304, and Swagger loads.
Commit: `docs: add OpenAPI`, `chore: prepare production deployment`

------------------------------------------------------------------------

## Appendix: Route Map

| Method | URI (under /api/v1) | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | /auth/login | none | 200 token | 400, 401 |
| GET | /provinces | user | 200 envelope | 401, 403 |
| GET | /provinces/:id | user | 200 bare / 304 | 400, 401, 403, 404 |
| GET | /provinces/:id/districts | user | 200 envelope | 401, 403, 404 |
| GET | /districts/:id | user | 200 bare / 304 | 400, 401, 403, 404 |
| GET | /districts/:id/substations | user | 200 envelope | 401, 403, 404 |
| GET | /districts/:id/generation-summary | user | 200 bare / 304 | 401, 403, 404 |
| GET | /substations/:id | user | 200 bare / 304 | 400, 401, 403, 404 |
| GET | /substations/:id/installations | user | 200 envelope | 401, 403, 404 |
| GET | /installations/:id | user | 200 composite / 304 | 400, 401, 403, 404 |
| GET | /installations/:id/last-reading | user | 200 bare / 304 | 401, 403, 404 |
| GET | /installations/:id/readings | user | 200 envelope (window, sort, page) | 400, 401, 403, 404 |
| GET | /installations/:id/readings/:readingId | user | 200 bare | 401, 403, 404 |
| GET | /readings | user | 200 envelope (province, district, substation, window, sort, page) | 400, 401, 403 |
| POST | /installations/:id/readings | device | 201 + Location | 400, 401, 403, 404, 409, 415 |
| PUT/PATCH/DELETE | readings | any | none | 405 + Allow |

Plus `GET /health` and `GET /api-docs` (no auth).

## Common Generator Traps

1. **Global `/readings` is only for filtered reads.** There is no POST on it. Readings are written only under an installation.
2. **POST must return 201 with a Location header,** not 200.
3. **401 vs 403.** No or invalid credentials: 401. Valid credentials but wrong scope, or the device token belongs to another installation: 403.
4. **Member lookups must 404,** not return 200 with null. A bad ObjectId is 400, not 500.
5. **`total` is the filtered count,** never `data.length`.
6. **Pipeline order:** filter, then sort, then paginate.
7. **Do not trust `installationId` in the body.** It comes from the URL and is checked against the device token.
8. **Authorize before ETag,** so an out-of-scope user cannot get a 304.
9. **Two secrets:** user tokens (`JWT_SECRET`) and device tokens (`DEVICE_TOKEN_SECRET`) must not be accepted on each other's routes.
10. **No Device model, no `lastPower` fields on the installation,** no frontend, no extra packages.

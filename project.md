# NB6007CEM Web API Coursework: Implementation Blueprint

**Project:** Real-Time Solar Generation Data API (SLSEA)
**Stack:** Node.js, Express, MongoDB (Atlas in production), Mongoose
**Target:** api

The coursework brief is the final authority. If this file conflicts with
the brief or the module REST Design Guidelines, the brief wins.
The data model in `data model.txt` is final and must not be changed
without documenting the reason.

------------------------------------------------------------------------

## 1. Domain Model (final)

``` text
Province 1-* District 1-* GridSubstation 1-* SolarInstallation 1-* GenerationReading
User (separate)
```

| Entity            | Fields                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Province          | _id, name                                                                     |
| District          | _id, name, provinceId                                                         |
| GridSubstation    | _id, name, code, districtId                                                   |
| SolarInstallation | _id, name, meterId, latitude, longitude, substationId                         |
| GenerationReading | _id, installationId, timestamp, powerKw, energyKwh, voltage                   |
| User              | _id, name, email, passwordHash, role, jurisdictionType, jurisdictionId        |

Rules:

-   No separate `Device` entity. `meterId` belongs to
    `SolarInstallation`.
-   `GenerationReading` is an append-only time series: one document per
    measurement, no `lastPower`-style fields on the installation.

User jurisdiction (one jurisdiction per user):

| role     | jurisdictionType | jurisdictionId |
| -------- | ---------------- | -------------- |
| national | all              | null           |
| province | province         | Province _id   |
| district | district         | District _id   |

Enforce these combinations in the User schema validation.

------------------------------------------------------------------------

## 2. Security Model

Two separate client types:

-   **Metering device (write client):** authenticates as one
    installation, may only POST readings for that installation.
-   **SLSEA user (read client):** logs in, reads data within their
    jurisdiction, never writes readings.

**User auth:** `POST /api/v1/auth/login` returns a JWT (`JWT_SECRET`,
claim `type: "user"`).

**Device auth:** JWT signed with `DEVICE_TOKEN_SECRET`, claims
`{ sub: <installationId>, type: "device" }`. No model change needed. The
seed script generates one token per installation (written to a
git-ignored file) for the demo. A user token must be rejected on the
write endpoint, and a device token on every read endpoint. Limitation
for the report: individual tokens cannot be revoked.

**Authorization (read path):**

-   Collections are filtered to the user's scope.
-   A single resource outside scope returns 403; a non-existent ID
    returns 404.
-   Scope is resolved by walking up the hierarchy
    (installation, substation, district, province) and comparing with
    `jurisdictionId`.
-   Ancestors appear only as embedded context (for example in the
    installation composite), not as directly readable resources.
-   Authorization is enforced in the API/query layer, never trusting
    user-supplied IDs.

------------------------------------------------------------------------

## 3. Endpoints (`/api/v1`)

| Method | URI                                         | Purpose                                   |
| ------ | ------------------------------------------- | ----------------------------------------- |
| POST   | /auth/login                                 | User login                                |
| GET    | /provinces                                  | Province collection                       |
| GET    | /provinces/{provinceId}                     | Province                                  |
| GET    | /provinces/{provinceId}/districts           | Districts of a province                   |
| GET    | /districts/{districtId}                     | District                                  |
| GET    | /districts/{districtId}/substations         | Substations of a district                 |
| GET    | /substations/{substationId}                 | Substation                                |
| GET    | /substations/{substationId}/installations   | Installations of a substation             |
| GET    | /installations/{installationId}             | Composite: installation + substation, district, province, latest reading (no history) |
| GET    | /installations/{installationId}/last-reading | Operational view: newest reading (derived resource) |
| GET    | /installations/{installationId}/readings    | Analytical view: history of one installation |
| GET    | /readings                                   | Cross-installation history with province/district/substation filters |
| POST   | /installations/{installationId}/readings    | Device ingestion                          |
| GET    | /districts/{districtId}/generation-summary  | Stretch: current power, today's energy, installation count |

Plus a technical `GET /health` returning
`{ "status": "ok", "service": "solar-generation-api" }`.

Notes:

-   `GET /readings` exists because province/district/substation filtering
    is meaningless on a single installation's readings. Always restricted
    to the caller's jurisdiction; a filter outside scope returns 403.
    Filters are resolved by finding installation IDs in that scope, then
    querying readings with `installationId: { $in: [...] }`. (Alternative:
    nested `/districts/{id}/readings` and `/substations/{id}/readings`.)
-   `last-reading`: query by `installationId`, sort `timestamp` desc,
    limit 1. Return 404 if the installation has no readings.
-   Composite and last-reading must not embed the full history.

------------------------------------------------------------------------

## 4. HTTP Semantics

-   Readings are append-only. PUT, PATCH, DELETE are not offered and
    return `405` with an `Allow` header. Hierarchy resources and
    installations are read-only (populated by seed). State this in the
    report as a deliberate decision.
-   Successful reading POST: `201 Created` with
    `Location: /api/v1/installations/{installationId}/readings/{readingId}`.
-   Idempotency: unique index on `{ installationId, timestamp }`. A
    repeated reading returns `409 Conflict`.
-   Ingestion flow: authenticate device, check token installation equals
    URL installation (else 403), validate body, create reading, return 201.

**Status codes:** 200, 201, 304, 400, 401, 403, 404, 405, 406, 409, 412,
415.

Note on 412: with no updatable resources, `If-Match` protects nothing.
Decide how 412 is reachable (for example `If-Match` on GET with a
non-matching ETag) or explain in the report why it is not applicable.

**Error contract** (one format everywhere, centralized handler):

``` json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Installation not found.",
    "detail": "No installation exists for the supplied identifier."
  }
}
```

Codes: VALIDATION_ERROR, AUTHENTICATION_REQUIRED, INVALID_CREDENTIALS,
FORBIDDEN, JURISDICTION_FORBIDDEN, RESOURCE_NOT_FOUND, CONFLICT,
INVALID_QUERY, PRECONDITION_FAILED, NOT_ACCEPTABLE, INTERNAL_ERROR.

------------------------------------------------------------------------

## 5. Collection Behaviour

**Pagination:** `?page=1&limit=20`. Default limit 10, maximum 100.

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 672,
    "next": "/api/v1/installations/101/readings?page=2&limit=20",
    "previous": null
  }
}
```

**Filtering:**

-   `from`, `to`: ISO 8601, `from <= to`
-   `provinceId`, `districtId`, `substationId` (on `GET /readings` only)
-   Valid ObjectIds required; unknown parameters return `400 INVALID_QUERY`.

**Sorting:** `sort=timestamp:asc` or `sort=timestamp:desc`. Default is
descending.

**Conditional GET:** apply to all retrievable resources (atomic
resources, composite, last-reading, readings collections).

-   The model has no `updatedAt`, so `ETag` is a hash of the serialised
    response body. `Last-Modified` is optional.
-   `If-None-Match` matching the current ETag returns `304` with an empty
    body.

------------------------------------------------------------------------

## 6. Validation

Reading body (`installationId` comes from the URL, never from the body):

-   `timestamp`: required, ISO 8601, not in the future
-   `powerKw`: number >= 0
-   `energyKwh`: number >= 0 (cumulative, should not decrease)
-   `voltage`: number > 0
-   unknown fields rejected

Path IDs must be valid ObjectIds (400), valid but missing returns 404.
Hierarchy data is seed-only, so schema-level validation is enough for it.

------------------------------------------------------------------------

## 7. MongoDB

Collections: `provinces`, `districts`, `gridSubstations`,
`solarInstallations`, `generationReadings`, `users`.

Indexes:

| Collection         | Index                                                |
| ------------------ | ---------------------------------------------------- |
| provinces          | name unique                                          |
| districts          | provinceId; { provinceId, name } unique              |
| gridSubstations    | code unique; districtId                              |
| solarInstallations | meterId unique; substationId                         |
| generationReadings | { installationId: 1, timestamp: -1 } unique; { timestamp: -1, installationId: 1 } (GET /readings) |
| users              | email unique                                         |

`User.jurisdictionId` references a Province or a District depending on
`jurisdictionType` (null for national).

------------------------------------------------------------------------

## 8. Seed Data

Required scale:

-   9 provinces, 25 districts (real Sri Lankan geography)
-   20+ substations
-   200+ installations
-   1+ week of readings per installation. At 15-minute intervals that is
    672 per installation and about 134,400 in total.

Requirements:

-   Realistic diurnal pattern: about 0 at night, rising in the morning,
    peak at midday, falling in the evening. Cumulative energy increases.
-   Deterministic generation, so results are reproducible.
-   Readings end near the deployment date so `last-reading` and the
    "today" summary are meaningful. The seed is re-runnable.
-   Insert readings with `insertMany` in batches.
-   Seed users (bcrypt hashed): 1 national, 1 province (for example
    Western), 2 district users in different districts (to demonstrate 403).
-   Order: clear DB, provinces, districts, substations, installations,
    users, readings. Never create a child before its parent.

------------------------------------------------------------------------

## 9. Project Structure

``` text
src/
  app.js, server.js
  config/        env.js, database.js
  models/        Province, District, GridSubstation, SolarInstallation, GenerationReading, User
  controllers/
  services/
  routes/
  middleware/    authenticateUser, authenticateDevice, authorizeJurisdiction,
                 validateRequest, errorHandler, notFound
  validators/
  utils/         pagination, etag, errors
  docs/          openapi.js
  database/seed/
tests/
.env.example, .gitignore, package.json, README.md
```

Keep it smaller if that is clearer.

**Environment variables:** `PORT`, `NODE_ENV`, `MONGODB_URI`,
`JWT_SECRET`, `DEVICE_TOKEN_SECRET`, `API_BASE_URL`. Never commit `.env`;
commit `.env.example`. Production secrets live in the hosting platform.

**Packages:** express, mongoose, dotenv, cors, helmet, jsonwebtoken,
bcryptjs, express-validator, swagger-jsdoc, swagger-ui-express. Dev:
nodemon, jest, supertest. Add others only for a real requirement.

------------------------------------------------------------------------

## 10. OpenAPI / Swagger

Served live at `/api-docs` from the deployment, and must describe the
actual deployed API. Cover: user and device authentication, all
resources, path and query parameters, request/response bodies, status
codes, error schema, pagination, filtering, sorting, ETag/conditional
requests.

------------------------------------------------------------------------

## 11. Development Order and Git

Commit incrementally with conventional messages (`feat:`, `chore:`,
`docs:`, `test:`). No single giant commit.

1.  Setup: Express, Mongoose, env, database, `/health`
2.  Six models
3.  Deterministic seed
4.  Hierarchy read endpoints
5.  Installation composite and last-reading
6.  Historical readings: pagination, filtering, sorting, `GET /readings`
7.  User authentication
8.  Device authentication and ingestion
9.  Jurisdiction authorization
10. Conditional GET
11. Consistent error handling
12. OpenAPI
13. Tests
14. Stretch: district generation summary
15. Deploy (public, HTTPS, Atlas, seeded)
16. Test the public deployment, collect report/viva evidence

------------------------------------------------------------------------

## 12. Testing Plan

-   **Auth:** valid login, wrong password, missing token, invalid token
-   **Device:** writes own installation (allowed); writes another
    installation (denied); writes any other resource (denied); user token
    on write endpoint (denied); device token on read endpoint (denied)
-   **Jurisdiction:** national sees all; province user sees own province,
    denied others; district user sees own district, denied others
-   **Resources:** every endpoint in section 3
-   **Advanced:** pagination (total, next, previous), province / district
    / substation / time filters, asc and desc sort, ETag, If-None-Match,
    304
-   **Errors:** 400, 401, 403, 404, 405, 406, 409, 412, and a consistent
    error structure

------------------------------------------------------------------------

## 13. Submission Requirements (from the brief)

Deliverables:

-   Deployed public HTTPS API populated with seed data
-   Live OpenAPI/Swagger served from the deployment
-   Git repo shared with the module leader as collaborator, incremental
    history
-   Report of 2250-2750 words with sections: architecture and data model;
    API design justification; security justification; deployment;
    Richardson maturity evaluation; critical evaluation
-   Signed coursework declaration
-   AI-disclosure appendix (keep a running prompt log from the start)
-   Viva: be able to explain every artefact and all generated code, or
    those marks are forfeited

Eligibility gate: report with required sections and word count, signed
declaration, repo shared, API operational against seed data at
submission time, viva attended.

The report prose must be written by the student (Turnitin similarity and
AI score both below 15%). Do not use AI to draft it.

Marks: architecture/data model 15, API design 20, coverage 15,
implementation 10, functionality against seed data 5, deployment 10,
security 15, report 10.

------------------------------------------------------------------------

## 14. Final Checklist

``` text
[ ] Province / District / Substation / Installation resources
[ ] Installation composite
[ ] Last-known reading
[ ] Readings sub-collection + GET /readings
[ ] Device ingestion: POST, 201, Location, 409 on duplicate, 405 on other methods
[ ] Pagination: total, next, previous
[ ] Filtering: province, district, substation, time window
[ ] Sorting: timestamp asc / desc
[ ] Conditional GET: ETag, 304 with empty body
[ ] Consistent error schema
[ ] User authentication + national/province/district authorization
[ ] Device authentication + installation scope
[ ] OpenAPI/Swagger live
[ ] Seed data at required scale
[ ] Public HTTPS deployment, production MongoDB, no secrets in Git
[ ] Incremental Git history
[ ] Stretch: district generation summary
```

------------------------------------------------------------------------

## 15. Rules for the AI Coding Agent

1.  Do not add a `Device` entity or change the data model without
    documenting the reason.
2.  Keep `GenerationReading` append-only.
3.  Do not build a frontend.
4.  Never weaken authorization or trust user-supplied jurisdiction IDs.
5.  A device must never write for another installation.
6.  Never commit secrets.
7.  Keep OpenAPI in sync with the implementation.
8.  Avoid unnecessary packages and architecture.
9.  Explain generated code so it can be defended at the viva.

## 16. Next Step

Confirm before generating code: the endpoint list (section 3), request
and response JSON, how 412 is reachable, and the OpenAPI structure.
Then implement phase by phase.

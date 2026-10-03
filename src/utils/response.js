import { createHash } from 'node:crypto';

// Strong validator: sha1 of the JSON body, in quotes.
export function computeETag(body) {
  return `"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;
}

// True if If-None-Match lists the current ETag (or "*"). Weak (W/) tags compare equal.
function matchesIfNoneMatch(header, etag) {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag);
}

// Conditional GET. Always sends an ETag.
// If the client already holds this version: 304 Not Modified with an empty body.
// Otherwise: 200 with the JSON body.
export function sendJson(req, res, body) {
  const etag = computeETag(body);
  res.set('ETag', etag);

  if (matchesIfNoneMatch(req.get('If-None-Match'), etag)) {
    return res.status(304).end();
  }
  return res.status(200).json(body);
}

import { createHash } from 'node:crypto';

// Validator: sha1 of the JSON body, in quotes (prefixed W/ for a weak validator).
export function computeETag(body, { weak = false } = {}) {
  const hash = createHash('sha1').update(JSON.stringify(body)).digest('hex');
  return `${weak ? 'W/' : ''}"${hash}"`;
}

// True if If-None-Match lists the current ETag (or "*"). Weak (W/) tags compare equal.
function matchesIfNoneMatch(header, etag) {
  if (!header) return false;
  if (header.trim() === '*') return true;
  const current = etag.replace(/^W\//, '');
  return header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === current);
}

// Conditional GET. Always sends an ETag.
// If the client already holds this version: 304 Not Modified with an empty body.
// Otherwise: 200 with the JSON body.
// Options (for derived resources whose body contains a volatile field such as a generation time):
//   etagBody: hash this instead of the whole body, so the ETag changes only when the data does.
//   weak: send a weak ETag (W/"...") because two bodies with the same tag are equivalent, not identical.
export function sendJson(req, res, body, { etagBody = body, weak = false } = {}) {
  const etag = computeETag(etagBody, { weak });
  res.set('ETag', etag);

  if (matchesIfNoneMatch(req.get('If-None-Match'), etag)) {
    return res.status(304).end();
  }
  return res.status(200).json(body);
}

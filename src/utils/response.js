import { createHash } from 'node:crypto';

export function computeETag(body, { weak = false } = {}) {
  const hash = createHash('sha1').update(JSON.stringify(body)).digest('hex');
  return `${weak ? 'W/' : ''}"${hash}"`;
}

function matchesIfNoneMatch(header, etag) {
  if (!header) return false;
  if (header.trim() === '*') return true;
  const current = etag.replace(/^W\//, '');
  return header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === current);
}

export function sendJson(req, res, body, { etagBody = body, weak = false } = {}) {
  const etag = computeETag(etagBody, { weak });
  res.set('ETag', etag);

  if (matchesIfNoneMatch(req.get('If-None-Match'), etag)) {
    return res.status(304).end();
  }
  return res.status(200).json(body);
}

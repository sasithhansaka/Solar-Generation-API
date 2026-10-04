import { badRequest } from '../utils/errors.js';

export function validateLoginBody(body) {
  
  const problems = [];
  const isObject = body && typeof body === 'object' && !Array.isArray(body);
  const { email, password } = isObject ? body : {};

  if (typeof email !== 'string' || email.trim() === '') problems.push('"email" is required and must be a string');
  if (typeof password !== 'string' || password === '') problems.push('"password" is required and must be a string');
  if (problems.length > 0) throw badRequest('Invalid login request.', `${problems.join('; ')}.`);

  return { email: email.trim().toLowerCase(), password };
}

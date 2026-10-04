import { validateLoginBody } from '../validators/authValidators.js';
import { login } from '../services/authService.js';

export async function loginHandler(req, res) {
  const { email, password } = validateLoginBody(req.body);
  res.status(200).json(await login(email, password));
}

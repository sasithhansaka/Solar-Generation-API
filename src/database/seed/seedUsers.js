import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { makeId } from './random.js';

export const USER_PASSWORD = 'solar#1st';

// 1 national, 1 province (Western), 2 district users in different districts.
const USER_PLAN = [
  { n: 1, name: 'National Officer', role: 'national' },
  { n: 2, name: 'Western Province Officer', role: 'province', province: 'Western' },
  { n: 3, name: 'Colombo District Officer', role: 'district', district: 'Colombo' },
  { n: 4, name: 'Kandy District Officer', role: 'district', district: 'Kandy' },
];

export async function buildUsers(provinces, districts) {
  const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);
  const provinceByName = new Map(provinces.map((p) => [p.name, p]));
  const districtByName = new Map(districts.map((d) => [d.name, d]));

  return USER_PLAN.map((u) => {
    const base = {
      _id: makeId('user', u.n),
      name: u.name,
      email: `solar#out1st${u.n}@gmail.com`,
      passwordHash,
      role: u.role,
    };
    if (u.role === 'national') {
      return { ...base, jurisdictionType: 'all', jurisdictionId: null };
    }
    if (u.role === 'province') {
      return { ...base, jurisdictionType: 'province', jurisdictionId: provinceByName.get(u.province)._id };
    }
    return { ...base, jurisdictionType: 'district', jurisdictionId: districtByName.get(u.district)._id };
  });
}

export async function seedUsers(provinces, districts) {
  const users = await buildUsers(provinces, districts);
  // create() runs schema validation, including the role/jurisdiction rules.
  await User.create(users);
  return users;
}

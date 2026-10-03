// Real Sri Lankan provinces and districts. lat/lng is the approximate district centre.
// substations = number of grid substations seeded for that district (at least 1).
export const GEOGRAPHY = [
  {
    province: 'Western',
    districts: [
      { name: 'Colombo', code: 'COL', lat: 6.9271, lng: 79.8612, substations: 3 },
      { name: 'Gampaha', code: 'GAM', lat: 7.0873, lng: 80.0144, substations: 2 },
      { name: 'Kalutara', code: 'KAL', lat: 6.5854, lng: 79.9607, substations: 1 },
    ],
  },
  {
    province: 'Central',
    districts: [
      { name: 'Kandy', code: 'KAN', lat: 7.2906, lng: 80.6337, substations: 2 },
      { name: 'Matale', code: 'MAT', lat: 7.4675, lng: 80.6234, substations: 1 },
      { name: 'Nuwara Eliya', code: 'NUW', lat: 6.9497, lng: 80.7891, substations: 1 },
    ],
  },
  {
    province: 'Southern',
    districts: [
      { name: 'Galle', code: 'GAL', lat: 6.0535, lng: 80.221, substations: 2 },
      { name: 'Matara', code: 'MTR', lat: 5.9549, lng: 80.555, substations: 1 },
      { name: 'Hambantota', code: 'HAM', lat: 6.1241, lng: 81.1185, substations: 1 },
    ],
  },
  {
    province: 'Northern',
    districts: [
      { name: 'Jaffna', code: 'JAF', lat: 9.6615, lng: 80.0255, substations: 1 },
      { name: 'Kilinochchi', code: 'KIL', lat: 9.3803, lng: 80.377, substations: 1 },
      { name: 'Mannar', code: 'MAN', lat: 8.981, lng: 79.9044, substations: 1 },
      { name: 'Mullaitivu', code: 'MUL', lat: 9.2671, lng: 80.8142, substations: 1 },
      { name: 'Vavuniya', code: 'VAV', lat: 8.7514, lng: 80.4971, substations: 1 },
    ],
  },
  {
    province: 'Eastern',
    districts: [
      { name: 'Batticaloa', code: 'BAT', lat: 7.731, lng: 81.6747, substations: 1 },
      { name: 'Ampara', code: 'AMP', lat: 7.2912, lng: 81.6724, substations: 1 },
      { name: 'Trincomalee', code: 'TRI', lat: 8.5874, lng: 81.2152, substations: 1 },
    ],
  },
  {
    province: 'North Western',
    districts: [
      { name: 'Kurunegala', code: 'KUR', lat: 7.4863, lng: 80.3647, substations: 2 },
      { name: 'Puttalam', code: 'PUT', lat: 8.0408, lng: 79.8394, substations: 1 },
    ],
  },
  {
    province: 'North Central',
    districts: [
      { name: 'Anuradhapura', code: 'ANU', lat: 8.3114, lng: 80.4037, substations: 1 },
      { name: 'Polonnaruwa', code: 'POL', lat: 7.9403, lng: 81.0188, substations: 1 },
    ],
  },
  {
    province: 'Uva',
    districts: [
      { name: 'Badulla', code: 'BAD', lat: 6.9934, lng: 81.055, substations: 1 },
      { name: 'Monaragala', code: 'MON', lat: 6.8728, lng: 81.3507, substations: 1 },
    ],
  },
  {
    province: 'Sabaragamuwa',
    districts: [
      { name: 'Ratnapura', code: 'RAT', lat: 6.7056, lng: 80.3847, substations: 1 },
      { name: 'Kegalle', code: 'KEG', lat: 7.2513, lng: 80.3464, substations: 1 },
    ],
  },
];

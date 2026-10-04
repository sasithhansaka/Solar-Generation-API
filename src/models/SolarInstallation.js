import mongoose from 'mongoose';

const solarInstallationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    meterId: { type: String, required: true, trim: true, unique: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    substationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GridSubstation',
      required: true,
      index: true,
    },
  },
  { collection: 'solarInstallations', versionKey: false }
);

export default mongoose.model('SolarInstallation', solarInstallationSchema);

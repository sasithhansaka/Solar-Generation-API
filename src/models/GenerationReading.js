import mongoose from 'mongoose';

const generationReadingSchema = new mongoose.Schema(
  {
    installationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolarInstallation',
      required: true,
    },
    timestamp: { type: Date, required: true },
    powerKw: { type: Number, required: true, min: 0 },
    energyKwh: { type: Number, required: true, min: 0 },
    voltage: {
      type: Number,
      required: true,
      validate: { validator: (v) => v > 0, message: 'voltage must be greater than 0' },
    },
  },
  { collection: 'generationReadings', versionKey: false }
);

generationReadingSchema.index({ installationId: 1, timestamp: -1 }, { unique: true });
generationReadingSchema.index({ timestamp: -1, installationId: 1 });

export default mongoose.model('GenerationReading', generationReadingSchema);

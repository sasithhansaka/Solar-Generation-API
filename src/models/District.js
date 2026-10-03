import mongoose from 'mongoose';

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    provinceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Province', required: true },
  },
  { collection: 'districts', versionKey: false }
);

// Unique name within a province. Also serves lookups by provinceId (index prefix).
districtSchema.index({ provinceId: 1, name: 1 }, { unique: true });

export default mongoose.model('District', districtSchema);

import mongoose from 'mongoose';

const provinceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { collection: 'provinces', versionKey: false }
);

export default mongoose.model('Province', provinceSchema);

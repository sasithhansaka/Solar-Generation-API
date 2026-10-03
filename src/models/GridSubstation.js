import mongoose from 'mongoose';

const gridSubstationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      required: true,
      index: true,
    },
  },
  { collection: 'gridSubstations', versionKey: false }
);

export default mongoose.model('GridSubstation', gridSubstationSchema);

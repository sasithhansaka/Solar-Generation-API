import mongoose from 'mongoose';

const ROLES = ['national', 'province', 'district'];
const JURISDICTION_TYPES = ['all', 'province', 'district'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ROLES },
    jurisdictionType: { type: String, required: true, enum: JURISDICTION_TYPES },
    // Province _id or District _id depending on jurisdictionType; null for national.
    jurisdictionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    collection: 'users',
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// national -> all -> null | province -> province -> Province id | district -> district -> District id
userSchema.pre('validate', function () {
  const expectedType = { national: 'all', province: 'province', district: 'district' }[this.role];
  if (!expectedType) return; // invalid role is reported by the enum validator

  if (this.jurisdictionType !== expectedType) {
    this.invalidate(
      'jurisdictionType',
      `role "${this.role}" requires jurisdictionType "${expectedType}"`
    );
  }
  if (this.role === 'national' && this.jurisdictionId != null) {
    this.invalidate('jurisdictionId', 'national users must have jurisdictionId null');
  }
  if (this.role !== 'national' && this.jurisdictionId == null) {
    this.invalidate('jurisdictionId', `${this.role} users require a jurisdictionId`);
  }
});

export default mongoose.model('User', userSchema);

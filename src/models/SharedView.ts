import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISharedView extends Document {
  token: string;
  title: string;
  included_providers: string[]; // ["claude", "openai", "openrouter"]
  included_tenants: string[];   // Array of TenantConfig IDs (strings)
  is_active: boolean;
  last_accessed_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SharedViewSchema = new Schema<ISharedView>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: "Vista Ejecutiva",
      trim: true,
    },
    included_providers: {
      type: [String],
      default: [],
    },
    included_tenants: {
      type: [String],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    last_accessed_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const SharedView: Model<ISharedView> =
  mongoose.models.SharedView ||
  mongoose.model<ISharedView>("SharedView", SharedViewSchema);


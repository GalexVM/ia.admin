import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenantCutoff extends Document {
  tenant_id: string;
  cutoff_day: number;
  company_name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantCutoffSchema = new Schema<ITenantCutoff>(
  {
    tenant_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    cutoff_day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
      default: 25,
    },
    company_name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "tenant_cutoffs",
  }
);

export const TenantCutoff: Model<ITenantCutoff> =
  mongoose.models.TenantCutoff ||
  mongoose.model<ITenantCutoff>("TenantCutoff", TenantCutoffSchema);


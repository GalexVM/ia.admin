import mongoose, { Schema, Document, Model } from "mongoose";
import {
  TenantStatus,
  TenantConfiguration,
  DEFAULT_TENANT_CONFIGURATION,
  SyncRecord,
} from "@/types/tenant";

export * from "@/types/tenant";

export interface ITenantConfig extends Document {
  token: string;
  company_name: string;
  chatbot_name?: string;
  chatbot_url?: string;
  cutoff_day?: number;
  status: TenantStatus;
  configuration: TenantConfiguration;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user_initial_intent?: Record<string, any>;
  sync_history: SyncRecord[];
  last_synced_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TenantConfigSchema = new Schema<ITenantConfig>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    company_name: {
      type: String,
      default: "Nuevo Cliente",
      trim: true,
    },
    chatbot_name: {
      type: String,
      default: "Zefi",
      trim: true,
    },
    chatbot_url: {
      type: String,
      default: "",
      trim: true,
    },
    cutoff_day: {
      type: Number,
      default: 25,
      min: 1,
      max: 31,
    },
    status: {
      type: String,
      enum: ["pending_onboarding", "configured", "synced", "error"],
      default: "pending_onboarding",
      index: true,
    },
    configuration: {
      type: Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_TENANT_CONFIGURATION }),
    },
    user_initial_intent: {
      type: Schema.Types.Mixed,
    },
    sync_history: [
      {
        synced_at: { type: Date, default: Date.now },
        status: { type: String, enum: ["success", "failed"] },
        message: { type: String, default: "" },
        payload: { type: Schema.Types.Mixed },
      },
    ],
    last_synced_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevenir recompilación del modelo en hot-reload
export const TenantConfig: Model<ITenantConfig> =
  mongoose.models.TenantConfig || mongoose.model<ITenantConfig>("TenantConfig", TenantConfigSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export type ProviderId = "claude" | "openai" | "openrouter";

export interface IProviderBalance extends Document {
  provider: ProviderId;
  label: string;
  initial_balance: number;
  start_date: Date;
  admin_key?: string;
  baseline_usage: number;
  last_calculated_usage: number;
  last_calculated_remaining: number;
  last_sync_status: "success" | "warning" | "error" | "pending";
  last_sync_message?: string;
  last_synced_at?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_provider_data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderBalanceSchema = new Schema<IProviderBalance>(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ["claude", "openai", "openrouter"],
    },
    label: {
      type: String,
      required: true,
    },
    initial_balance: {
      type: Number,
      default: 0,
    },
    start_date: {
      type: Date,
      default: Date.now,
    },
    admin_key: {
      type: String,
      default: "",
    },
    baseline_usage: {
      type: Number,
      default: 0,
    },
    last_calculated_usage: {
      type: Number,
      default: 0,
    },
    last_calculated_remaining: {
      type: Number,
      default: 0,
    },
    last_sync_status: {
      type: String,
      enum: ["success", "warning", "error", "pending"],
      default: "pending",
    },
    last_sync_message: {
      type: String,
      default: "",
    },
    last_synced_at: {
      type: Date,
    },
    raw_provider_data: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const ProviderBalance: Model<IProviderBalance> =
  mongoose.models.ProviderBalance ||
  mongoose.model<IProviderBalance>("ProviderBalance", ProviderBalanceSchema);


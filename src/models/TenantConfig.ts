import mongoose, { Schema, Document, Model } from "mongoose";

export type TenantStatus = "pending_onboarding" | "configured" | "synced" | "error";
export type WritingTone = "formal" | "friendly" | "concise" | "creative";

export interface CompanyProfile {
  company_name: string;
  industry: string;
  description: string;
  website?: string;
  contact_email?: string;
  phone?: string;
}

export interface BotPersona {
  chatbot_name: string;
  fallback_agent?: string;
  writing_tone: WritingTone;
  language: string;
  welcome_message?: string;
  fallback_message?: string;
}

export interface RulesFeatures {
  enable_lead_capture: boolean;
  enable_booking: boolean;
  enable_human_escalation: boolean;
  enable_faq: boolean;
  business_hours: {
    enabled: boolean;
    schedule?: string;
  };
  custom_rules?: string;
  banned_topics?: string;
}

export interface TenantConfiguration {
  company_profile: CompanyProfile;
  bot_persona: BotPersona;
  rules_features: RulesFeatures;
  raw_config?: Record<string, unknown>;
}

export interface SyncRecord {
  synced_at: Date;
  status: "success" | "failed";
  message: string;
}

export interface ITenantConfig extends Document {
  token: string;
  company_name: string;
  chatbot_name?: string;
  chatbot_url?: string;
  status: TenantStatus;
  configuration: TenantConfiguration;
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
      default: "Zefiron Bot",
      trim: true,
    },
    chatbot_url: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending_onboarding", "configured", "synced", "error"],
      default: "pending_onboarding",
      index: true,
    },
    configuration: {
      company_profile: {
        company_name: { type: String, default: "" },
        industry: { type: String, default: "" },
        description: { type: String, default: "" },
        website: { type: String, default: "" },
        contact_email: { type: String, default: "" },
        phone: { type: String, default: "" },
      },
      bot_persona: {
        chatbot_name: { type: String, default: "" },
        fallback_agent: { type: String, default: "" },
        writing_tone: {
          type: String,
          enum: ["formal", "friendly", "concise", "creative"],
          default: "friendly",
        },
        language: { type: String, default: "es" },
        welcome_message: { type: String, default: "" },
        fallback_message: { type: String, default: "" },
      },
      rules_features: {
        enable_lead_capture: { type: Boolean, default: true },
        enable_booking: { type: Boolean, default: true },
        enable_human_escalation: { type: Boolean, default: true },
        enable_faq: { type: Boolean, default: true },
        business_hours: {
          enabled: { type: Boolean, default: false },
          schedule: { type: String, default: "Lunes a Viernes 09:00 - 18:00" },
        },
        custom_rules: { type: String, default: "" },
        banned_topics: { type: String, default: "" },
      },
      raw_config: { type: Schema.Types.Mixed, default: {} },
    },
    sync_history: [
      {
        synced_at: { type: Date, default: Date.now },
        status: { type: String, enum: ["success", "failed"] },
        message: { type: String, default: "" },
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

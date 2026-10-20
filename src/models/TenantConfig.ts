import mongoose, { Schema, Document, Model } from "mongoose";

export type TenantStatus = "pending_onboarding" | "configured" | "synced" | "error";
export type WritingTone = "REGULAR" | "POLITE";
export type UnitPricePolicy = "NONE" | "TOTAL_PRICE" | "PRICE_M2";

export interface OptionButton {
  id: string;
  label: string;
  action?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

export interface RecontactMessageConfig {
  message: string;
  delay_hours?: number;
  options?: (string | OptionButton)[];
  media_url?: string;
  media_type?: "image" | "audio";
}

export interface GreetingMessageConfig {
  message: string;
  options?: "BUY_PURPOSE" | string;
  picture?: string;
  delay_hours?: number;
}

export type DateModeSelection =
  | "ALL"
  | "SATURDAY"
  | "WEEKEND"
  | "BUSINESS_DAYS"
  | "EXCEPT_SATURDAY";

export interface MessageCountScore {
  threshold: number;
  points: number;
}

export interface TenantConfiguration {
  // 1. Identidad y configuración base
  company_name?: string;
  company_address?: string;
  company_coords?: string[];
  chatbot_name?: string;
  personality_prompt?: string;
  writing_tone?: WritingTone;
  enable_custom_greeting?: boolean;
  custom_greeting?: GreetingMessageConfig | string;
  prioritary_greeting?: boolean;
  mention_zone_in_greeting?: boolean;
  mention_region_in_address?: boolean;

  // 2. Información que el bot puede revelar
  price_policy?: UnitPricePolicy;
  gives_average_prices?: boolean;
  gives_price_per_m2?: boolean;
  gives_average_space_metrics?: boolean;
  gives_number_of_unities_available?: boolean;
  gives_if_available_unities?: boolean;
  gives_start_date?: boolean;
  gives_end_date?: boolean;
  gives_number_blocks_or_levels?: boolean;
  gives_views?: boolean;
  gives_location?: boolean;
  gives_financing?: boolean;
  send_brochures?: boolean;
  send_pictures?: boolean;
  shows_assesor_name?: boolean;
  offers_principal_zones?: boolean;
  include_brochure_in_info?: boolean;
  simplify_info_message?: boolean;

  // 3. Captura de datos del lead
  enable_name_completed?: boolean;
  enable_budget?: boolean;
  ask_budget?: boolean;
  budget_mode?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ranges_predefined?: Record<string, any>[];
  asks_about_purpose?: boolean;
  ask_about_purpose_inline?: boolean;
  asks_name_from_the_beggining?: boolean;
  asks_name_from_the_beggining_formal?: boolean;
  asks_investment_time?: boolean;
  asks_buy_method_intent?: boolean;
  fast_financing_derivation?: boolean;

  // 4. Agendamiento y citas
  enable_module_visit?: boolean;
  uses_google_calendar?: boolean;
  days_available_visit?: number;
  range_available_visit?: Record<string, string>;
  seleccion_mode_date?: DateModeSelection | string;
  duration_date?: number;
  appointment_duration?: number;
  chooses_activity?: boolean;
  custom_activities?: string[];
  enabled_message_visit?: boolean;
  scheduling_message_completed?: string;

  // 5. Calificación del lead y resumen para el asesor
  enabled_scoring?: boolean;
  automatic_summary?: boolean;

  // 6. Sesión y reactivación de leads
  user_session_window?: number;
  info_refresh_time?: number;
  recontact_hours?: number;
  recontact_times?: number;
  custom_recontact_delays?: boolean;
  recontact_messages?: (string | RecontactMessageConfig)[];
  session_window_closing_message?: boolean;

  // 7. Seguridad y bloqueos
  phrases_to_avoid?: string | string[];
  blacklist_short_timeout?: number;
  blacklist_large_timeout?: number;

  // 8. Handoff y emergencias
  fallback_main_activity?: string;
  fallback_urgent_activity?: string;
  fallback_urgent_tag_schedule?: string;
  fallback_urgent_tag_frustrated?: string;
  fallback_urgent_tag_error?: string;
  fallback_ctwa_changed_project_tag?: string;
  custom_handoff_message?: string;

  // 9. Stickers Zefi
  uses_stickers?: boolean;

  // 10. Developer only
  accept_all_projects?: boolean;
  accept_all_proyects?: boolean;
  recontact_check_minutes?: number;
  inyects_agent_name_in_following_message?: boolean;
  send_closing_and_agent_notice_only_once?: boolean;
  message_count_score?: MessageCountScore;
  meta_campaings_enable?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta_campaings?: any[];
  message_personality_enable?: boolean;
  multimedia_resources?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message_personalitiy?: Record<string, any>;
  email_jefe_comercial?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location_resources?: Record<string, any>;
  fallback_agent?: string;
  ignored_projects?: string[];
  scoring_intents?: Record<string, number>;
  lead_score?: Record<string, number>;
  investment_timeline_scores?: Record<string, number>;
  positive_accions?: Record<string, number>;
  negative_accions?: Record<string, number>;
  negative_decay?: Record<string, number>;
  project_event?: Record<string, number>;
  configuration_list_summary?: Record<string, boolean>;
  flood_max_messages?: number;
  flood_window_seconds?: number;
  flood_cooldown_seconds?: number;
  model_smart_llm?: string;
  model_fast_llm?: string;
  enable_persist_leads_job?: boolean;
  count_messages_by_lead?: number;
  ask_all_unities?: boolean;
  toker_per_response?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token_company?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  special_configurations?: any[];

  // Support arbitrary extra fields coming from backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SyncRecord {
  synced_at: Date;
  status: "success" | "failed";
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

export interface ITenantConfig extends Document {
  token: string;
  company_name: string;
  chatbot_name?: string;
  chatbot_url?: string;
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
      type: Schema.Types.Mixed,
      default: {}
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

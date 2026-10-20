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

export const DEFAULT_TENANT_CONFIGURATION: TenantConfiguration = {
  // 1. Identidad y configuración base
  company_name: "Nuevo Cliente",
  company_address: "Av. Belaunde 203-B Arequipa",
  company_coords: ["-16.409", "-71.537"],
  chatbot_name: "Zefi",
  personality_prompt: "",
  writing_tone: "REGULAR",
  enable_custom_greeting: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_greeting: null as any,
  prioritary_greeting: false,
  mention_zone_in_greeting: true,
  mention_region_in_address: true,

  // 2. Información que el bot puede revelar
  price_policy: "NONE",
  gives_average_prices: true,
  gives_price_per_m2: true,
  gives_average_space_metrics: true,
  gives_number_of_unities_available: true,
  gives_if_available_unities: true,
  gives_start_date: true,
  gives_end_date: true,
  gives_number_blocks_or_levels: true,
  gives_views: true,
  gives_location: true,
  gives_financing: true,
  send_brochures: true,
  send_pictures: true,
  shows_assesor_name: true,
  offers_principal_zones: true,
  include_brochure_in_info: true,
  simplify_info_message: false,

  // 3. Captura de datos del lead
  enable_name_completed: false,
  asks_name_from_the_beggining: false,
  asks_name_from_the_beggining_formal: false,
  enable_budget: true,
  ask_budget: true,
  budget_mode: "TEXT",
  ranges_predefined: [
    { label: "Menos de 1.500", min: 800, max: 1500 },
    { label: "S/.2000 a S/.5000", min: 2000, max: 5000 },
    { label: "S/.5000 a S/10.000", min: 5000, max: 10000 },
  ],
  asks_about_purpose: true,
  ask_about_purpose_inline: false,
  asks_buy_method_intent: false,
  asks_investment_time: false,
  fast_financing_derivation: false,

  // 4. Agendamiento y citas
  enable_module_visit: true,
  uses_google_calendar: false,
  days_available_visit: 0,
  range_available_visit: { start: "09:00:00", end: "16:00:00" },
  seleccion_mode_date: "ALL",
  duration_date: 60,
  appointment_duration: 60,
  chooses_activity: false,
  custom_activities: [],
  enabled_message_visit: false,
  scheduling_message_completed: "Tu asesor asignado te contactará para confirmar",

  // 5. Calificación del lead y resumen para el asesor
  enabled_scoring: true,
  automatic_summary: true,

  // 6. Sesión y reactivación de leads
  user_session_window: 1800,
  info_refresh_time: 1,
  recontact_hours: 5.0,
  recontact_times: 3,
  custom_recontact_delays: false,
  recontact_messages: [],
  session_window_closing_message: false,

  // 7. Seguridad y bloqueos
  phrases_to_avoid: [],
  blacklist_short_timeout: 6,
  blacklist_large_timeout: 24,

  // 8. Handoff y emergencias
  fallback_main_activity: "",
  fallback_urgent_activity: "Llamada emergencia (IA)",
  fallback_urgent_tag_schedule: "SIN HORARIOS (IA)",
  fallback_urgent_tag_frustrated: "Solicita Humano (IA)",
  fallback_urgent_tag_error: "Urgente (IA)",
  fallback_ctwa_changed_project_tag: "Posible interés en otro proyecto",
  custom_handoff_message: "",

  // 9. Stickers Zefi
  uses_stickers: true,

  // 10. Developer only
  accept_all_projects: false,
  accept_all_proyects: false,
  recontact_check_minutes: 1,
  inyects_agent_name_in_following_message: false,
  send_closing_and_agent_notice_only_once: false,
  message_count_score: { threshold: 4, points: 5 },
  meta_campaings_enable: false,
  meta_campaings: [],
  message_personality_enable: false,
  multimedia_resources: [],
  email_jefe_comercial: "condorenajoshua98@gmail.com",
  fallback_agent: "4dda1dd3-852e-4591-b56e-c170d595854b",
  flood_max_messages: 5,
  flood_window_seconds: 10,
  flood_cooldown_seconds: 300,
  model_smart_llm: "claude-haiku-4-5-20251001",
  model_fast_llm: "gpt-4o-mini",
  toker_per_response: 150,
  count_messages_by_lead: 150,
  enable_persist_leads_job: false,
  ask_all_unities: false,
};

export interface SyncRecord {
  synced_at: Date;
  status: "success" | "failed";
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

export interface TenantRecord {
  _id?: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}

export type ITenantConfig = TenantRecord;


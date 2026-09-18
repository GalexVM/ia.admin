"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Eye,
  UserCheck,
  Calendar,
  Award,
  Clock,
  Shield,
  PhoneForwarded,
  Smile,
  Terminal,
  Search,
  Code2,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  HelpCircle,
  Download,
} from "lucide-react";
import styles from "./ConfigEditor.module.css";
import { TenantConfiguration } from "@/models/TenantConfig";

interface ConfigEditorProps {
  initialConfig: TenantConfiguration;
  isAdmin?: boolean;
  isSaving?: boolean;
  onSave?: (config: TenantConfiguration, syncToRemote: boolean) => Promise<void>;
  saveButtonText?: string;
  feedbackMessage?: {
    type: "success" | "error" | "info";
    text: string;
    details?: string;
  } | null;
  onPull?: () => Promise<void>;
  isPulling?: boolean;
}

export default function ConfigEditor({
  initialConfig,
  isAdmin = false,
  isSaving = false,
  onSave,
  saveButtonText = "Guardar y Actualizar (/configuration)",
  feedbackMessage,
  onPull,
  isPulling = false,
}: ConfigEditorProps) {
  const [config, setConfig] = useState<TenantConfiguration>({ ...initialConfig });
  const [activeCategory, setActiveCategory] = useState<string>("cat_identity");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"form" | "json">("form");
  const [rawJsonText, setRawJsonText] = useState(() => JSON.stringify(initialConfig, null, 2));

  React.useEffect(() => {
    setConfig({ ...initialConfig });
    setRawJsonText(JSON.stringify(initialConfig, null, 2));
  }, [initialConfig]);

  // Actualizar campo genérico
  const handleFieldChange = (key: keyof TenantConfiguration, value: unknown) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: value };
      setRawJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  // Toggle booleano
  const handleToggle = (key: keyof TenantConfiguration) => {
    handleFieldChange(key, !config[key]);
  };

  // Manejo de arrays de strings (coords, custom_activities)
  const [newActivity, setNewActivity] = useState("");
  const addActivity = () => {
    if (!newActivity.trim()) return;
    const current = config.custom_activities || [];
    handleFieldChange("custom_activities", [...current, newActivity.trim()]);
    setNewActivity("");
  };

  const removeActivity = (index: number) => {
    const current = config.custom_activities || [];
    handleFieldChange(
      "custom_activities",
      current.filter((_, i) => i !== index)
    );
  };

  // Coordenadas lat/lng
  const coordsLat = (config.company_coords && config.company_coords[0]) || "";
  const coordsLng = (config.company_coords && config.company_coords[1]) || "";

  const updateCoord = (index: 0 | 1, val: string) => {
    const current = [...(config.company_coords || ["", ""])];
    current[index] = val.trim();
    handleFieldChange("company_coords", current);
  };

  // Rango horario de visitas
  const visitStart = config.range_available_visit?.start || "09:00";
  const visitEnd = config.range_available_visit?.end || "18:00";

  const updateVisitRange = (key: "start" | "end", val: string) => {
    handleFieldChange("range_available_visit", {
      ...(config.range_available_visit || { start: "09:00", end: "18:00" }),
      [key]: val,
    });
  };

  // Definición de las 10 categorías
  const categories = useMemo(() => {
    const list = [
      {
        id: "cat_identity",
        title: "1. Identidad y Base",
        shortTitle: "Identidad",
        icon: Building2,
        description: "Nombre de la empresa, dirección, asistente y tono de redacción.",
      },
      {
        id: "cat_reveal",
        title: "2. Información Revelable",
        shortTitle: "Info a Revelar",
        icon: Eye,
        description: "Reglas sobre qué datos puede suministrar el bot (precios, fechas, brochures).",
      },
      {
        id: "cat_leads",
        title: "3. Captura de Leads",
        shortTitle: "Captura Leads",
        icon: UserCheck,
        description: "Requisitos para pedir nombre, presupuesto, horizonte de inversión.",
      },
      {
        id: "cat_booking",
        title: "4. Agendamiento y Citas",
        shortTitle: "Agendamiento",
        icon: Calendar,
        description: "Disponibilidad, Google Calendar, horarios y duración de visitas.",
      },
      {
        id: "cat_scoring",
        title: "5. Calificación & Resumen",
        shortTitle: "Scoring Leads",
        icon: Award,
        description: "Evaluación automática de prospectos y resúmenes para asesores.",
      },
      {
        id: "cat_session",
        title: "6. Sesión & Recontacto",
        shortTitle: "Sesión & Recontacto",
        icon: Clock,
        description: "Ventana de inactividad, tiempos de refresco y recontactos.",
      },
      {
        id: "cat_security",
        title: "7. Seguridad & Bloqueos",
        shortTitle: "Seguridad",
        icon: Shield,
        description: "Frases prohibidas y tiempos de suspensión/blacklist.",
      },
      {
        id: "cat_handoff",
        title: "8. Handoff & Emergencias",
        shortTitle: "Derivación / Handoff",
        icon: PhoneForwarded,
        description: "Actividades de transferencia a humanos y tags de derivación urgente.",
      },
      {
        id: "cat_stickers",
        title: "9. Stickers Zefi",
        shortTitle: "Stickers Zefi",
        icon: Smile,
        description: "Comportamiento visual y envío de stickers temáticos en canales.",
      },
    ];

    if (isAdmin) {
      list.push({
        id: "cat_dev",
        title: "10. Solo Desarrolladores",
        shortTitle: "Dev / Avanzado",
        icon: Terminal,
        description: "Parámetros avanzados, modelos LLM, flood control y configuración especial.",
      });
    }

    return list;
  }, [isAdmin]);

  // Manejo de guardado
  const handleSubmit = (syncToRemote: boolean = true) => {
    if (onSave) {
      if (viewMode === "json") {
        try {
          const parsed = JSON.parse(rawJsonText);
          onSave(parsed, syncToRemote);
        } catch {
          alert("El JSON tiene errores de sintaxis. Por favor revísalo antes de guardar.");
        }
      } else {
        onSave(config, syncToRemote);
      }
    }
  };

  return (
    <div className={styles.editorContainer}>
      {/* Barra superior de búsqueda y acciones */}
      <div className={styles.topControls}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar parámetro (ej. precio, visit, prompt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={() => {
              if (viewMode === "form") {
                setRawJsonText(JSON.stringify(config, null, 2));
                setViewMode("json");
              } else {
                try {
                  const parsed = JSON.parse(rawJsonText);
                  setConfig(parsed);
                  setViewMode("form");
                } catch {
                  alert("JSON inválido. Corrige el formato antes de volver al formulario.");
                }
              }
            }}
            className={styles.viewModeBtn}
            title="Alternar entre Formulario y Editor JSON"
          >
            <Code2 size={15} />
            <span>{viewMode === "form" ? "Ver JSON Raw" : "Modo Formulario"}</span>
          </button>

          {onPull && (
            <button
              type="button"
              disabled={isPulling}
              onClick={onPull}
              className={styles.viewModeBtn}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-primary)"
              }}
            >
              {isPulling ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isPulling ? "Obteniendo..." : "Traer de Endpoint"}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSubmit(true)}
            className={styles.saveBtn}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? "Guardando y Sincronizando..." : saveButtonText}</span>
          </button>
        </div>
      </div>

      {/* Banner de feedback si existe */}
      {feedbackMessage && (
        <div
          className={`${styles.feedbackBanner} ${
            feedbackMessage.type === "success"
              ? styles.bannerSuccess
              : feedbackMessage.type === "error"
              ? styles.bannerError
              : styles.bannerInfo
          }`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <div>
              <strong>{feedbackMessage.text}</strong>
              {feedbackMessage.details && (
                <div style={{ fontSize: "0.75rem", marginTop: 2, opacity: 0.9 }}>
                  {feedbackMessage.details}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista JSON Raw */}
      {viewMode === "json" ? (
        <div style={{ padding: "24px 32px" }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Editor JSON Directo (Útil para desarrolladores y configuraciones avanzadas)
            </span>
          </div>
          <textarea
            value={rawJsonText}
            onChange={(e) => setRawJsonText(e.target.value)}
            className={styles.rawJsonContainer}
            rows={22}
            style={{ width: "100%" }}
          />
        </div>
      ) : (
        /* Vista Formulario */
        <div className={styles.mainLayout}>
          {/* Navegación por Categorías */}
          <aside className={styles.categoryNav}>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const isDev = cat.id === "cat_dev";

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery("");
                  }}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${
                    isDev ? styles.navItemDev : ""
                  }`}
                >
                  <div className={styles.navItemLeft}>
                    <Icon size={16} />
                    <span className={styles.navItemTitle}>{cat.shortTitle}</span>
                  </div>
                  {isDev && <span className={styles.catBadge}>Dev</span>}
                </button>
              );
            })}
          </aside>

          {/* Área de Campos */}
          <main className={styles.contentArea}>
            {/* Categoría 1: Identidad y Configuración Base */}
            {(activeCategory === "cat_identity" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Building2 size={20} color="var(--brand-primary)" />
                    1. Identidad y Configuración Base
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Datos de la empresa, asistente virtual y prompt de personalidad base.
                  </p>
                </div>

                <div className={styles.fieldsGrid}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Nombre de la Empresa</label>
                      <span className={styles.labelKey}>company_name</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.company_name || ""}
                      onChange={(e) => handleFieldChange("company_name", e.target.value)}
                      placeholder="Ej. Inmobiliaria Panorama"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Nombre del Chatbot</label>
                      <span className={styles.labelKey}>chatbot_name</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.chatbot_name || ""}
                      onChange={(e) => handleFieldChange("chatbot_name", e.target.value)}
                      placeholder="Ej. Zefiron Bot"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Dirección Física</label>
                      <span className={styles.labelKey}>company_address</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.company_address || ""}
                      onChange={(e) => handleFieldChange("company_address", e.target.value)}
                      placeholder="Ej. Av. Javier Prado Este 456, San Isidro"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Tono de Redacción</label>
                      <span className={styles.labelKey}>writing_tone</span>
                    </div>
                    <select
                      className={styles.select}
                      value={config.writing_tone || "REGULAR"}
                      onChange={(e) => handleFieldChange("writing_tone", e.target.value)}
                    >
                      <option value="REGULAR">Amigable / Cercano (tú)</option>
                      <option value="POLITE">Formal / Corporativo (usted)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Coordenadas GPS (Lat / Lng)</label>
                      <span className={styles.labelKey}>company_coords</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Latitud (ej. -12.0463)"
                        value={coordsLat}
                        onChange={(e) => updateCoord(0, e.target.value)}
                        className={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="Longitud (ej. -77.0427)"
                        value={coordsLng}
                        onChange={(e) => updateCoord(1, e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Prompt de Personalidad & Instrucciones</label>
                      <span className={styles.labelKey}>personality_prompt</span>
                    </div>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      value={config.personality_prompt || ""}
                      onChange={(e) => handleFieldChange("personality_prompt", e.target.value)}
                      placeholder="Define la misión, tono y reglas específicas del bot..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Categoría 2: Información Revelable */}
            {(activeCategory === "cat_reveal" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Eye size={20} color="var(--brand-primary)" />
                    2. Información que el Bot Puede Revelar
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Controla qué datos inmobiliarios y comerciales tiene permiso de compartir.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div className={styles.formGroup} style={{ maxWidth: 360 }}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Política de Precios Unitarios</label>
                      <span className={styles.labelKey}>price_policy</span>
                    </div>
                    <select
                      className={styles.select}
                      value={config.price_policy || "TOTAL_PRICE"}
                      onChange={(e) => handleFieldChange("price_policy", e.target.value)}
                    >
                      <option value="RANGE">Mostrar Rango de Precio (RANGE)</option>
                      <option value="EXACT">Mostrar Precio Exacto (EXACT)</option>
                      <option value="STARTING_FROM">Mostrar Precio desde (STARTING_FROM)</option>
                      <option value="NONE">No Revelar Precios (NONE)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldsGrid}>
                  {[
                    { key: "gives_average_prices", label: "Dar Precios Promedio", desc: "Mencionar valores promedio de unidades/lotes" },
                    { key: "gives_price_per_m2", label: "Dar Precio por m²", desc: "Permitir desglose de costo de m²" },
                    { key: "gives_average_space_metrics", label: "Métricas de Espacio", desc: "Mencionar metrajes promedio de unidades/lotes (m²)" },
                    { key: "gives_number_of_unities_available", label: "Número de Unidades Disponibles", desc: "Decir cuántas unidades exactas quedan" },
                    { key: "gives_if_available_unities", label: "Indicar si Hay Disponibilidad", desc: "Confirmar o negar si hay stock disponible" },
                    { key: "gives_start_date", label: "Fecha de Inicio de Obra", desc: "Informar cuándo arrancó o arranca el proyecto" },
                    { key: "gives_end_date", label: "Fecha de Entrega", desc: "Informar fecha estimada de entrega de llaves" },
                    { key: "gives_number_blocks_or_levels", label: "Número de Manzanas / Niveles", desc: "Detallar niveles de la edificación o manzanas de la lotización" },
                    { key: "gives_views", label: "Mencionar Vistas", desc: "Indicar si tiene vista a parque, calle, mar, etc." },
                    { key: "gives_location", label: "Revelar Ubicación", desc: "Brindar dirección exacta del proyecto y google maps" },
                    { key: "gives_financing", label: "Informar Financiamiento", desc: "Mencionar los tipos de financiamiento disponibles" },
                    { key: "send_brochures", label: "Enviar Brochures", desc: "Permitir envío de brochures PDFs descargables" },
                    { key: "send_pictures", label: "Enviar Fotografías", desc: "Permitir envío de imágenes del proyecto" },
                    { key: "shows_assesor_name", label: "Mostrar Nombre del Asesor", desc: "Nombrar al agente humano asignado al agendar cita" },
                    { key: "offers_principal_zones", label: "Ofrecer Zonas Principales", desc: "Indicar las zonas principales donde se tiene proyectos en el saludo" },
                    { key: "include_brochure_in_info", label: "Incluir Brochure Automático", desc: "Incluir brochure en el resumen de info del proyecto" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => handleToggle(item.key as keyof TenantConfiguration)}
                      className={`${styles.toggleCard} ${
                        config[item.key as keyof TenantConfiguration] ? styles.toggleCardActive : ""
                      }`}
                    >
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>{item.label}</span>
                        <span className={styles.toggleDesc}>{item.desc}</span>
                        <span className={styles.labelKey}>{item.key}</span>
                      </div>
                      <div
                        className={`${styles.switch} ${
                          config[item.key as keyof TenantConfiguration] ? styles.switchChecked : ""
                        }`}
                      >
                        <div className={styles.switchKnob} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categoría 3: Captura de Datos del Lead */}
            {(activeCategory === "cat_leads" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <UserCheck size={20} color="var(--brand-primary)" />
                    3. Captura de Datos del Lead
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Flujos de calificación previa para solicitar nombre, presupuesto y propósito.
                  </p>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                    <div className={styles.formGroup}>
                      <div className={styles.labelWrapper}>
                        <label className={styles.label}>Modo de Presupuesto</label>
                        <span className={styles.labelKey}>budget_mode</span>
                      </div>
                      <select
                        className={styles.select}
                        value={config.budget_mode || "TEXT"}
                        onChange={(e) => handleFieldChange("budget_mode", e.target.value)}
                      >
                        <option value="TEXT">Preguntar el presupuesto directamente (TEXT)</option>
                        <option value="RANGE">Mostrar opciones de rangos (RANGE)</option>
                      </select>
                    </div>
                </div>

                <div className={styles.fieldsGrid}>
                  {[
                    { key: "enable_name_completed", label: "Exigir Nombre Completo", desc: "Pedir nombres y apellidos completos" },
                    { key: "asks_name_from_the_beggining", label: "Pedir Nombre al Inicio", desc: "Solicitar el nombre en el saludo inicial" },
                    { key: "enable_budget", label: "Módulo de Presupuesto", desc: "Habilitar la gestión de rangos de presupuesto" },
                    { key: "ask_budget", label: "Preguntar Presupuesto", desc: "Consultar explícitamente cuánto planea invertir" },
                    { key: "asks_about_purpose", label: "Preguntar Propósito", desc: "Consultar si es para vivir o como inversión" },
                    { key: "asks_investment_time", label: "Horizonte de Inversión", desc: "Preguntar fecha estimada de compra/inversión" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => handleToggle(item.key as keyof TenantConfiguration)}
                      className={`${styles.toggleCard} ${
                        config[item.key as keyof TenantConfiguration] ? styles.toggleCardActive : ""
                      }`}
                    >
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>{item.label}</span>
                        <span className={styles.toggleDesc}>{item.desc}</span>
                        <span className={styles.labelKey}>{item.key}</span>
                      </div>
                      <div
                        className={`${styles.switch} ${
                          config[item.key as keyof TenantConfiguration] ? styles.switchChecked : ""
                        }`}
                      >
                        <div className={styles.switchKnob} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categoría 4: Agendamiento y Citas */}
            {(activeCategory === "cat_booking" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Calendar size={20} color="var(--brand-primary)" />
                    4. Agendamiento y Citas
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Configuración de visitas a salas de ventas, integración con Google Calendar y duración.
                  </p>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Días Disponibles a Futuro</label>
                      <span className={styles.labelKey}>days_available_visit</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.days_available_visit ?? 7}
                      onChange={(e) => handleFieldChange("days_available_visit", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>Días hacia adelante en los que se puede reservar.</span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Horario de Atención (Inicio / Fin)</label>
                      <span className={styles.labelKey}>range_available_visit</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        type="time"
                        value={visitStart}
                        onChange={(e) => updateVisitRange("start", e.target.value)}
                        className={styles.input}
                      />
                      <input
                        type="time"
                        value={visitEnd}
                        onChange={(e) => updateVisitRange("end", e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Duración de la Cita (Minutos)</label>
                      <span className={styles.labelKey}>appointment_duration</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.appointment_duration ?? 30}
                      onChange={(e) => handleFieldChange("appointment_duration", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Modo de Selección de Fecha</label>
                      <span className={styles.labelKey}>seleccion_mode_date</span>
                    </div>
                    <select
                      className={styles.select}
                      value={config.seleccion_mode_date || "ALL"}
                      onChange={(e) => handleFieldChange("seleccion_mode_date", e.target.value)}
                    >
                      <option value="ALL">Todos los días (ALL)</option>
                      <option value="BUSINESS_DAYS">Solo días laborables (BUSINESS_DAYS)</option>
                      <option value="WEEKEND">Fines de semana (WEEKEND)</option>
                      <option value="SATURDAY">Solo sábados (SATURDAY)</option>
                      <option value="EXCEPT_SATURDAY">Excepto sábados (EXCEPT_SATURDAY)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  {[
                    { key: "enable_module_visit", label: "Habilitar Módulo de Visitas", desc: "Permite coordinar citas dentro del chat" },
                    { key: "uses_google_calendar", label: "Google Calendar", desc: "Sincronizar slots con calendario" },
                    { key: "chooses_activity", label: "Elegir Tipo de Actividad", desc: "Permitir al usuario seleccionar tipo de cita" },
                    { key: "enabled_message_visit", label: "Mensaje tras Agendar", desc: "Disparar mensaje de confirmación automático" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => handleToggle(item.key as keyof TenantConfiguration)}
                      className={`${styles.toggleCard} ${
                        config[item.key as keyof TenantConfiguration] ? styles.toggleCardActive : ""
                      }`}
                    >
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>{item.label}</span>
                        <span className={styles.toggleDesc}>{item.desc}</span>
                        <span className={styles.labelKey}>{item.key}</span>
                      </div>
                      <div
                        className={`${styles.switch} ${
                          config[item.key as keyof TenantConfiguration] ? styles.switchChecked : ""
                        }`}
                      >
                        <div className={styles.switchKnob} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label}>Actividades Personalizadas de Cita</label>
                    <span className={styles.labelKey}>custom_activities</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Nueva actividad (ej. Visita a departamento piloto)"
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addActivity();
                        }
                      }}
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={addActivity}
                      className={styles.viewModeBtn}
                      style={{ background: "var(--brand-surface)", color: "var(--brand-primary)" }}
                    >
                      <Plus size={16} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <div className={styles.tagsContainer}>
                    {(config.custom_activities || []).map((act, idx) => (
                      <span key={idx} className={styles.tagPill}>
                        {act}
                        <button
                          type="button"
                          onClick={() => removeActivity(idx)}
                          className={styles.tagRemoveBtn}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label}>Mensaje de Cita Confirmada</label>
                    <span className={styles.labelKey}>scheduling_message_completed</span>
                  </div>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={config.scheduling_message_completed || ""}
                    onChange={(e) => handleFieldChange("scheduling_message_completed", e.target.value)}
                    placeholder="Ej. ¡Excelente! Tu cita quedó confirmada. Te esperamos en la sala de ventas..."
                  />
                </div>
              </div>
            )}

            {/* Categoría 5: Calificación y Resumen */}
            {(activeCategory === "cat_scoring" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Award size={20} color="var(--brand-primary)" />
                    5. Calificación del Lead y Resumen para el Asesor
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Algoritmo de puntuación del interés del comprador y síntesis ejecutiva.
                  </p>
                </div>

                <div className={styles.fieldsGrid}>
                  <div
                    onClick={() => handleToggle("enabled_scoring")}
                    className={`${styles.toggleCard} ${config.enabled_scoring ? styles.toggleCardActive : ""}`}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Habilitar Scoring de Leads</span>
                      <span className={styles.toggleDesc}>Calcula puntos de intención de compra por cada interacción</span>
                      <span className={styles.labelKey}>enabled_scoring</span>
                    </div>
                    <div className={`${styles.switch} ${config.enabled_scoring ? styles.switchChecked : ""}`}>
                      <div className={styles.switchKnob} />
                    </div>
                  </div>

                  <div
                    onClick={() => handleToggle("automatic_summary")}
                    className={`${styles.toggleCard} ${config.automatic_summary ? styles.toggleCardActive : ""}`}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Resumen Automático para Asesor</span>
                      <span className={styles.toggleDesc}>Envía un resumen de las preferencias del lead al CRM</span>
                      <span className={styles.labelKey}>automatic_summary</span>
                    </div>
                    <div className={`${styles.switch} ${config.automatic_summary ? styles.switchChecked : ""}`}>
                      <div className={styles.switchKnob} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categoría 6: Sesión y Reactivación */}
            {(activeCategory === "cat_session" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Clock size={20} color="var(--brand-primary)" />
                    6. Sesión y Reactivación de Leads
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Ventanas de tiempo de memoria del bot y recontactos automáticos ante abandono.
                  </p>
                </div>

                <div className={styles.fieldsGrid}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Ventana de Sesión (Minutos)</label>
                      <span className={styles.labelKey}>user_session_window</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.user_session_window ?? 60}
                      onChange={(e) => handleFieldChange("user_session_window", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Refresco de Información (Horas)</label>
                      <span className={styles.labelKey}>info_refresh_time</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.info_refresh_time ?? 24}
                      onChange={(e) => handleFieldChange("info_refresh_time", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Horas antes de Recontactar</label>
                      <span className={styles.labelKey}>recontact_hours</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.recontact_hours ?? 24}
                      onChange={(e) => handleFieldChange("recontact_hours", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Máximo de Recontactos</label>
                      <span className={styles.labelKey}>recontact_times</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.recontact_times ?? 2}
                      onChange={(e) => handleFieldChange("recontact_times", Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Categoría 7: Seguridad y Bloqueos */}
            {(activeCategory === "cat_security" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Shield size={20} color="var(--brand-primary)" />
                    7. Seguridad y Bloqueos
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Protección contra lenguaje inapropiado y timeouts de bloqueo para usuarios conflictivos.
                  </p>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Timeout Bloqueo Corto (Segundos)</label>
                      <span className={styles.labelKey}>blacklist_short_timeout</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.blacklist_short_timeout ?? 300}
                      onChange={(e) => handleFieldChange("blacklist_short_timeout", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Timeout Bloqueo Largo (Segundos)</label>
                      <span className={styles.labelKey}>blacklist_large_timeout</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.blacklist_large_timeout ?? 3600}
                      onChange={(e) => handleFieldChange("blacklist_large_timeout", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label}>Frases y Términos a Evitar (Separadas por comas)</label>
                    <span className={styles.labelKey}>phrases_to_avoid</span>
                  </div>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={config.phrases_to_avoid || ""}
                    onChange={(e) => handleFieldChange("phrases_to_avoid", e.target.value)}
                    placeholder="Palabras o frases que el bot debe evadir o no mencionar jamás..."
                  />
                </div>
              </div>
            )}

            {/* Categoría 8: Handoff y Emergencias */}
            {(activeCategory === "cat_handoff" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <PhoneForwarded size={20} color="var(--brand-primary)" />
                    8. Handoff y Emergencias
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Configuración de derivación hacia ejecutivos humanos y etiquetas de criticidad.
                  </p>
                </div>

                <div className={styles.fieldsGrid}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Actividad Principal de Derivación</label>
                      <span className={styles.labelKey}>fallback_main_activity</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_main_activity || ""}
                      onChange={(e) => handleFieldChange("fallback_main_activity", e.target.value)}
                      placeholder="Ej. Contacto Asesor Comercial"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Actividad Urgente de Fallback</label>
                      <span className={styles.labelKey}>fallback_urgent_activity</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_activity || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_activity", e.target.value)}
                      placeholder="Ej. Llamada Inmediata Supervisor"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Tag Urgencia Agendamiento</label>
                      <span className={styles.labelKey}>fallback_urgent_tag_schedule</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_schedule || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_schedule", e.target.value)}
                      placeholder="Ej. URGENT_SCHEDULE"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Tag Usuario Frustrado</label>
                      <span className={styles.labelKey}>fallback_urgent_tag_frustrated</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_frustrated || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_frustrated", e.target.value)}
                      placeholder="Ej. FRUSTRATED_USER"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Tag Error de Sistema</label>
                      <span className={styles.labelKey}>fallback_urgent_tag_error</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_error || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_error", e.target.value)}
                      placeholder="Ej. SYSTEM_ERROR"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Categoría 9: Stickers Zefi */}
            {(activeCategory === "cat_stickers" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <Smile size={20} color="var(--brand-primary)" />
                    9. Stickers Zefi
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Ilustraciones y stickers visuales de la mascota Zefi para humanizar la atención.
                  </p>
                </div>

                <div className={styles.fieldsGrid}>
                  <div
                    onClick={() => handleToggle("uses_stickers")}
                    className={`${styles.toggleCard} ${config.uses_stickers ? styles.toggleCardActive : ""}`}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Permitir Stickers Zefi</span>
                      <span className={styles.toggleDesc}>
                        El bot enviará stickers en momentos clave (saludo, confirmación de cita, despedida).
                      </span>
                      <span className={styles.labelKey}>uses_stickers</span>
                    </div>
                    <div className={`${styles.switch} ${config.uses_stickers ? styles.switchChecked : ""}`}>
                      <div className={styles.switchKnob} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categoría 10: Solo Desarrolladores (Admin Only) */}
            {isAdmin && (activeCategory === "cat_dev" || searchQuery) && (
              <div style={{ marginBottom: 36 }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle} style={{ color: "#7c3aed" }}>
                    <Terminal size={20} color="#7c3aed" />
                    10. Solo Desarrolladores & Configuración Avanzada
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Parámetros técnicos del backend, LLMs de inferencia, anti-flood y metadata de campañas.
                  </p>
                </div>

                <div className={styles.devBanner}>
                  <AlertCircle size={18} />
                  <span>
                    <strong>Zona de Desarrollador:</strong> Estos campos solo son visibles para administradores y afectan el motor interno de IA y cuotas de consumo.
                  </span>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Modelo LLM Inteligente</label>
                      <span className={styles.labelKey}>model_smart_llm</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.model_smart_llm || ""}
                      onChange={(e) => handleFieldChange("model_smart_llm", e.target.value)}
                      placeholder="Ej. gpt-4o, gemini-1.5-pro"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Modelo LLM Rápido</label>
                      <span className={styles.labelKey}>model_fast_llm</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.model_fast_llm || ""}
                      onChange={(e) => handleFieldChange("model_fast_llm", e.target.value)}
                      placeholder="Ej. gpt-4o-mini"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Email Jefe Comercial</label>
                      <span className={styles.labelKey}>email_jefe_comercial</span>
                    </div>
                    <input
                      type="email"
                      className={styles.input}
                      value={config.email_jefe_comercial || ""}
                      onChange={(e) => handleFieldChange("email_jefe_comercial", e.target.value)}
                      placeholder="jefe.comercial@empresa.com"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Agente Humano de Fallback</label>
                      <span className={styles.labelKey}>fallback_agent</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_agent || ""}
                      onChange={(e) => handleFieldChange("fallback_agent", e.target.value)}
                      placeholder="Ej. asesor_central"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Flood: Máx Mensajes</label>
                      <span className={styles.labelKey}>flood_max_messages</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.flood_max_messages ?? 10}
                      onChange={(e) => handleFieldChange("flood_max_messages", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Flood: Ventana (Segundos)</label>
                      <span className={styles.labelKey}>flood_window_seconds</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.flood_window_seconds ?? 60}
                      onChange={(e) => handleFieldChange("flood_window_seconds", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Flood: Cooldown (Segundos)</label>
                      <span className={styles.labelKey}>flood_cooldown_seconds</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.flood_cooldown_seconds ?? 300}
                      onChange={(e) => handleFieldChange("flood_cooldown_seconds", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Tokens por Respuesta</label>
                      <span className={styles.labelKey}>toker_per_response</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.toker_per_response ?? 250}
                      onChange={(e) => handleFieldChange("toker_per_response", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className={styles.fieldsGrid}>
                  {[
                    { key: "meta_campaings_enable", label: "Habilitar Meta Campañas", desc: "Integración con ads y tracking de leads de Meta" },
                    { key: "message_personality_enable", label: "Modulación de Personalidad", desc: "Permite modulación dinámica del tono" },
                    { key: "enable_persist_leads_job", label: "Job de Persistencia", desc: "Sincronización en background de leads persistentes" },
                    { key: "ask_all_unities", label: "Consultar Todas las Unidades", desc: "Iterar sobre inventario total" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => handleToggle(item.key as keyof TenantConfiguration)}
                      className={`${styles.toggleCard} ${
                        config[item.key as keyof TenantConfiguration] ? styles.toggleCardActive : ""
                      }`}
                    >
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>{item.label}</span>
                        <span className={styles.toggleDesc}>{item.desc}</span>
                        <span className={styles.labelKey}>{item.key}</span>
                      </div>
                      <div
                        className={`${styles.switch} ${
                          config[item.key as keyof TenantConfiguration] ? styles.switchChecked : ""
                        }`}
                      >
                        <div className={styles.switchKnob} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

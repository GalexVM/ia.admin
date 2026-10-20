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
  Download,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Link2,
} from "lucide-react";
import styles from "./ConfigEditor.module.css";
import {
  TenantConfiguration,
  RecontactMessageConfig,
  OptionButton,
  GreetingMessageConfig,
  MessageCountScore,
  DEFAULT_TENANT_CONFIGURATION,
} from "@/types/tenant";

const populateDefaults = (raw?: TenantConfiguration | null): TenantConfiguration => {
  const merged: TenantConfiguration = { ...DEFAULT_TENANT_CONFIGURATION };
  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (val !== undefined && val !== null) {
        merged[key] = val;
      }
    }
  }
  return merged;
};

const normalizeCustomGreeting = (
  raw?: GreetingMessageConfig | string | null
): GreetingMessageConfig => {
  if (!raw) {
    return { message: "", options: undefined, picture: "" };
  }
  if (typeof raw === "string") {
    return { message: raw, options: undefined, picture: "" };
  }
  return {
    message: raw.message || "",
    options: raw.options,
    picture: raw.picture || "",
    delay_hours: raw.delay_hours,
  };
};

const normalizeRecontactMessages = (
  raw?: (string | RecontactMessageConfig)[]
): RecontactMessageConfig[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return {
        message: item,
        delay_hours: undefined,
        options: [],
        media_url: "",
        media_type: undefined,
      };
    }
    const rawOptions = item.options || [];
    const normalizedOptions: OptionButton[] = rawOptions.map((opt, i) => {
      if (typeof opt === "string") {
        return {
          id: opt.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 20) || `btn_${i + 1}`,
          label: opt,
        };
      }
      return {
        id: opt.id || `btn_${i + 1}`,
        label: opt.label || "",
        action: opt.action,
        payload: opt.payload,
      };
    });

    return {
      message: item.message || "",
      delay_hours: item.delay_hours,
      options: normalizedOptions,
      media_url: item.media_url || "",
      media_type: item.media_type,
    };
  });
};

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
  const [config, setConfig] = useState<TenantConfiguration>(() => populateDefaults(initialConfig));
  const [activeCategory, setActiveCategory] = useState<string>("cat_identity");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"form" | "json">("form");
  const [rawJsonText, setRawJsonText] = useState(() =>
    JSON.stringify(populateDefaults(initialConfig), null, 2)
  );

  React.useEffect(() => {
    const merged = populateDefaults(initialConfig);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(merged);
    setRawJsonText(JSON.stringify(merged, null, 2));
  }, [initialConfig]);

  // Helper para verificar si un campo conserva su valor por defecto del sistema
  const isAtDefault = (key: keyof TenantConfiguration): boolean => {
    const current = config[key];
    const def = DEFAULT_TENANT_CONFIGURATION[key];
    if (def === undefined || def === null || def === "") return false;
    if (Array.isArray(def)) {
      if (def.length === 0) return false;
      return Array.isArray(current) && JSON.stringify(current) === JSON.stringify(def);
    }
    if (typeof def === "object") {
      return (
        typeof current === "object" &&
        current !== null &&
        JSON.stringify(current) === JSON.stringify(def)
      );
    }
    return current === def;
  };

  // Claves con valores de prueba/ejemplo de la empresa (visibles y editables por el cliente)
  const CLIENT_WARN_DEFAULT_KEYS: (keyof TenantConfiguration)[] = [
    "company_name",
    "company_address",
    "company_coords",
  ];

  // Claves técnicas avanzadas (solo visibles para desarrolladores en Categoría 10)
  const DEV_WARN_DEFAULT_KEYS: (keyof TenantConfiguration)[] = [
    "email_jefe_comercial",
    "fallback_agent",
  ];

  const isWarnDefault = (key: keyof TenantConfiguration): boolean => {
    return (
      (CLIENT_WARN_DEFAULT_KEYS.includes(key) || DEV_WARN_DEFAULT_KEYS.includes(key)) &&
      isAtDefault(key)
    );
  };

  // Solo contamos los campos de empresa/cliente en el banner general (excluye dev/avanzado)
  const activeClientWarnDefaults = CLIENT_WARN_DEFAULT_KEYS.filter((k) => isWarnDefault(k));

  // Actualizar campo genérico
  const handleFieldChange = (key: keyof TenantConfiguration, value: unknown) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: value };
      setRawJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  // Dependencias de configuración entre campos
  const isBudgetEnabled = Boolean(config.enable_budget);
  const isVisitEnabled = Boolean(config.enable_module_visit);
  const isChoosesActivityActive = Boolean(isVisitEnabled && config.chooses_activity);
  const isAsksAboutPurposeActive = Boolean(config.asks_about_purpose);
  const isAsksNameActive = Boolean(config.asks_name_from_the_beggining);
  const isGivesFinancingActive = Boolean(config.gives_financing);
  const isNoticeActive = Boolean(
    config.session_window_closing_message || config.inyects_agent_name_in_following_message
  );

  // Manejo de Saludo Personalizado
  const greetingConfig: GreetingMessageConfig = useMemo(() => {
    return normalizeCustomGreeting(config.custom_greeting);
  }, [config.custom_greeting]);

  const handleUpdateGreeting = (updates: Partial<GreetingMessageConfig>) => {
    const current = normalizeCustomGreeting(config.custom_greeting);
    const updated: GreetingMessageConfig = {
      ...current,
      ...updates,
    };
    handleFieldChange("custom_greeting", updated);
  };

  // Manejo de Scoring por Conteo de Mensajes (Dev)
  const messageCountScore: MessageCountScore = useMemo(() => {
    if (config.message_count_score && typeof config.message_count_score === "object") {
      return {
        threshold: Number(config.message_count_score.threshold) || 0,
        points: Number(config.message_count_score.points) || 0,
      };
    }
    return { threshold: 10, points: 20 };
  }, [config.message_count_score]);

  const handleUpdateMessageCountScore = (updates: Partial<MessageCountScore>) => {
    const current = messageCountScore;
    const updated: MessageCountScore = {
      ...current,
      ...updates,
    };
    handleFieldChange("message_count_score", updated);
  };

  // Toggle booleano con propagación de dependencias
  const handleToggle = (key: keyof TenantConfiguration) => {
    const nextVal = !config[key];

    // 1. Si desactivamos enable_budget, desactivar automáticamente ask_budget
    if (key === "enable_budget" && !nextVal) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          enable_budget: false,
          ask_budget: false,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // 2. Si desactivamos enable_module_visit, desactivar automáticamente todo agendamiento
    if (key === "enable_module_visit" && !nextVal) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          enable_module_visit: false,
          chooses_activity: false,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // 3. Si desactivamos asks_about_purpose, desactivar automáticamente ask_about_purpose_inline
    if (key === "asks_about_purpose" && !nextVal) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          asks_about_purpose: false,
          ask_about_purpose_inline: false,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // 4. Si desactivamos asks_name_from_the_beggining, desactivar asks_name_from_the_beggining_formal
    if (key === "asks_name_from_the_beggining" && !nextVal) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          asks_name_from_the_beggining: false,
          asks_name_from_the_beggining_formal: false,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // 5. Si desactivamos gives_financing, desactivar fast_financing_derivation
    if (key === "gives_financing" && !nextVal) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          gives_financing: false,
          fast_financing_derivation: false,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // 6. Sincronizar accept_all_projects y accept_all_proyects
    if (key === "accept_all_projects" || key === "accept_all_proyects") {
      setConfig((prev) => {
        const updated = {
          ...prev,
          accept_all_projects: nextVal,
          accept_all_proyects: nextVal,
        };
        setRawJsonText(JSON.stringify(updated, null, 2));
        return updated;
      });
      return;
    }

    // Bloqueo de toggles hijos si el padre está desactivado
    if (key === "ask_budget" && !isBudgetEnabled) {
      return;
    }
    if (key === "chooses_activity" && !isVisitEnabled) {
      return;
    }
    if (key === "ask_about_purpose_inline" && !isAsksAboutPurposeActive) {
      return;
    }
    if (key === "asks_name_from_the_beggining_formal" && !isAsksNameActive) {
      return;
    }
    if (key === "fast_financing_derivation" && !isGivesFinancingActive) {
      return;
    }
    if (key === "send_closing_and_agent_notice_only_once" && !isNoticeActive) {
      return;
    }

    handleFieldChange(key, nextVal);
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

  // Manejo de phrases_to_avoid como lista interactiva de tags
  const [newPhrase, setNewPhrase] = useState("");
  const phrasesToAvoidList: string[] = useMemo(() => {
    const raw = config.phrases_to_avoid;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [config.phrases_to_avoid]);

  const addPhrase = () => {
    if (!newPhrase.trim()) return;
    const parts = newPhrase
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const combined = [...phrasesToAvoidList];
    for (const p of parts) {
      if (!combined.includes(p)) {
        combined.push(p);
      }
    }
    handleFieldChange("phrases_to_avoid", combined);
    setNewPhrase("");
  };

  const removePhrase = (index: number) => {
    const updated = phrasesToAvoidList.filter((_, i) => i !== index);
    handleFieldChange("phrases_to_avoid", updated);
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
  const visitEnd = config.range_available_visit?.end || "16:00";

  const updateVisitRange = (key: "start" | "end", val: string) => {
    handleFieldChange("range_available_visit", {
      ...(config.range_available_visit || { start: "09:00", end: "16:00" }),
      [key]: val,
    });
  };

  // Manejo de Recontactos v2
  const recontactList: RecontactMessageConfig[] = useMemo(() => {
    return normalizeRecontactMessages(config.recontact_messages);
  }, [config.recontact_messages]);

  const updateRecontactList = (newList: RecontactMessageConfig[]) => {
    handleFieldChange("recontact_messages", newList);
    handleFieldChange("recontact_times", newList.length);
  };

  const handleUpdateRecontact = (
    index: number,
    updates: Partial<RecontactMessageConfig>
  ) => {
    const updated = [...recontactList];
    updated[index] = {
      ...updated[index],
      ...updates,
    };
    updateRecontactList(updated);
  };

  const handleAddRecontact = () => {
    const defaultDelay = config.recontact_hours ?? 24;
    const newMsg: RecontactMessageConfig = {
      message: "",
      delay_hours: defaultDelay,
      options: [],
      media_url: "",
      media_type: undefined,
    };
    updateRecontactList([...recontactList, newMsg]);
  };

  const handleRemoveRecontact = (index: number) => {
    const updated = recontactList.filter((_, i) => i !== index);
    updateRecontactList(updated);
  };

  const handleAddButton = (msgIndex: number) => {
    const msg = recontactList[msgIndex];
    const currentOptions = (msg.options as OptionButton[]) || [];
    if (currentOptions.length >= 3) return;
    const nextIdx = currentOptions.length + 1;
    const newBtn: OptionButton = {
      id: `btn_${nextIdx}_${Date.now() % 1000}`,
      label: `Opción ${nextIdx}`,
    };
    handleUpdateRecontact(msgIndex, { options: [...currentOptions, newBtn] });
  };

  const handleUpdateButton = (
    msgIndex: number,
    btnIndex: number,
    key: "label" | "id",
    val: string
  ) => {
    const msg = recontactList[msgIndex];
    const currentOptions = [...((msg.options as OptionButton[]) || [])];
    if (currentOptions[btnIndex]) {
      currentOptions[btnIndex] = {
        ...currentOptions[btnIndex],
        [key]: val,
      };
      handleUpdateRecontact(msgIndex, { options: currentOptions });
    }
  };

  const handleRemoveButton = (msgIndex: number, btnIndex: number) => {
    const msg = recontactList[msgIndex];
    const currentOptions = ((msg.options as OptionButton[]) || []).filter((_, i) => i !== btnIndex);
    handleUpdateRecontact(msgIndex, { options: currentOptions });
  };

  // Cálculo acumulado del tiempo de recontactos y ventana de 24h
  const totalRecontactHours = useMemo(() => {
    if (recontactList.length === 0) return 0;
    if (config.custom_recontact_delays) {
      return recontactList.reduce((acc, item) => {
        const d = item.delay_hours !== undefined ? Number(item.delay_hours) : (config.recontact_hours ?? 24);
        return acc + (isNaN(d) ? 0 : d);
      }, 0);
    } else {
      const h = Number(config.recontact_hours ?? 24);
      return (isNaN(h) ? 24 : h) * recontactList.length;
    }
  }, [config.custom_recontact_delays, config.recontact_hours, recontactList]);

  const isOver24Hours = totalRecontactHours > 24;
  const progressPercent = Math.min(100, Math.round((totalRecontactHours / 24) * 100));

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
        const sanitized = { ...config };
        if (!sanitized.enable_budget) {
          sanitized.ask_budget = false;
        }
        if (!sanitized.enable_module_visit) {
          sanitized.chooses_activity = false;
        }
        if (!sanitized.asks_about_purpose) {
          sanitized.ask_about_purpose_inline = false;
        }
        if (!sanitized.asks_name_from_the_beggining) {
          sanitized.asks_name_from_the_beggining_formal = false;
        }
        if (!sanitized.gives_financing) {
          sanitized.fast_financing_derivation = false;
        }
        if (sanitized.accept_all_proyects !== undefined) {
          sanitized.accept_all_projects = sanitized.accept_all_proyects;
        } else if (sanitized.accept_all_projects !== undefined) {
          sanitized.accept_all_proyects = sanitized.accept_all_projects;
        }
        if (sanitized.enable_custom_greeting) {
          const norm = normalizeCustomGreeting(sanitized.custom_greeting);
          const cleanGreeting: GreetingMessageConfig = {
            message: norm.message || "",
          };
          if (norm.picture && norm.picture.trim()) {
            cleanGreeting.picture = norm.picture.trim();
          }
          if (norm.options) {
            cleanGreeting.options = norm.options;
          }
          sanitized.custom_greeting = cleanGreeting;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sanitized.custom_greeting = null as any;
        }
        if (sanitized.recontact_messages && Array.isArray(sanitized.recontact_messages)) {
          sanitized.recontact_messages = (sanitized.recontact_messages as RecontactMessageConfig[]).map((msg) => {
            const cleanMsg: RecontactMessageConfig = {
              message: msg.message,
            };
            if (sanitized.custom_recontact_delays && msg.delay_hours !== undefined) {
              cleanMsg.delay_hours = Number(msg.delay_hours);
            }
            if (msg.media_type && msg.media_url?.trim()) {
              cleanMsg.media_type = msg.media_type;
              cleanMsg.media_url = msg.media_url.trim();
            }
            if (msg.options && msg.options.length > 0) {
              cleanMsg.options = msg.options.slice(0, 3);
            }
            return cleanMsg;
          });
        }
        if (sanitized.custom_handoff_message === null || sanitized.custom_handoff_message === undefined) {
          sanitized.custom_handoff_message = "";
        }
        onSave(sanitized, syncToRemote);
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
            {activeClientWarnDefaults.length > 0 && (
              <div className={styles.defaultWarningBanner}>
                <AlertCircle size={18} color="#d97706" style={{ minWidth: 18 }} />
                <span>
                  Hay <strong>{activeClientWarnDefaults.length} campo{activeClientWarnDefaults.length > 1 ? "s" : ""} con valores de ejemplo por defecto</strong> que se recomienda personalizar para tu empresa (marcados con ⚠️).
                </span>
              </div>
            )}

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
                      <label className={styles.label}>
                        Nombre de la Empresa
                        {isWarnDefault("company_name") && (
                          <span
                            className={styles.defaultBadgeWarn}
                            title="Nombre genérico por defecto. Reemplázalo con el nombre de tu empresa"
                          >
                            ⚠️ Por defecto (cambiar)
                          </span>
                        )}
                      </label>
                      <span className={styles.labelKey}>company_name</span>
                    </div>
                    <input
                      type="text"
                      className={`${styles.input} ${isWarnDefault("company_name") ? styles.inputDefaultWarn : ""}`}
                      value={config.company_name || ""}
                      onChange={(e) => handleFieldChange("company_name", e.target.value)}
                      placeholder="Ej. Inmobiliaria Panorama"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Nombre del Chatbot
                        {isAtDefault("chatbot_name") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>chatbot_name</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.chatbot_name || ""}
                      onChange={(e) => handleFieldChange("chatbot_name", e.target.value)}
                      placeholder="Ej. Zefi"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Dirección Física
                        {isWarnDefault("company_address") && (
                          <span
                            className={styles.defaultBadgeWarn}
                            title="Dirección por defecto de Zefiron (Arequipa). Reemplázala con la dirección real de tu empresa"
                          >
                            ⚠️ Por defecto (cambiar)
                          </span>
                        )}
                      </label>
                      <span className={styles.labelKey}>company_address</span>
                    </div>
                    <input
                      type="text"
                      className={`${styles.input} ${isWarnDefault("company_address") ? styles.inputDefaultWarn : ""}`}
                      value={config.company_address || ""}
                      onChange={(e) => handleFieldChange("company_address", e.target.value)}
                      placeholder="Ej. Av. Javier Prado Este 456, San Isidro"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Tono de Redacción
                        {isAtDefault("writing_tone") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
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
                      <label className={styles.label}>
                        Coordenadas GPS de la oficina (Lat / Lng)
                        {isWarnDefault("company_coords") && (
                          <span
                            className={styles.defaultBadgeWarn}
                            title="Coordenadas de ejemplo (Arequipa). Reemplázalas con la ubicación real de tu oficina"
                          >
                            ⚠️ Por defecto (cambiar)
                          </span>
                        )}
                      </label>
                      <span className={styles.labelKey}>company_coords</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Latitud (ej. -12.0463)"
                        value={coordsLat}
                        onChange={(e) => updateCoord(0, e.target.value)}
                        className={`${styles.input} ${isWarnDefault("company_coords") ? styles.inputDefaultWarn : ""}`}
                      />
                      <input
                        type="text"
                        placeholder="Longitud (ej. -77.0427)"
                        value={coordsLng}
                        onChange={(e) => updateCoord(1, e.target.value)}
                        className={`${styles.input} ${isWarnDefault("company_coords") ? styles.inputDefaultWarn : ""}`}
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

                {/* Modificadores de Saludo y Dirección */}
                <div className={styles.fieldsGrid} style={{ marginTop: 20 }}>
                  {[
                    {
                      key: "prioritary_greeting",
                      label: "Saludo Prioritario",
                      desc: "Forzar envío del saludo del bot incluso si el usuario inicia con una consulta puntual",
                    },
                    {
                      key: "mention_zone_in_greeting",
                      label: "Mencionar Zona principal en Saludo",
                      desc: "Mencionar una zona geográfica principal durante el saludo inicial (ej. Tenemos proyectos en Lima)",
                    },
                    {
                      key: "mention_region_in_address",
                      label: "Mencionar Departamento/Región en Dirección",
                      desc: "Mencionar el departamento o región al indicar la dirección de los proyectos (ej. Juliaca, Puno)",
                    },
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

                {/* Panel de Saludo Personalizado (enable_custom_greeting) */}
                <div style={{ marginTop: 24 }}>
                  <div
                    onClick={() => handleToggle("enable_custom_greeting")}
                    className={`${styles.toggleCard} ${
                      config.enable_custom_greeting ? styles.toggleCardActive : ""
                    }`}
                    style={{ padding: "16px 20px" }}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel} style={{ fontSize: "0.95rem" }}>
                        Habilitar Saludo Personalizado
                      </span>
                      <span className={styles.toggleDesc}>
                        Reemplaza el saludo estándar de Zefiron por un mensaje estructurado con texto, imagen o botones interactivos de propósito.
                      </span>
                      <span className={styles.labelKey}>enable_custom_greeting</span>
                    </div>
                    <div
                      className={`${styles.switch} ${
                        config.enable_custom_greeting ? styles.switchChecked : ""
                      }`}
                    >
                      <div className={styles.switchKnob} />
                    </div>
                  </div>

                  {config.enable_custom_greeting && (
                    <div className={styles.recontactCard} style={{ marginTop: 12 }}>
                      <div className={styles.recontactCardHeader}>
                        <span className={styles.stepBadge}>Mensaje de Saludo Personalizado</span>
                        <span className={styles.labelKey}>custom_greeting</span>
                      </div>

                      <div className={styles.recontactCardBody}>
                        <div className={styles.formGroup}>
                          <div className={styles.labelWrapper}>
                            <label className={styles.label}>Texto del Saludo</label>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {greetingConfig.message.length} caracteres
                            </span>
                          </div>
                          <textarea
                            className={styles.textarea}
                            rows={3}
                            placeholder="Ej: ¡Hola! Te damos la bienvenida a Inmobiliaria Panorama. ¿En qué podemos ayudarte hoy?"
                            value={greetingConfig.message}
                            onChange={(e) => handleUpdateGreeting({ message: e.target.value })}
                          />
                        </div>

                        {/* Opciones de Saludo */}
                        <div className={styles.formGroup}>
                          <div className={styles.labelWrapper}>
                            <label className={styles.label}>Opciones Rápidas en el Saludo</label>
                            <span className={styles.labelKey}>options</span>
                          </div>
                          <select
                            className={styles.select}
                            value={greetingConfig.options || ""}
                            onChange={(e) =>
                              handleUpdateGreeting({
                                options: (e.target.value as "BUY_PURPOSE") || undefined,
                              })
                            }
                          >
                            <option value="">Sin opciones rápidas (Texto estándar)</option>
                            <option value="BUY_PURPOSE">
                              Opciones de Propósito de Compra (Vivir / Invertir)
                            </option>
                          </select>
                          <span className={styles.helpText}>
                            Si se activa &quot;BUY_PURPOSE&quot;, el bot adjuntará botones de respuesta rápida para saber si el lead busca vivienda o inversión.
                          </span>
                        </div>

                        {/* Imagen de Saludo */}
                        <div className={styles.mediaSection}>
                          <div className={styles.labelWrapper}>
                            <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ImageIcon size={14} color="var(--brand-primary)" />
                              Imagen del Saludo (Opcional)
                            </label>
                            <span className={styles.labelKey}>picture</span>
                          </div>

                          <div className={styles.formGroup}>
                            <input
                              type="url"
                              className={styles.input}
                              placeholder="https://i.ibb.co/ejemplo/saludo.jpg"
                              value={greetingConfig.picture || ""}
                              onChange={(e) => handleUpdateGreeting({ picture: e.target.value })}
                            />
                          </div>

                          {/* Sugerencias de hosting para imágenes */}
                          <div className={styles.mediaSuggestionsBox}>
                            <div className={styles.mediaSuggestionsTitle}>
                              <Link2 size={14} color="var(--brand-primary)" />
                              <span>¿Dónde subir tu imagen para obtener un enlace público directo?</span>
                            </div>

                            <div className={styles.hostLinkList}>
                              <a
                                href="https://imgbb.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.hostLinkPill}
                              >
                                ImgBB (Gratis, copia el &quot;Enlace directo&quot;)
                                <ExternalLink size={11} />
                              </a>
                              <a
                                href="https://postimages.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.hostLinkPill}
                              >
                                Postimages (Sin registro)
                                <ExternalLink size={11} />
                              </a>
                              <a
                                href="https://cloudinary.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.hostLinkPill}
                              >
                                Cloudinary (CDN profesional)
                                <ExternalLink size={11} />
                              </a>
                            </div>

                            <span className={styles.mediaSuggestionsNote}>
                              💡 <strong>Importante:</strong> El enlace debe terminar en <code>.jpg</code> o <code>.png</code> y ser de acceso público.
                            </span>
                          </div>

                          {/* Vista previa de imagen */}
                          {greetingConfig.picture && (
                            <div className={styles.mediaPreviewBox}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={greetingConfig.picture}
                                alt="Preview Saludo"
                                className={styles.mediaPreviewImg}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Vista previa de la imagen que se enviará con el saludo
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <label className={styles.label}>
                        Política de Precios Unitarios
                        {isAtDefault("price_policy") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>price_policy</span>
                    </div>
                    <select
                      className={styles.select}
                      value={config.price_policy || "NONE"}
                      onChange={(e) => handleFieldChange("price_policy", e.target.value)}
                    >
                      <option value="NONE">No Revelar Precios (NONE)</option>
                      <option value="RANGE">Mostrar Rango de Precio (RANGE)</option>
                      <option value="EXACT">Mostrar Precio Exacto (EXACT)</option>
                      <option value="STARTING_FROM">Mostrar Precio desde (STARTING_FROM)</option>
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
                    { key: "offers_principal_zones", label: "Mencionar ubicaciones principales en el saludo", desc: "Mencionar las ubicaciones principales de los proyectos (departamentos) al saludar al lead. Por ejemplo: Tenemos proyectos en Arequipa, Lima" },
                    { key: "include_brochure_in_info", label: "Incluir Brochure Automático", desc: "Incluir brochure en el resumen de info del proyecto" },
                    { key: "simplify_info_message", label: "Simplificar Mensaje de Información", desc: "Generar respuestas más directas y concisas al resumir detalles para no abrumar al usuario" },
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
                    <div className={`${styles.formGroup} ${!isBudgetEnabled ? styles.formGroupDisabled : ""}`}>
                      <div className={styles.labelWrapper}>
                        <label className={styles.label}>
                          Modo de Presupuesto
                          {isAtDefault("budget_mode") && (
                            <span className={styles.defaultBadge}>Por defecto</span>
                          )}
                          {!isBudgetEnabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                        </label>
                        <span className={styles.labelKey}>budget_mode</span>
                      </div>
                      <select
                        className={styles.select}
                        disabled={!isBudgetEnabled}
                        value={config.budget_mode || "TEXT"}
                        onChange={(e) => handleFieldChange("budget_mode", e.target.value)}
                      >
                        <option value="TEXT">Preguntar el presupuesto directamente (TEXT)</option>
                        <option value="RANGE">Mostrar opciones de rangos (RANGE)</option>
                      </select>
                      {!isBudgetEnabled && (
                        <span className={styles.helpText} style={{ color: "var(--text-muted)" }}>
                          Desactivado: requiere activar &quot;Módulo de Presupuesto&quot; (enable_budget).
                        </span>
                      )}
                    </div>
                </div>

                <div className={styles.fieldsGrid}>
                  {[
                    {
                      key: "enable_name_completed",
                      label: "Exigir Nombre Completo",
                      desc: "Pedir nombres y apellidos completos del lead",
                    },
                    {
                      key: "asks_name_from_the_beggining",
                      label: "Pedir Nombre al Inicio",
                      desc: "Solicitar el nombre del cliente en el saludo inicial",
                    },
                    {
                      key: "asks_name_from_the_beggining_formal",
                      label: "Pedir Nombre Formalmente al Inicio",
                      desc: "Solicitar el nombre con tono de mayor cortesía y formalidad en el primer mensaje",
                      requires: "asks_name_from_the_beggining",
                    },
                    {
                      key: "enable_budget",
                      label: "Módulo de Presupuesto",
                      desc: "Habilitar la gestión de rangos de presupuesto",
                    },
                    {
                      key: "ask_budget",
                      label: "Preguntar Presupuesto",
                      desc: "Consultar explícitamente cuánto planea invertir",
                      requires: "enable_budget",
                    },
                    {
                      key: "asks_about_purpose",
                      label: "Preguntar Propósito",
                      desc: "Consultar si busca la propiedad para vivir o como inversión",
                    },
                    {
                      key: "ask_about_purpose_inline",
                      label: "Preguntar Propósito en la Misma Línea",
                      desc: "Preguntar el propósito de compra integrado en el mismo mensaje de manera directa",
                      requires: "asks_about_purpose",
                    },
                    {
                      key: "asks_buy_method_intent",
                      label: "Preguntar Método de Compra",
                      desc: "Consultar si planea comprar al contado o mediante crédito hipotecario",
                    },
                    {
                      key: "asks_investment_time",
                      label: "Horizonte de Inversión",
                      desc: "Preguntar la fecha estimada en la que planea concretar la compra",
                    },
                    {
                      key: "fast_financing_derivation",
                      label: "Derivación Rápida por Financiamiento",
                      desc: "Derivar de inmediato al asesor si el lead consulta por financiamiento",
                      requires: "gives_financing",
                    },
                  ].map((item) => {
                    let isItemDisabled = false;
                    let disabledReason = "";
                    if (item.requires === "enable_budget" && !isBudgetEnabled) {
                      isItemDisabled = true;
                      disabledReason = "Requiere activar Módulo de Presupuesto (enable_budget)";
                    } else if (item.requires === "asks_about_purpose" && !config.asks_about_purpose) {
                      isItemDisabled = true;
                      disabledReason = "Requiere activar Preguntar Propósito (asks_about_purpose)";
                    } else if (item.requires === "asks_name_from_the_beggining" && !config.asks_name_from_the_beggining) {
                      isItemDisabled = true;
                      disabledReason = "Requiere activar Pedir Nombre al Inicio (asks_name_from_the_beggining)";
                    } else if (item.requires === "gives_financing" && !config.gives_financing) {
                      isItemDisabled = true;
                      disabledReason = "Requiere activar Informar Financiamiento (gives_financing) en Información Revelable";
                    }

                    const isActive = isItemDisabled ? false : Boolean(config[item.key as keyof TenantConfiguration]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (isItemDisabled) return;
                          handleToggle(item.key as keyof TenantConfiguration);
                        }}
                        className={`${styles.toggleCard} ${
                          isActive ? styles.toggleCardActive : ""
                        } ${isItemDisabled ? styles.toggleCardDisabled : ""}`}
                        title={disabledReason}
                      >
                        <div className={styles.toggleInfo}>
                          <span className={styles.toggleLabel}>
                            {item.label}
                            {isItemDisabled && (
                              <span className={styles.disabledBadge}>Bloqueado</span>
                            )}
                          </span>
                          <span className={styles.toggleDesc}>
                            {isItemDisabled ? `Deshabilitado: ${disabledReason}` : item.desc}
                          </span>
                          <span className={styles.labelKey}>{item.key}</span>
                        </div>
                        <div
                          className={`${styles.switch} ${
                            isActive ? styles.switchChecked : ""
                          }`}
                        >
                          <div className={styles.switchKnob} />
                        </div>
                      </div>
                    );
                  })}
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

                {/* Switch Maestro: enable_module_visit */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    onClick={() => handleToggle("enable_module_visit")}
                    className={`${styles.toggleCard} ${
                      isVisitEnabled ? styles.toggleCardActive : ""
                    }`}
                    style={{ padding: "16px 20px" }}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel} style={{ fontSize: "0.95rem" }}>
                        Habilitar Módulo de Visitas
                      </span>
                      <span className={styles.toggleDesc}>
                        Permite coordinar citas dentro del chat. Si se desactiva, todas las opciones de agendamiento y visitas quedarán bloqueadas.
                      </span>
                      <span className={styles.labelKey}>enable_module_visit</span>
                    </div>
                    <div
                      className={`${styles.switch} ${
                        isVisitEnabled ? styles.switchChecked : ""
                      }`}
                    >
                      <div className={styles.switchKnob} />
                    </div>
                  </div>
                </div>

                {!isVisitEnabled && (
                  <div className={styles.disabledNotice}>
                    <AlertCircle size={18} color="var(--text-muted)" style={{ minWidth: 18 }} />
                    <span>
                      El <strong>Módulo de Visitas</strong> está desactivado. Todas las opciones de agendamiento, calendarios, actividades y mensajes a continuación se encuentran deshabilitadas.
                    </span>
                  </div>
                )}

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div className={`${styles.formGroup} ${!isVisitEnabled ? styles.formGroupDisabled : ""}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Días desde los que se agendará
                        {isAtDefault("days_available_visit") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                        {!isVisitEnabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                      </label>
                      <span className={styles.labelKey}>days_available_visit</span>
                    </div>
                    <input
                      type="number"
                      disabled={!isVisitEnabled}
                      className={styles.input}
                      value={config.days_available_visit ?? 0}
                      onChange={(e) => handleFieldChange("days_available_visit", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>Si es 0, el agente agendará desde el mismo dia hacia adelante. Si es 1, agendará desde el día siguiente para adelante.</span>
                  </div>

                  <div className={`${styles.formGroup} ${!isVisitEnabled ? styles.formGroupDisabled : ""}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Horario de Atención (Inicio / Fin)
                        {isAtDefault("range_available_visit") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                        {!isVisitEnabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                      </label>
                      <span className={styles.labelKey}>range_available_visit</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        type="time"
                        disabled={!isVisitEnabled}
                        value={visitStart}
                        onChange={(e) => updateVisitRange("start", e.target.value)}
                        className={styles.input}
                      />
                      <input
                        type="time"
                        disabled={!isVisitEnabled}
                        value={visitEnd}
                        onChange={(e) => updateVisitRange("end", e.target.value)}
                        className={styles.input}
                      />
                    </div>
                    <span className={styles.helpText}>El agente solo podrá agendar citas en este rango de horario, dependiendo también del calendario de Zefiron.</span>
                  </div>

                  <div className={`${styles.formGroup} ${!isVisitEnabled ? styles.formGroupDisabled : ""}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Duración de la Cita (Minutos)
                        {isAtDefault("appointment_duration") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                        {!isVisitEnabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                      </label>
                      <span className={styles.labelKey}>appointment_duration</span>
                    </div>
                    <input
                      type="number"
                      disabled={!isVisitEnabled}
                      className={styles.input}
                      value={config.appointment_duration ?? 60}
                      onChange={(e) => handleFieldChange("appointment_duration", Number(e.target.value))}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${!isVisitEnabled ? styles.formGroupDisabled : ""}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Modo de Selección de Fecha
                        {isAtDefault("seleccion_mode_date") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                        {!isVisitEnabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                      </label>
                      <span className={styles.labelKey}>seleccion_mode_date</span>
                    </div>
                    <select
                      className={styles.select}
                      disabled={!isVisitEnabled}
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
                    { key: "chooses_activity", label: "Elegir Tipo de Actividad", desc: "Permitir al usuario seleccionar tipo de cita de un conjunto de actividades personalizadas a definir más adelante" },
                  ].map((item) => {
                    const isItemDisabled = !isVisitEnabled;
                    const isActive = isItemDisabled ? false : Boolean(config[item.key as keyof TenantConfiguration]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (isItemDisabled) return;
                          handleToggle(item.key as keyof TenantConfiguration);
                        }}
                        className={`${styles.toggleCard} ${
                          isActive ? styles.toggleCardActive : ""
                        } ${isItemDisabled ? styles.toggleCardDisabled : ""}`}
                        title={isItemDisabled ? "Requiere habilitar el Módulo de Visitas (enable_module_visit)" : ""}
                      >
                        <div className={styles.toggleInfo}>
                          <span className={styles.toggleLabel}>
                            {item.label}
                            {isItemDisabled && <span className={styles.disabledBadge}>Bloqueado</span>}
                          </span>
                          <span className={styles.toggleDesc}>
                            {isItemDisabled
                              ? "Deshabilitado porque el Módulo de Visitas está inactivo"
                              : item.desc}
                          </span>
                          <span className={styles.labelKey}>{item.key}</span>
                        </div>
                        <div
                          className={`${styles.switch} ${
                            isActive ? styles.switchChecked : ""
                          }`}
                        >
                          <div className={styles.switchKnob} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`${styles.formGroup} ${(!isVisitEnabled || !config.chooses_activity) ? styles.formGroupDisabled : ""}`} style={{ marginBottom: 20 }}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label}>
                      Actividades Personalizadas de Cita
                      {(!isVisitEnabled || !config.chooses_activity) && (
                        <span className={styles.disabledBadge}>Bloqueado</span>
                      )}
                    </label>
                    <span className={styles.labelKey}>custom_activities</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Nueva actividad (ej. Visita a departamento piloto)"
                      disabled={!isVisitEnabled || !config.chooses_activity}
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
                      disabled={!isVisitEnabled || !config.chooses_activity}
                      onClick={addActivity}
                      className={styles.viewModeBtn}
                      style={{ background: "var(--brand-surface)", color: "var(--brand-primary)" }}
                    >
                      <Plus size={16} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <span className={styles.helpText}>
                    Actividades personalizadas a ofrecer al usuario en caso se habilite la opción de &quot;Elegir Tipo de Actividad&quot; (chooses_activity).
                    {!isVisitEnabled && " (Desactivado: Módulo de Visitas inactivo)"}
                    {isVisitEnabled && !config.chooses_activity && " (Desactivado: activa 'Elegir Tipo de Actividad' para habilitar)"}
                  </span>
                  <div className={styles.tagsContainer}>
                    {(config.custom_activities || []).map((act, idx) => (
                      <span key={idx} className={styles.tagPill}>
                        {act}
                        <button
                          type="button"
                          disabled={!isVisitEnabled || !config.chooses_activity}
                          onClick={() => removeActivity(idx)}
                          className={styles.tagRemoveBtn}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
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
                    Ventanas de tiempo de memoria del bot, intervalos de recontacto y mensajes enriquecidos con botones y multimedia.
                  </p>
                </div>

                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Ventana de Sesión (segundos)
                        {isAtDefault("user_session_window") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>user_session_window</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.user_session_window ?? 1800}
                      onChange={(e) => handleFieldChange("user_session_window", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>
                      Tiempo en segundos para que el bot envíe el lead a Zefiron si no le contestan. Se reinicia cuando responden.
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Refresco de Información (Horas)
                        {isAtDefault("info_refresh_time") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>info_refresh_time</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.info_refresh_time ?? 1}
                      onChange={(e) => handleFieldChange("info_refresh_time", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>
                      Tiempo en horas para que el bot actualice su biblioteca de proyectos desde Zefiron.
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Horas antes de Recontactar (Base)
                        {isAtDefault("recontact_hours") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>recontact_hours</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.recontact_hours ?? 5}
                      onChange={(e) => handleFieldChange("recontact_hours", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>
                      Tiempo por defecto entre recontactos cuando no se usan tiempos personalizados.
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Máximo de Recontactos
                        {isAtDefault("recontact_times") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>recontact_times</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.recontact_times ?? (recontactList.length || 3)}
                      onChange={(e) => handleFieldChange("recontact_times", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>
                      Número de recontactos a enviar (0 desactiva el recontacto automático).
                    </span>
                  </div>
                </div>

                {/* Toggles de Recontacto y Sesión */}
                <div className={styles.fieldsGrid} style={{ marginBottom: 20 }}>
                  <div
                    className={`${styles.toggleCard} ${config.custom_recontact_delays ? styles.toggleCardActive : ""}`}
                    onClick={() => handleToggle("custom_recontact_delays")}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Tiempos de Espera Independientes</span>
                      <span className={styles.toggleDesc}>
                        Configurar horas de espera individuales para cada recontacto en lugar de un intervalo fijo.
                      </span>
                      <span className={styles.labelKey}>custom_recontact_delays</span>
                    </div>
                    <div className={`${styles.switch} ${config.custom_recontact_delays ? styles.switchChecked : ""}`}>
                      <div className={styles.switchKnob} />
                    </div>
                  </div>

                  <div
                    className={`${styles.toggleCard} ${config.session_window_closing_message ? styles.toggleCardActive : ""}`}
                    onClick={() => handleToggle("session_window_closing_message")}
                  >
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Aviso de Cierre de Sesión</span>
                      <span className={styles.toggleDesc}>
                        Enviar mensaje de notificación/despedida al lead cuando expire la ventana de conversación activa.
                      </span>
                      <span className={styles.labelKey}>session_window_closing_message</span>
                    </div>
                    <div className={`${styles.switch} ${config.session_window_closing_message ? styles.switchChecked : ""}`}>
                      <div className={styles.switchKnob} />
                    </div>
                  </div>
                </div>

                {/* Resumen de la Ventana de 24h de WhatsApp */}
                {recontactList.length > 0 && (
                  <div
                    className={`${styles.windowSummaryCard} ${
                      isOver24Hours ? styles.windowSummaryCardWarn : styles.windowSummaryCardSafe
                    }`}
                    style={{ marginBottom: 20 }}
                  >
                    <div className={styles.windowSummaryHeader}>
                      <div className={styles.windowSummaryTitle}>
                        {isOver24Hours ? (
                          <AlertTriangle size={18} color="#d97706" />
                        ) : (
                          <CheckCircle2 size={18} color="#059669" />
                        )}
                        <span>
                          Ventana de WhatsApp: <strong>{totalRecontactHours}h</strong> acumuladas / <strong>24h</strong> máximo recomendado
                        </span>
                      </div>
                      <span
                        className={styles.stepBadge}
                        style={{
                          background: isOver24Hours ? "#d97706" : "#059669",
                        }}
                      >
                        {recontactList.length} {recontactList.length === 1 ? "recontacto" : "recontactos"}
                      </span>
                    </div>

                    <div className={styles.windowProgressBar}>
                      <div
                        className={styles.windowProgressFill}
                        style={{
                          width: `${progressPercent}%`,
                          background: isOver24Hours ? "#ef4444" : "#10b981",
                        }}
                      />
                    </div>

                    <p className={styles.windowSummaryHint}>
                      {isOver24Hours ? (
                        <>
                          ⚠️ <strong>Atención:</strong> El tiempo acumulado de los recontactos ({totalRecontactHours}h) supera la ventana estándar de 24 horas de WhatsApp. Recuerda que los mensajes posteriores a 24h requieren que el lead haya respondido previamente dentro de esa ventana para ser entregados.
                        </>
                      ) : (
                        <>
                          ✓ Todos los recontactos están programados dentro del margen de 24 horas permitido por la política de mensajería de WhatsApp.
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Lista de Mensajes de Recontacto */}
                <div className={styles.recontactContainer}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label} style={{ fontSize: "0.95rem" }}>
                      Mensajes de Recontacto Secuenciales
                    </label>
                    <span className={styles.labelKey}>recontact_messages</span>
                  </div>

                  {recontactList.length === 0 ? (
                    <div className={styles.disabledNotice} style={{ justifyContent: "space-between" }}>
                      <span>No hay mensajes de recontacto configurados. Zefiron usará el mensaje por defecto del sistema.</span>
                      <button
                        type="button"
                        onClick={handleAddRecontact}
                        className={styles.viewModeBtn}
                        style={{ background: "var(--brand-surface)", color: "var(--brand-primary)" }}
                      >
                        <Plus size={16} />
                        <span>Configurar Primer Recontacto</span>
                      </button>
                    </div>
                  ) : (
                    recontactList.map((msgItem, idx) => {
                      const options = (msgItem.options as OptionButton[]) || [];
                      return (
                        <div key={idx} className={styles.recontactCard}>
                          {/* Card Header */}
                          <div className={styles.recontactCardHeader}>
                            <div className={styles.recontactHeaderLeft}>
                              <span className={styles.stepBadge}>Paso #{idx + 1}</span>
                              {config.custom_recontact_delays ? (
                                <div className={styles.recontactDelayInputGroup}>
                                  <span>Espera:</span>
                                  <input
                                    type="number"
                                    min={0.1}
                                    step={0.5}
                                    value={msgItem.delay_hours ?? config.recontact_hours ?? 24}
                                    onChange={(e) =>
                                      handleUpdateRecontact(idx, {
                                        delay_hours: Number(e.target.value),
                                      })
                                    }
                                    className={styles.delayInput}
                                  />
                                  <span>horas tras el mensaje anterior</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                  Tiempo heredado: {config.recontact_hours ?? 24}h
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveRecontact(idx)}
                              className={styles.tagRemoveBtn}
                              title="Eliminar este recontacto"
                              style={{ padding: 4 }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Card Body */}
                          <div className={styles.recontactCardBody}>
                            {/* Mensaje de texto */}
                            <div className={styles.formGroup}>
                              <div className={styles.labelWrapper}>
                                <label className={styles.label}>Contenido del Mensaje</label>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  {msgItem.message.length} caracteres
                                </span>
                              </div>
                              <textarea
                                className={styles.textarea}
                                style={{ minHeight: 80 }}
                                placeholder="Ej: Hola! Noté que dejamos la conversación pendiente. ¿Pudiste revisar los detalles del proyecto o prefieres que agendemos una llamada?"
                                value={msgItem.message}
                                onChange={(e) =>
                                  handleUpdateRecontact(idx, { message: e.target.value })
                                }
                              />
                            </div>

                            {/* Adjunto Multimedia */}
                            <div className={styles.mediaSection}>
                              <div className={styles.labelWrapper}>
                                <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <ImageIcon size={14} color="var(--brand-primary)" />
                                  Adjunto Multimedia (Opcional)
                                </label>
                                <span className={styles.labelKey}>media_url / media_type</span>
                              </div>

                              {/* Selector de Tipo */}
                              <div className={styles.mediaTypeSelector}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecontact(idx, {
                                      media_type: undefined,
                                      media_url: "",
                                    })
                                  }
                                  className={`${styles.mediaTypeBtn} ${!msgItem.media_type ? styles.mediaTypeBtnActive : ""}`}
                                >
                                  Sin Multimedia
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRecontact(idx, { media_type: "image" })}
                                  className={`${styles.mediaTypeBtn} ${msgItem.media_type === "image" ? styles.mediaTypeBtnActive : ""}`}
                                >
                                  <ImageIcon size={14} />
                                  Imagen (JPG / PNG)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRecontact(idx, { media_type: "audio" })}
                                  className={`${styles.mediaTypeBtn} ${msgItem.media_type === "audio" ? styles.mediaTypeBtnActive : ""}`}
                                >
                                  <Mic size={14} />
                                  Audio / Nota de Voz (MP3)
                                </button>
                              </div>

                              {/* Input de URL si hay multimedia seleccionado */}
                              {msgItem.media_type && (
                                <>
                                  <div className={styles.formGroup}>
                                    <input
                                      type="url"
                                      className={styles.input}
                                      placeholder={
                                        msgItem.media_type === "image"
                                          ? "https://i.ibb.co/ejemplo/imagen.jpg"
                                          : "https://files.catbox.moe/ejemplo.mp3"
                                      }
                                      value={msgItem.media_url || ""}
                                      onChange={(e) =>
                                        handleUpdateRecontact(idx, { media_url: e.target.value })
                                      }
                                    />
                                  </div>

                                  {/* Caja de sugerencias de sitios gratuitos para subir multimedia */}
                                  <div className={styles.mediaSuggestionsBox}>
                                    <div className={styles.mediaSuggestionsTitle}>
                                      <Link2 size={14} color="var(--brand-primary)" />
                                      <span>¿Dónde subir tu archivo para obtener un enlace público directo?</span>
                                    </div>

                                    {msgItem.media_type === "image" ? (
                                      <div className={styles.hostLinkList}>
                                        <a
                                          href="https://imgbb.com"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.hostLinkPill}
                                        >
                                          ImgBB (Gratis, copia el &quot;Enlace directo&quot;)
                                          <ExternalLink size={11} />
                                        </a>
                                        <a
                                          href="https://postimages.org"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.hostLinkPill}
                                        >
                                          Postimages (Sin registro)
                                          <ExternalLink size={11} />
                                        </a>
                                        <a
                                          href="https://cloudinary.com"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.hostLinkPill}
                                        >
                                          Cloudinary (CDN profesional)
                                          <ExternalLink size={11} />
                                        </a>
                                      </div>
                                    ) : (
                                      <div className={styles.hostLinkList}>
                                        <a
                                          href="https://catbox.moe"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.hostLinkPill}
                                        >
                                          Catbox.moe (Sube MP3/OGG y da enlace directo)
                                          <ExternalLink size={11} />
                                        </a>
                                        <a
                                          href="https://vocaroo.com"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.hostLinkPill}
                                        >
                                          Vocaroo (Grabar o subir audio)
                                          <ExternalLink size={11} />
                                        </a>
                                      </div>
                                    )}

                                    <span className={styles.mediaSuggestionsNote}>
                                      💡 <strong>Importante:</strong> El enlace debe ser directo al archivo (debe terminar en <code>.jpg</code>, <code>.png</code>, <code>.mp3</code>, etc.) y tener acceso público sin requerir inicio de sesión ni páginas intermedias con publicidad o captchas.
                                    </span>
                                  </div>

                                  {/* Vista previa en vivo */}
                                  {msgItem.media_url && (
                                    <div className={styles.mediaPreviewBox}>
                                      {msgItem.media_type === "image" ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={msgItem.media_url}
                                          alt="Preview"
                                          className={styles.mediaPreviewImg}
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <audio controls src={msgItem.media_url} style={{ width: "100%", maxHeight: 40 }}>
                                          Tu navegador no soporta el reproductor de audio.
                                        </audio>
                                      )}
                                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                        Vista previa del archivo enlazado
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Botones Interactivos WhatsApp (Máx 3) */}
                            <div className={styles.buttonsSection}>
                              <div className={styles.buttonsHeader}>
                                <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <MessageSquare size={14} color="var(--brand-primary)" />
                                  Botones Interactivos de WhatsApp
                                </label>
                                <span
                                  className={styles.disabledBadge}
                                  style={{
                                    background: options.length >= 3 ? "var(--brand-surface)" : "var(--bg-muted)",
                                    color: options.length >= 3 ? "var(--brand-primary)" : "var(--text-secondary)",
                                  }}
                                >
                                  {options.length}/3 botones
                                </span>
                              </div>

                              <span className={styles.helpText}>
                                WhatsApp permite hasta 3 botones de respuesta rápida por mensaje. Al pulsarlos, el usuario enviará automáticamente el texto del botón.
                              </span>

                              {options.length > 0 && (
                                <div className={styles.buttonsList}>
                                  {options.map((opt, optIdx) => (
                                    <div key={optIdx} className={styles.buttonRow}>
                                      <input
                                        type="text"
                                        maxLength={20}
                                        placeholder="Texto del botón (máx 20 car.)"
                                        value={opt.label}
                                        onChange={(e) =>
                                          handleUpdateButton(idx, optIdx, "label", e.target.value)
                                        }
                                        className={`${styles.input} ${styles.buttonInput}`}
                                      />
                                      <input
                                        type="text"
                                        placeholder="ID (ej: opt_agendar)"
                                        value={opt.id}
                                        onChange={(e) =>
                                          handleUpdateButton(idx, optIdx, "id", e.target.value)
                                        }
                                        className={`${styles.input} ${styles.buttonIdInput}`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveButton(idx, optIdx)}
                                        className={styles.tagRemoveBtn}
                                        title="Eliminar botón"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAddButton(idx)}
                                disabled={options.length >= 3}
                                className={styles.addButtonBtn}
                              >
                                <Plus size={14} />
                                <span>{options.length >= 3 ? "Máximo 3 botones permitidos" : "Agregar Botón"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {recontactList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddRecontact}
                      className={styles.addRecontactStepBtn}
                    >
                      <Plus size={16} />
                      <span>Agregar Siguiente Recontacto (Paso #{recontactList.length + 1})</span>
                    </button>
                  )}
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
                      <label className={styles.label}>
                        Timeout Bloqueo Corto (Horas)
                        {isAtDefault("blacklist_short_timeout") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>blacklist_short_timeout</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.blacklist_short_timeout ?? 6}
                      onChange={(e) => handleFieldChange("blacklist_short_timeout", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>Tiempo en horas para que el usuario pueda volver a interactuar con el bot después de un bloqueo corto</span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Timeout Bloqueo Largo (Horas)
                        {isAtDefault("blacklist_large_timeout") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>blacklist_large_timeout</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.blacklist_large_timeout ?? 24}
                      onChange={(e) => handleFieldChange("blacklist_large_timeout", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>Tiempo en horas para que el usuario pueda volver a interactuar con el bot después de un bloqueo largo</span>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label}>
                      Frases y Términos a Evitar
                      {phrasesToAvoidList.length > 0 && (
                        <span
                          className={styles.disabledBadge}
                          style={{
                            background: "var(--brand-surface)",
                            color: "var(--brand-primary)",
                            borderColor: "var(--brand-border)",
                          }}
                        >
                          {phrasesToAvoidList.length} {phrasesToAvoidList.length === 1 ? "término" : "términos"}
                        </span>
                      )}
                    </label>
                    <span className={styles.labelKey}>phrases_to_avoid</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Nueva frase o término (ej. estafa, fraude, no autorizado)"
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPhrase();
                        }
                      }}
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={addPhrase}
                      className={styles.viewModeBtn}
                      style={{ background: "var(--brand-surface)", color: "var(--brand-primary)" }}
                    >
                      <Plus size={16} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <span className={styles.helpText}>
                    Palabras o frases que el bot debe evadir o no mencionar jamás. Puedes escribir una o pegar varias separadas por coma y presionar Enter.
                  </span>
                  <div className={styles.tagsContainer}>
                    {phrasesToAvoidList.length === 0 ? (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 4 }}>
                        No hay frases añadidas. Escribe un término arriba y haz clic en Agregar.
                      </span>
                    ) : (
                      phrasesToAvoidList.map((phrase, idx) => (
                        <span key={idx} className={styles.tagPill}>
                          {phrase}
                          <button
                            type="button"
                            onClick={() => removePhrase(idx)}
                            className={styles.tagRemoveBtn}
                            title="Eliminar término"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
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
                  <div className={`${styles.formGroup} ${isChoosesActivityActive ? styles.formGroupDisabled : ""}`}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Actividad Principal de Derivación
                        {isChoosesActivityActive && (
                          <span className={styles.disabledBadge}>Bloqueado</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_main_activity</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      disabled={isChoosesActivityActive}
                      value={config.fallback_main_activity || ""}
                      onChange={(e) => handleFieldChange("fallback_main_activity", e.target.value)}
                      placeholder="Ej. Contacto Asesor Comercial"
                    />
                    {isChoosesActivityActive ? (
                      <span className={styles.helpText}>
                        ⚠️ Desactivado por dependencia inversa: &quot;Elegir Tipo de Actividad&quot; (chooses_activity) está habilitado en Agendamiento, por lo que el usuario seleccionará la actividad directamente.
                      </span>
                    ) : (
                      <span className={styles.helpText}>
                        Actividad que se asignará automáticamente en Zefiron cuando el bot derive el lead.
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Actividad Urgente de Fallback
                        {isAtDefault("fallback_urgent_activity") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_urgent_activity</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_activity || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_activity", e.target.value)}
                      placeholder="Llamada emergencia (IA)"
                    />
                    <span className={styles.helpText}>
                      Actividad auxiliar para indicar cuando el lead este frustrado, y/o haya ocurrido algún problema
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Tag Urgencia Agendamiento
                        {isAtDefault("fallback_urgent_tag_schedule") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_urgent_tag_schedule</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_schedule || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_schedule", e.target.value)}
                      placeholder="SIN HORARIOS (IA)"
                    />
                    <span className={styles.helpText}>
                      Tag que se añadirá al lead automáticamente cuando el Agente de IA intente agendar una cita pero Zefiron no tenga horarios configurados
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Tag Usuario Frustrado
                        {isAtDefault("fallback_urgent_tag_frustrated") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_urgent_tag_frustrated</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_frustrated || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_frustrated", e.target.value)}
                      placeholder="Solicita Humano (IA)"
                    />
                    <span className={styles.helpText}>
                      Tag que se añadirá al lead automáticamente cuando el usuario esté frustrado o molesto en la conversación
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Tag Error de Sistema
                        {isAtDefault("fallback_urgent_tag_error") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_urgent_tag_error</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_urgent_tag_error || ""}
                      onChange={(e) => handleFieldChange("fallback_urgent_tag_error", e.target.value)}
                      placeholder="Urgente (IA)"
                    />
                    <span className={styles.helpText}>
                      Tag que se añadirá al lead automáticamente cuando el sistema de Agente de IA sufra algún error (conexión, servidor, etc.). Es poco común
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Tag CTWA Interés en Otro Proyecto
                        {isAtDefault("fallback_ctwa_changed_project_tag") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_ctwa_changed_project_tag</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.fallback_ctwa_changed_project_tag || ""}
                      onChange={(e) => handleFieldChange("fallback_ctwa_changed_project_tag", e.target.value)}
                      placeholder="Posible interés en otro proyecto"
                    />
                    <span className={styles.helpText}>
                      Tag asignado en Zefiron si el lead ingresó por un anuncio Click to WhatsApp (CTWA) de un proyecto pero muestra interés por otro distinto.
                    </span>
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>Mensaje Personalizado de Derivación</label>
                      <span className={styles.labelKey}>custom_handoff_message</span>
                    </div>
                    <textarea
                      className={styles.textarea}
                      style={{ minHeight: 70 }}
                      value={config.custom_handoff_message || ""}
                      onChange={(e) => handleFieldChange("custom_handoff_message", e.target.value)}
                      placeholder="Ej: Te comunicaré con uno de nuestros asesores para brindarte una atención personalizada..."
                    />
                    <span className={styles.helpText}>
                      Mensaje opcional que el bot enviará al usuario al momento de transferir el lead a un asesor humano.
                    </span>
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
                      <label className={styles.label}>
                        Modelo LLM Inteligente
                        {isAtDefault("model_smart_llm") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
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
                      <label className={styles.label}>
                        Modelo LLM Rápido
                        {isAtDefault("model_fast_llm") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
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
                      <label className={styles.label}>
                        Email Jefe Comercial
                        {isWarnDefault("email_jefe_comercial") && (
                          <span
                            className={styles.defaultBadgeWarn}
                            title="Correo de ejemplo de desarrollo. Reemplázalo con el correo del jefe comercial de la empresa"
                          >
                            ⚠️ Por defecto (cambiar)
                          </span>
                        )}
                      </label>
                      <span className={styles.labelKey}>email_jefe_comercial</span>
                    </div>
                    <input
                      type="email"
                      className={`${styles.input} ${isWarnDefault("email_jefe_comercial") ? styles.inputDefaultWarn : ""}`}
                      value={config.email_jefe_comercial || ""}
                      onChange={(e) => handleFieldChange("email_jefe_comercial", e.target.value)}
                      placeholder="jefe.comercial@empresa.com"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Agente Humano de Fallback
                        {isWarnDefault("fallback_agent") && (
                          <span
                            className={styles.defaultBadgeWarn}
                            title="UUID de agente de ejemplo del demo. Debe cambiarse por el ID del asesor real en Zefiron"
                          >
                            ⚠️ Por defecto (cambiar)
                          </span>
                        )}
                      </label>
                      <span className={styles.labelKey}>fallback_agent</span>
                    </div>
                    <input
                      type="text"
                      className={`${styles.input} ${isWarnDefault("fallback_agent") ? styles.inputDefaultWarn : ""}`}
                      value={config.fallback_agent || ""}
                      onChange={(e) => handleFieldChange("fallback_agent", e.target.value)}
                      placeholder="Ej. asesor_central"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Flood: Máx Mensajes
                        {isAtDefault("flood_max_messages") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>flood_max_messages</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.flood_max_messages ?? 5}
                      onChange={(e) => handleFieldChange("flood_max_messages", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Flood: Ventana (Segundos)
                        {isAtDefault("flood_window_seconds") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>flood_window_seconds</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.flood_window_seconds ?? 10}
                      onChange={(e) => handleFieldChange("flood_window_seconds", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Flood: Cooldown (Segundos)
                        {isAtDefault("flood_cooldown_seconds") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
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
                      <label className={styles.label}>
                        Tokens por Respuesta
                        {isAtDefault("toker_per_response") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>toker_per_response</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.toker_per_response ?? 150}
                      onChange={(e) => handleFieldChange("toker_per_response", Number(e.target.value))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelWrapper}>
                      <label className={styles.label}>
                        Frecuencia Chequeo Recontactos (Minutos)
                        {isAtDefault("recontact_check_minutes") && (
                          <span className={styles.defaultBadge}>Por defecto</span>
                        )}
                      </label>
                      <span className={styles.labelKey}>recontact_check_minutes</span>
                    </div>
                    <input
                      type="number"
                      className={styles.input}
                      value={config.recontact_check_minutes ?? 1}
                      onChange={(e) => handleFieldChange("recontact_check_minutes", Number(e.target.value))}
                    />
                    <span className={styles.helpText}>
                      Intervalo en minutos para el background job que escanea y envía los recontactos pendientes.
                    </span>
                  </div>
                </div>

                {/* Scoring por Conteo de Mensajes */}
                <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                  <div className={styles.labelWrapper}>
                    <label className={styles.label} style={{ fontSize: "0.95rem" }}>
                      Puntaje por Conteo de Mensajes (Scoring de Interacción)
                      {isAtDefault("message_count_score") && (
                        <span className={styles.defaultBadge}>Por defecto</span>
                      )}
                    </label>
                    <span className={styles.labelKey}>message_count_score</span>
                  </div>
                  <span className={styles.helpText} style={{ marginBottom: 10, display: "block" }}>
                    Asigna puntos al lead cuando el total de mensajes en la conversación alcanza o supera un umbral.
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className={styles.formGroup}>
                      <div className={styles.labelWrapper}>
                        <label className={styles.label}>Umbral de Mensajes (threshold)</label>
                        <span className={styles.labelKey}>threshold</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        className={styles.input}
                        value={messageCountScore.threshold}
                        onChange={(e) =>
                          handleUpdateMessageCountScore({ threshold: Number(e.target.value) })
                        }
                        placeholder="Ej. 10"
                      />
                      <span className={styles.helpText}>Cantidad de mensajes requeridos</span>
                    </div>

                    <div className={styles.formGroup}>
                      <div className={styles.labelWrapper}>
                        <label className={styles.label}>Puntos Asignados (points)</label>
                        <span className={styles.labelKey}>points</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className={styles.input}
                        value={messageCountScore.points}
                        onChange={(e) =>
                          handleUpdateMessageCountScore({ points: Number(e.target.value) })
                        }
                        placeholder="Ej. 20"
                      />
                      <span className={styles.helpText}>Puntos a sumar en el lead scoring</span>
                    </div>
                  </div>
                </div>

                <div className={styles.fieldsGrid}>
                  {[
                    {
                      key: "accept_all_proyects",
                      label: "Aceptar Todos los Proyectos",
                      desc: "Permite atender leads independientemente de si el proyecto está configurado en la lista local",
                    },
                    {
                      key: "inyects_agent_name_in_following_message",
                      label: "Inyectar Nombre del Asesor en Respuestas",
                      desc: "Incluye el nombre del asesor en los mensajes de seguimiento cuando el lead responde",
                    },
                    {
                      key: "send_closing_and_agent_notice_only_once",
                      label: "Enviar Cierre y Aviso de Asesor Solo Una Vez",
                      desc: "Evita repetir el mensaje de cierre y aviso de asesor en una misma conversación",
                      requires: "notice",
                    },
                    {
                      key: "message_personality_enable",
                      label: "Modulación de Personalidad",
                      desc: "Permite modulación dinámica del tono",
                    },
                    {
                      key: "enable_persist_leads_job",
                      label: "Job de Persistencia",
                      desc: "Sincronización en background de leads persistentes",
                    },
                    {
                      key: "ask_all_unities",
                      label: "Consultar Todas las Unidades",
                      desc: "Iterar sobre inventario total",
                    },
                  ].map((item) => {
                    const isItemDisabled = item.requires === "notice" && !isNoticeActive;
                    const isActive = isItemDisabled
                      ? false
                      : Boolean(
                          config[item.key as keyof TenantConfiguration] ??
                            (item.key === "accept_all_proyects" ? config.accept_all_projects : false)
                        );
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (isItemDisabled) return;
                          handleToggle(item.key as keyof TenantConfiguration);
                        }}
                        className={`${styles.toggleCard} ${
                          isActive ? styles.toggleCardActive : ""
                        } ${isItemDisabled ? styles.toggleCardDisabled : ""}`}
                        title={
                          isItemDisabled
                            ? "Requiere activar Aviso de Cierre de Sesión (Cat. 6) o Inyectar Asesor"
                            : ""
                        }
                      >
                        <div className={styles.toggleInfo}>
                          <span className={styles.toggleLabel}>
                            {item.label}
                            {isItemDisabled && (
                              <span className={styles.disabledBadge}>Bloqueado</span>
                            )}
                          </span>
                          <span className={styles.toggleDesc}>
                            {isItemDisabled
                              ? "Deshabilitado: requiere activar Aviso de Cierre de Sesión (Cat. 6) o Inyectar Asesor"
                              : item.desc}
                          </span>
                          <span className={styles.labelKey}>{item.key}</span>
                        </div>
                        <div
                          className={`${styles.switch} ${
                            isActive ? styles.switchChecked : ""
                          }`}
                        >
                          <div className={styles.switchKnob} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

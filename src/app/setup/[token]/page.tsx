"use client";

import React, { useState, useEffect, use } from "react";
import {
  Building2,
  Bot,
  Sliders,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Send,
  Globe,
  Radio,
} from "lucide-react";
import styles from "./setup.module.css";
import { WritingTone } from "@/models/TenantConfig";

interface SetupPageProps {
  params: Promise<{ token: string }>;
}

export default function SetupWizardPage({ params }: SetupPageProps) {
  const { token } = use(params);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    syncedDirectly: boolean;
    message: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: "",
    industry: "",
    description: "",
    website: "",
    contact_email: "",
    phone: "",
    chatbot_name: "Zefiron Bot",
    writing_tone: "friendly" as WritingTone,
    fallback_agent: "",
    welcome_message: "¡Hola! Bienvenido a nuestro canal de atención. ¿En qué podemos ayudarte hoy?",
    fallback_message: "Disculpa, no logré entender tu consulta. Un asesor humano te asistirá en breve.",
    enable_lead_capture: true,
    enable_booking: true,
    enable_human_escalation: true,
    enable_faq: true,
    business_hours_enabled: false,
    business_hours_schedule: "Lunes a Viernes 09:00 - 18:00",
    custom_rules: "",
    banned_topics: "",
    chatbot_url: "",
  });

  // Cargar datos iniciales del Tenant
  useEffect(() => {
    async function loadTenantData() {
      try {
        const res = await fetch(`/api/setup/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Token no encontrado");
        }

        const t = data.tenant;
        const cfg = t.configuration || {};
        const cp = cfg.company_profile || {};
        const bp = cfg.bot_persona || {};
        const rf = cfg.rules_features || {};

        setFormData((prev) => ({
          ...prev,
          company_name: cp.company_name || t.company_name || "",
          industry: cp.industry || "",
          description: cp.description || "",
          website: cp.website || "",
          contact_email: cp.contact_email || "",
          phone: cp.phone || "",
          chatbot_name: bp.chatbot_name || t.chatbot_name || "Zefiron Bot",
          writing_tone: bp.writing_tone || "friendly",
          fallback_agent: bp.fallback_agent || "",
          welcome_message: bp.welcome_message || prev.welcome_message,
          fallback_message: bp.fallback_message || prev.fallback_message,
          enable_lead_capture: rf.enable_lead_capture ?? true,
          enable_booking: rf.enable_booking ?? true,
          enable_human_escalation: rf.enable_human_escalation ?? true,
          enable_faq: rf.enable_faq ?? true,
          business_hours_enabled: rf.business_hours?.enabled ?? false,
          business_hours_schedule: rf.business_hours?.schedule || prev.business_hours_schedule,
          custom_rules: rf.custom_rules || "",
          banned_topics: rf.banned_topics || "",
          chatbot_url: t.chatbot_url || "",
        }));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setLoadError(err.message);
        } else {
          setLoadError("No fue posible cargar el enlace de configuración");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadTenantData();
    }
  }, [token]);

  const updateField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.company_name.trim()) {
      alert("Por favor ingresa el nombre de la empresa");
      return;
    }
    if (currentStep === 2 && !formData.chatbot_name.trim()) {
      alert("Por favor ingresa el nombre de tu chatbot");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        company_profile: {
          company_name: formData.company_name,
          industry: formData.industry,
          description: formData.description,
          website: formData.website,
          contact_email: formData.contact_email,
          phone: formData.phone,
        },
        bot_persona: {
          chatbot_name: formData.chatbot_name,
          fallback_agent: formData.fallback_agent,
          writing_tone: formData.writing_tone,
          language: "es",
          welcome_message: formData.welcome_message,
          fallback_message: formData.fallback_message,
        },
        rules_features: {
          enable_lead_capture: formData.enable_lead_capture,
          enable_booking: formData.enable_booking,
          enable_human_escalation: formData.enable_human_escalation,
          enable_faq: formData.enable_faq,
          business_hours: {
            enabled: formData.business_hours_enabled,
            schedule: formData.business_hours_schedule,
          },
          custom_rules: formData.custom_rules,
          banned_topics: formData.banned_topics,
        },
      };

      const res = await fetch(`/api/setup/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la configuración");
      }

      setSyncFeedback({
        syncedDirectly: data.syncedDirectly ?? false,
        message: data.message || "Configuración completada con éxito",
      });
      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al procesar el guardado");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.centerCard}>
          <div className={`${styles.iconCircle} ${styles.successCircle}`}>
            <Loader2 size={32} className="animate-spin" />
          </div>
          <h2 className={styles.statusTitle}>Validando acceso...</h2>
          <p className={styles.statusDesc}>
            Estamos cargando el portal de configuración exclusivo de tu asistente.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.centerCard}>
          <div className={`${styles.iconCircle} ${styles.errorCircle}`}>
            <ShieldAlert size={32} />
          </div>
          <h2 className={styles.statusTitle}>Enlace no disponible</h2>
          <p className={styles.statusDesc}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.centerCard}>
          <div className={`${styles.iconCircle} ${styles.successCircle}`}>
            <CheckCircle2 size={36} />
          </div>
          <h2 className={styles.statusTitle}>¡Configuración Guardada!</h2>
          <p className={styles.statusDesc}>
            Los datos para <strong>{formData.company_name}</strong> y el bot{" "}
            <strong>{formData.chatbot_name}</strong> han sido registrados correctamente.
          </p>

          <div className={styles.syncNotice}>
            <Radio size={20} />
            <span>{syncFeedback?.message}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brandBadge}>
            <Sparkles size={14} />
            <span>Zefiron Bot Provisioning</span>
          </div>
          <h1 className={styles.pageTitle}>Asistente de Configuración</h1>
          <p className={styles.pageSubtitle}>
            Define la identidad, tono de voz y reglas de atención de tu chatbot en 4 sencillos pasos.
          </p>
        </div>

        {/* Stepper */}
        <div className={styles.stepperContainer}>
          <div className={styles.stepper}>
            {[
              { num: 1, label: "Empresa", icon: Building2 },
              { num: 2, label: "Personalidad", icon: Bot },
              { num: 3, label: "Reglas", icon: Sliders },
              { num: 4, label: "Revisión", icon: CheckCircle2 },
            ].map((step, idx, arr) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isDone) setCurrentStep(step.num);
                    }}
                    className={`${styles.stepItem} ${isActive ? styles.stepActive : ""} ${
                      isDone ? styles.stepCompleted : ""
                    }`}
                  >
                    <div className={styles.stepNumber}>
                      {isDone ? <CheckCircle2 size={16} /> : step.num}
                    </div>
                    <span className={styles.stepLabel}>{step.label}</span>
                  </button>
                  {idx < arr.length - 1 && (
                    <div
                      className={`${styles.stepDivider} ${isDone ? styles.dividerActive : ""}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content Card */}
        <div className={styles.contentCard}>
          {/* PASO 1: Perfil de Empresa */}
          {currentStep === 1 && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Paso 1: Perfil de la Empresa</h2>
                <p className={styles.sectionDesc}>
                  Información clave del negocio que tu chatbot utilizará para contextualizar a los clientes.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Nombre Comercial de la Empresa <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Inmobiliaria Zefiron"
                    value={formData.company_name}
                    onChange={(e) => updateField("company_name", e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Rubro o Industria</label>
                  <input
                    type="text"
                    placeholder="Ej. Bienes Raíces, Retail, Servicios..."
                    value={formData.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Descripción de la Empresa y Propuesta de Valor</label>
                  <textarea
                    placeholder="Describe a qué se dedica la empresa, proyectos principales o servicios ofrecidos..."
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Sitio Web Oficial</label>
                  <input
                    type="url"
                    placeholder="https://empresa.com"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Correo de Contacto / Soporte</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Teléfono de Atención</label>
                  <input
                    type="tel"
                    placeholder="+51 999 888 777"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Personalidad y Tono del Bot */}
          {currentStep === 2 && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Paso 2: Identidad y Tono de Voz</h2>
                <p className={styles.sectionDesc}>
                  Configura cómo se presentará el bot y el estilo de comunicación con tus clientes.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Nombre del Asistente Virtual <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sofía, Alex, Asistente Virtual..."
                    value={formData.chatbot_name}
                    onChange={(e) => updateField("chatbot_name", e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Agente / Asesor de Fallback (Humano)</label>
                  <input
                    type="text"
                    placeholder="Ej. Equipo Comercial / Juan Pérez"
                    value={formData.fallback_agent}
                    onChange={(e) => updateField("fallback_agent", e.target.value)}
                    className={styles.input}
                  />
                  <span className={styles.helperText}>
                    Nombre del equipo o persona a quien se derivará la conversación.
                  </span>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Selecciona el Tono de Comunicación</label>
                  <div className={styles.tonesGrid}>
                    {[
                      {
                        id: "formal",
                        icon: "🎩",
                        title: "Corporativo & Formal",
                        desc: "Respuestas estructuradas, lenguaje respetuoso (de usted), ideal para finanzas y legal.",
                      },
                      {
                        id: "friendly",
                        icon: "🌟",
                        title: "Cálido & Amigable",
                        desc: "Empático, cercano (de tú), conversacional y con emojis sutiles. Recomendado.",
                      },
                      {
                        id: "concise",
                        icon: "⚡",
                        title: "Conciso & Directo",
                        desc: "Respuestas rápidas, al grano, sin rodeos ni textos largos. Orientado a la acción.",
                      },
                      {
                        id: "creative",
                        icon: "💡",
                        title: "Dinámico & Creativo",
                        desc: "Enérgico, entusiasta y cautivador. Excelente para marcas jóvenes y retail.",
                      },
                    ].map((tone) => {
                      const isSelected = formData.writing_tone === tone.id;
                      return (
                        <div
                          key={tone.id}
                          onClick={() => updateField("writing_tone", tone.id)}
                          className={`${styles.toneCard} ${
                            isSelected ? styles.toneCardSelected : ""
                          }`}
                        >
                          <div className={styles.toneCardHeader}>
                            <span className={styles.toneEmojiTitle}>
                              <span>{tone.icon}</span>
                              <span>{tone.title}</span>
                            </span>
                            {isSelected && <CheckCircle2 size={18} color="var(--brand-primary)" />}
                          </div>
                          <p className={styles.toneDescription}>{tone.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Mensaje de Bienvenida Automático</label>
                  <textarea
                    value={formData.welcome_message}
                    onChange={(e) => updateField("welcome_message", e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Mensaje ante Dudas No Resueltas (Fallback)</label>
                  <textarea
                    value={formData.fallback_message}
                    onChange={(e) => updateField("fallback_message", e.target.value)}
                    className={styles.textarea}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Reglas de Negocio y Capacidades */}
          {currentStep === 3 && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Paso 3: Reglas de Negocio y Capacidades</h2>
                <p className={styles.sectionDesc}>
                  Habilita o deshabilita los módulos de comportamiento e interactividad del bot.
                </p>
              </div>

              <div className={styles.featuresList}>
                <div className={styles.featureCard}>
                  <div className={styles.featureInfo}>
                    <span className={styles.featureTitle}>Captura de Prospectos (Leads)</span>
                    <span className={styles.featureDesc}>
                      Solicita nombre, correo y número de WhatsApp de forma natural durante la charla.
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={formData.enable_lead_capture}
                      onChange={(e) => updateField("enable_lead_capture", e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureInfo}>
                    <span className={styles.featureTitle}>Agendamiento de Citas / Visitas</span>
                    <span className={styles.featureDesc}>
                      Permite al cliente solicitar fecha y hora para reuniones presenciales o virtuales.
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={formData.enable_booking}
                      onChange={(e) => updateField("enable_booking", e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureInfo}>
                    <span className={styles.featureTitle}>Derivación a Asesor Humano</span>
                    <span className={styles.featureDesc}>
                      Transfiere la conversación a un agente real cuando el usuario lo pida explícitamente.
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={formData.enable_human_escalation}
                      onChange={(e) => updateField("enable_human_escalation", e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureInfo}>
                    <span className={styles.featureTitle}>Base de Conocimiento y FAQ</span>
                    <span className={styles.featureDesc}>
                      Responde preguntas frecuentes sobre precios, ubicación, políticas y requisitos.
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={formData.enable_faq}
                      onChange={(e) => updateField("enable_faq", e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureInfo}>
                    <span className={styles.featureTitle}>Restricción por Horario de Atención</span>
                    <span className={styles.featureDesc}>
                      Notificar fuera de horario que el equipo responderá al día hábil siguiente.
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={formData.business_hours_enabled}
                      onChange={(e) => updateField("business_hours_enabled", e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {formData.business_hours_enabled && (
                <div style={{ marginBottom: 20 }}>
                  <div className={styles.field}>
                    <label className={styles.label}>Detalle del Horario Comercial</label>
                    <input
                      type="text"
                      value={formData.business_hours_schedule}
                      onChange={(e) => updateField("business_hours_schedule", e.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Directrices o Reglas Especiales de Atención</label>
                  <textarea
                    placeholder="Ej. Siempre ofrecer el descuento del mes; No dar cotizaciones cerradas sin antes pedir el correo..."
                    value={formData.custom_rules}
                    onChange={(e) => updateField("custom_rules", e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Temas o Palabras Prohibidas (Banned Topics)</label>
                  <textarea
                    placeholder="Ej. No hablar de competidores directos, no discutir temas políticos..."
                    value={formData.banned_topics}
                    onChange={(e) => updateField("banned_topics", e.target.value)}
                    className={styles.textarea}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Revisión y Confirmación */}
          {currentStep === 4 && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Paso 4: Revisión y Aprovisionamiento</h2>
                <p className={styles.sectionDesc}>
                  Revisa los parámetros antes de sincronizar la configuración con la instancia de Zefiron.
                </p>
              </div>

              <div className={styles.reviewSection}>
                <div className={styles.reviewCard}>
                  <div className={styles.reviewCardTitle}>
                    <Building2 size={16} />
                    <span>Perfil de la Empresa</span>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Empresa</span>
                      <span className={styles.reviewVal}>{formData.company_name}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Industria</span>
                      <span className={styles.reviewVal}>{formData.industry || "No especificada"}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Contacto</span>
                      <span className={styles.reviewVal}>{formData.contact_email || "No especificado"}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Web</span>
                      <span className={styles.reviewVal}>{formData.website || "No especificada"}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.reviewCard}>
                  <div className={styles.reviewCardTitle}>
                    <Bot size={16} />
                    <span>Identidad del Asistente</span>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Nombre del Bot</span>
                      <span className={styles.reviewVal}>{formData.chatbot_name}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Tono Seleccionado</span>
                      <span className={styles.reviewVal} style={{ textTransform: "capitalize" }}>
                        {formData.writing_tone}
                      </span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewKey}>Asesor Fallback</span>
                      <span className={styles.reviewVal}>{formData.fallback_agent || "Automático"}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.reviewCard}>
                  <div className={styles.reviewCardTitle}>
                    <Sliders size={16} />
                    <span>Módulos Activos</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {formData.enable_lead_capture && (
                      <span className="badge badge-configured">✓ Captura de Leads</span>
                    )}
                    {formData.enable_booking && (
                      <span className="badge badge-configured">✓ Agendamiento</span>
                    )}
                    {formData.enable_human_escalation && (
                      <span className="badge badge-configured">✓ Escalación a Humano</span>
                    )}
                    {formData.enable_faq && (
                      <span className="badge badge-configured">✓ Respuestas FAQ</span>
                    )}
                  </div>
                </div>

                {/* Aviso sobre endpoint de sincronización */}
                <div className={styles.syncNotice}>
                  <Globe size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {formData.chatbot_url ? (
                      <span>
                        Se detectó una instancia asignada en <code>{formData.chatbot_url}</code>. Al
                        confirmar, se enviará la actualización inmediata mediante <code>PUT /configuration</code>.
                      </span>
                    ) : (
                      <span>
                        Esta instancia aún no tiene URL remota asignada. Los datos quedarán
                        resguardados en MongoDB y el bot tomará la configuración cuando se levante.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones */}
        <div className={styles.actionsBar}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className={styles.backBtn}
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          {currentStep < 4 ? (
            <button type="button" onClick={handleNext} className={styles.nextBtn}>
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={styles.nextBtn}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Confirmar y Aprovisionar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

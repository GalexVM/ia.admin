"use client";

import React, { useState, useEffect, use } from "react";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Radio,
  Bot,
} from "lucide-react";
import styles from "./setup.module.css";
import ConfigEditor from "@/components/ConfigEditor";
import { TenantConfiguration } from "@/models/TenantConfig";

interface SetupPageProps {
  params: Promise<{ token: string }>;
}

interface TenantData {
  company_name: string;
  chatbot_name: string;
  chatbot_url?: string;
  configuration: TenantConfiguration;
}

export default function SetupWizardPage({ params }: SetupPageProps) {
  const { token } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    syncedDirectly: boolean;
    message: string;
  } | null>(null);

  // Cargar datos iniciales del Tenant
  useEffect(() => {
    async function loadTenantData() {
      try {
        const res = await fetch(`/api/setup/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Token no encontrado o enlace caducado");
        }

        const t = data.tenant;
        setTenantData({
          company_name: t.company_name || "",
          chatbot_name: t.chatbot_name || "Zefiron Bot",
          chatbot_url: t.chatbot_url || "",
          configuration: t.configuration || {},
        });
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

  const handleSubmit = async (updatedConfig: TenantConfiguration) => {
    setIsSubmitting(true);
    try {
      const payload = {
        company_name: updatedConfig.company_name || tenantData?.company_name,
        chatbot_name: updatedConfig.chatbot_name || tenantData?.chatbot_name,
        configuration: updatedConfig,
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
            Estamos cargando el portal de configuración exclusivo de tu asistente virtual.
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
            Los parámetros para <strong>{tenantData?.company_name}</strong> han sido registrados
            correctamente. El asistente comenzará a operar con las nuevas reglas.
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
          <h1 className={styles.pageTitle}>Portal de Configuración de Asistente</h1>
          <p className={styles.pageSubtitle}>
            Personaliza la identidad, tono de voz, reglas comerciales y agendamiento de citas para{" "}
            <strong>{tenantData?.company_name || "tu empresa"}</strong>.
          </p>
        </div>

        {/* Editor de Configuración (Excluye Cat. 10 para usuarios) */}
        {tenantData && (
          <ConfigEditor
            initialConfig={tenantData.configuration}
            isAdmin={false}
            isSaving={isSubmitting}
            onSave={handleSubmit}
            saveButtonText="Completar y Guardar Onboarding"
          />
        )}
      </div>
    </div>
  );
}

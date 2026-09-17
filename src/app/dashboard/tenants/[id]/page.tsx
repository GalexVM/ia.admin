"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Server,
  Shield,
  ExternalLink,
  Copy,
  Check,
  History,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  Loader2,
  Send,
} from "lucide-react";
import styles from "./tenant-view.module.css";
import ConfigEditor from "@/components/ConfigEditor";
import { ITenantConfig, TenantConfiguration, TenantStatus } from "@/models/TenantConfig";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TenantDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [tenant, setTenant] = useState<ITenantConfig | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [chatbotUrl, setChatbotUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
    details?: string;
  } | null>(null);

  // Cargar datos del tenant
  const loadTenant = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.tenant) {
        setTenant(data.tenant);
        setCompanyName(data.tenant.company_name || "");
        setChatbotUrl(data.tenant.chatbot_url || "");
      } else {
        alert(data.error || "No se encontró la instancia");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error al cargar tenant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [id]);

  // Manejador de guardado y PUT a /configuration
  const handleSaveConfig = async (newConfig: TenantConfiguration, syncToRemote: boolean = true) => {
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          chatbot_url: chatbotUrl,
          configuration: newConfig,
          syncToRemote,
        }),
      });

      const data = await res.json();

      if (res.ok && data.tenant) {
        setTenant(data.tenant);
        const sync = data.syncResult;

        if (sync?.syncedDirectly) {
          setFeedbackMessage({
            type: "success",
            text: "✅ Configuración guardada y sincronizada en vivo con el chatbot",
            details: sync.message || `Respuesta remota: HTTP ${sync.statusCode}`,
          });
        } else if (sync?.statusCode && sync.statusCode !== 200) {
          setFeedbackMessage({
            type: "error",
            text: `⚠️ Guardado en MongoDB, pero el chatbot devolvió HTTP ${sync.statusCode}`,
            details: sync.details || sync.message,
          });
        } else {
          setFeedbackMessage({
            type: "info",
            text: "Guardado en base de datos",
            details: sync?.message,
          });
        }
      } else {
        setFeedbackMessage({
          type: "error",
          text: "Error al actualizar la configuración",
          details: data.error || "Error desconocido",
        });
      }
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: "Error de red al conectar con el servidor",
        details: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyOnboardingLink = () => {
    if (!tenant) return;
    const url = `${window.location.origin}/setup/${tenant.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case "pending_onboarding":
        return (
          <span className="badge badge-pending">
            <Clock size={12} />
            <span>Pendiente Onboarding</span>
          </span>
        );
      case "configured":
        return (
          <span className="badge badge-configured">
            <Layers size={12} />
            <span>Configurado en DB</span>
          </span>
        );
      case "synced":
        return (
          <span className="badge badge-synced">
            <CheckCircle2 size={12} />
            <span>Sincronizado en Vivo</span>
          </span>
        );
      case "error":
        return (
          <span className="badge badge-error">
            <AlertTriangle size={12} />
            <span>Error de Sincronización</span>
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrapper} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
          <Loader2 size={24} className="animate-spin" />
          <span>Cargando parámetros del tenant...</span>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>
        {/* Navegación y Breadcrumbs */}
        <div className={styles.topBar}>
          <Link href="/dashboard" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Volver a todas las instancias</span>
          </Link>

          {/* Tarjeta de Cabecera del Tenant */}
          <div className={styles.headerCard}>
            <div className={styles.headerLeft}>
              <div className={styles.companyTitleRow}>
                <h1 className={styles.companyTitle}>{tenant.company_name}</h1>
                {renderStatusBadge(tenant.status)}
              </div>

              <div className={styles.metaInfoRow}>
                <div className={styles.metaItem}>
                  <Server size={14} color="var(--brand-primary)" />
                  <span>
                    Endpoint Bot:{" "}
                    <strong>{tenant.chatbot_url || "No asignado (almacenado en DB)"}</strong>
                  </span>
                </div>
                {tenant.last_synced_at && (
                  <div className={styles.metaItem}>
                    <Clock size={14} />
                    <span>
                      Último Sync: {new Date(tenant.last_synced_at).toLocaleString("es-ES")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={copyOnboardingLink}
                className={styles.secondaryBtn}
                title="Copiar link del wizard para compartir con el cliente"
              >
                {copiedLink ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copiedLink ? "Enlace Copiado" : "Copiar Link Wizard"}</span>
              </button>

              <a
                href={`/setup/${tenant.token}`}
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryBtn}
              >
                <span>Abrir Wizard</span>
                <ExternalLink size={14} />
              </a>

              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={styles.secondaryBtn}
              >
                <History size={14} />
                <span>Historial Sync</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Endpoint y Nombre de Empresa editable */}
        <div className={styles.endpointCard}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre de la Empresa</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={styles.input}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Endpoint de la Instancia Chatbot (donde se envía el PUT a /configuration)
            </label>
            <input
              type="url"
              value={chatbotUrl}
              onChange={(e) => setChatbotUrl(e.target.value)}
              className={styles.input}
              placeholder="https://ia.zefiron.com/demo/configuration"
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 220 }}>
              Al guardar en el editor inferior, los cambios se enviarán vía <strong>PUT</strong> a este endpoint.
            </span>
          </div>
        </div>

        {/* Historial de Sincronización si está desplegado */}
        {showHistory && (
          <div className={styles.historyCard}>
            <h3 className={styles.historyTitle}>Registro de Sincronizaciones Recientes</h3>
            <div className={styles.historyList}>
              {(!tenant.sync_history || tenant.sync_history.length === 0) && (
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  No hay registros previos de sincronización.
                </span>
              )}
              {(tenant.sync_history || [])
                .slice()
                .reverse()
                .map((item, idx) => (
                  <div key={idx} className={styles.historyItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.status === "success" ? (
                        <CheckCircle2 size={14} color="var(--success)" />
                      ) : (
                        <AlertTriangle size={14} color="var(--danger)" />
                      )}
                      <span>{item.message}</span>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {new Date(item.synced_at).toLocaleString("es-ES")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Editor de Configuración Visual (10 Categorías para Admin) */}
        <ConfigEditor
          initialConfig={tenant.configuration || {}}
          isAdmin={true}
          isSaving={isSaving}
          onSave={handleSaveConfig}
          saveButtonText="Guardar y Actualizar (/configuration)"
          feedbackMessage={feedbackMessage}
        />
      </main>
    </div>
  );
}

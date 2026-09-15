"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  LogOut,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Bot,
  RefreshCw,
  Server,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Trash2,
} from "lucide-react";
import styles from "./dashboard.module.css";
import { TenantStatus } from "@/models/TenantConfig";

interface TenantItem {
  _id: string;
  token: string;
  company_name: string;
  chatbot_name: string;
  chatbot_url?: string;
  status: TenantStatus;
  createdAt: string;
  last_synced_at?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"new" | "import">("new");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newChatbotUrl, setNewChatbotUrl] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error("Error al cargar tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCompanyName,
          chatbot_url: newChatbotUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.tenant) {
        setTenants((prev) => [data.tenant, ...prev]);
        setIsModalOpen(false);
        setNewCompanyName("");
        setNewChatbotUrl("");
      } else {
        alert(data.error || "Error al crear el tenant");
      }
    } catch (err) {
      alert("Error al conectar con el servidor");
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/tenants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (res.ok && data.tenant) {
        setTenants((prev) => [data.tenant, ...prev]);
        setIsModalOpen(false);
        setImportUrl("");
        setCreationMode("new");
      } else {
        alert(data.error || "Error al importar el tenant");
      }
    } catch (err) {
      alert("Error al conectar con el servidor para importar");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este tenant? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (res.ok) {
        setTenants((prev) => prev.filter((t) => t._id !== id));
      } else {
        alert(data.error || "Error al eliminar el tenant");
      }
    } catch (err) {
      alert("Error al conectar con el servidor para eliminar");
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/setup/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Métricas
  const totalTenants = tenants.length;
  const pendingCount = tenants.filter((t) => t.status === "pending_onboarding").length;
  const configuredCount = tenants.filter((t) => t.status === "configured").length;
  const syncedCount = tenants.filter((t) => t.status === "synced").length;

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
            <span>Error de Sync</span>
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <Shield size={20} />
          </div>
          <span className={styles.brandTitle}>Zefiron Admin Central</span>
        </div>

        <div className={styles.navActions}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className={styles.main}>
        {/* Cabecera y Botón de Acción */}
        <div className={styles.topBar}>
          <div className={styles.heading}>
            <h1 className={styles.headingTitle}>Panel de Instancias & Onboarding</h1>
            <p className={styles.headingSubtitle}>
              Gestiona el aprovisionamiento, enlaces únicos de clientes y sincronización de configuraciones.
            </p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className={styles.primaryBtn}>
            <Plus size={16} />
            <span>Generar Link de Onboarding</span>
          </button>
        </div>

        {/* Métricas / Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Instancias</span>
            <span className={styles.statValue}>{totalTenants}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Pendientes de Onboarding</span>
            <span className={styles.statValue} style={{ color: "var(--warning)" }}>
              {pendingCount}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Configurados en DB</span>
            <span className={styles.statValue} style={{ color: "var(--brand-primary)" }}>
              {configuredCount}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Sincronizados en Vivo</span>
            <span className={styles.statValue} style={{ color: "var(--success)" }}>
              {syncedCount}
            </span>
          </div>
        </div>

        {/* Tabla de Tenants */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderBar}>
            <h2 className={styles.tableHeaderTitle}>Entornos y Clientes Registrados</h2>
            <button
              onClick={fetchTenants}
              className={styles.copyBtn}
              title="Refrescar lista"
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente / Bot</th>
                  <th>Endpoint Chatbot</th>
                  <th>Estado</th>
                  <th>Enlace Onboarding</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <Bot size={36} className={styles.emptyIcon} />
                        <span className={styles.emptyText}>
                          Aún no hay clientes registrados. Haz clic en &quot;Generar Link de Onboarding&quot;
                          para crear el primero.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {tenants.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className={styles.companyCell}>
                        <span className={styles.companyName}>{t.company_name}</span>
                        <span className={styles.botName}>{t.chatbot_name}</span>
                      </div>
                    </td>
                    <td>
                      {t.chatbot_url ? (
                        <span className={styles.urlTag} title={t.chatbot_url}>
                          <Server size={12} />
                          {t.chatbot_url}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          No asignado (Diferido)
                        </span>
                      )}
                    </td>
                    <td>{renderStatusBadge(t.status)}</td>
                    <td>
                      <div className={styles.tokenBox}>
                        <input
                          readOnly
                          value={`/setup/${t.token}`}
                          className={styles.tokenInput}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(t.token)}
                          className={styles.copyBtn}
                          title="Copiar enlace completo"
                        >
                          {copiedToken === t.token ? (
                            <Check size={14} color="var(--success)" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <a
                        href={`/setup/${t.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.openLinkBtn}
                      >
                        <span>Abrir Wizard</span>
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => handleDeleteTenant(t._id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--error)",
                          color: "var(--error)",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        title="Eliminar Onboarding"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {creationMode === "new" ? "Crear Nuevo Tenant" : "Importar Tenant Existente"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.closeModalBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", padding: "0 24px", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => setCreationMode("new")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: creationMode === "new" ? "var(--brand-primary)" : "var(--bg-card-hover)",
                  color: creationMode === "new" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                Nuevo Onboarding
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("import")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: creationMode === "import" ? "var(--brand-primary)" : "var(--bg-card-hover)",
                  color: creationMode === "import" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                Importar por URL
              </button>
            </div>

            {creationMode === "new" ? (
              <form onSubmit={handleCreateTenant} className={styles.modalForm}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    Nombre de la Empresa / Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Inmobiliaria Panorama"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      fontSize: "0.875rem",
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    URL de la Instancia Chatbot (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.cliente.com/configuration"
                    value={newChatbotUrl}
                    onChange={(e) => setNewChatbotUrl(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      fontSize: "0.875rem",
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Si la dejas vacía, el onboarding guardará los datos en MongoDB para aprovisionamiento diferido.
                  </span>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={styles.primaryBtn}
                  >
                    {isCreating ? "Generando..." : "Generar Token y Link"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImportTenant} className={styles.modalForm}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    Endpoint de Configuración (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="Ej. https://ia.zefiron.com/demo/configuration"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      fontSize: "0.875rem",
                    }}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    El sistema extraerá el JSON y registrará el tenant automáticamente como configurado.
                  </span>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !importUrl}
                    className={styles.primaryBtn}
                  >
                    {isCreating ? "Importando..." : "Sincronizar e Importar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

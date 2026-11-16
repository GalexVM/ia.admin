"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import {
  Calendar,
  CalendarClock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Bot,
  Cpu,
  Layers,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";
import styles from "./view.module.css";
import { ZefironIsotipo } from "@/components/ZefironLogo";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ProviderItem {
  provider: "claude" | "openai" | "openrouter";
  label: string;
  initial_balance: number;
  last_calculated_usage: number;
  last_calculated_remaining: number;
  last_sync_status: "success" | "warning" | "error" | "pending";
  last_sync_message?: string;
  last_synced_at?: string;
  start_date?: string;
}

interface TenantItem {
  _id: string;
  company_name: string;
  chatbot_name: string;
  cutoff_day: number;
}

interface ViewData {
  token: string;
  title: string;
  createdAt: string;
}

export const DEFAULT_CUTOFF_DAY = 25;

export const getCutoffDates = (
  cutoffDay: number = DEFAULT_CUTOFF_DAY,
  now = new Date()
) => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetMonth = currentMonth;
  let targetYear = currentYear;

  if (currentDay < cutoffDay) {
    targetMonth = currentMonth - 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear = currentYear - 1;
    }
  }

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualCutoffDay = Math.min(cutoffDay, daysInTargetMonth);

  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${targetYear}-${pad(targetMonth + 1)}-${pad(actualCutoffDay)}`;
  const endDate = `${currentYear}-${pad(currentMonth + 1)}-${pad(currentDay)}`;

  return { startDate, endDate };
};

// Tarjeta individual de Entorno para la Vista Ejecutiva (100% limpia)
function ViewTenantCard({
  tenant,
  viewToken,
  globalStartDate,
  globalEndDate,
  activePreset,
}: {
  tenant: TenantItem;
  viewToken: string;
  globalStartDate: string;
  globalEndDate: string;
  activePreset: string;
}) {
  const [cutoffDay, setCutoffDay] = useState<number>(tenant.cutoff_day || DEFAULT_CUTOFF_DAY);

  const [startDate, setStartDate] = useState(() => {
    if (activePreset !== "cutoff" && globalStartDate) return globalStartDate;
    return getCutoffDates(tenant.cutoff_day || DEFAULT_CUTOFF_DAY).startDate;
  });

  const [endDate, setEndDate] = useState(() => {
    if (activePreset !== "cutoff" && globalEndDate) return globalEndDate;
    return getCutoffDates(tenant.cutoff_day || DEFAULT_CUTOFF_DAY).endDate;
  });

  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryLeads = useCallback(
    async (start: string, end: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const url = `/api/views/${viewToken}/leads?tenant_id=${encodeURIComponent(
          tenant._id
        )}&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.success) {
          setCount(data.count ?? 0);
        } else {
          setCount(null);
          setError(data.error || "No se pudo obtener el conteo de leads.");
        }
      } catch (err: unknown) {
        setCount(null);
        const msg = err instanceof Error ? err.message : "Error de conexión";
        setError(`Error al consultar leads: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    },
    [viewToken, tenant._id]
  );

  // Sincronizar cutoffDay si cambia o se actualiza desde el backend
  useEffect(() => {
    if (tenant.cutoff_day && tenant.cutoff_day !== cutoffDay) {
      setCutoffDay(tenant.cutoff_day);
    }
  }, [tenant.cutoff_day]);

  useEffect(() => {
    if (activePreset === "cutoff") {
      const { startDate: s, endDate: e } = getCutoffDates(cutoffDay);
      setStartDate(s);
      setEndDate(e);
      queryLeads(s, e);
    } else if (globalStartDate && globalEndDate) {
      setStartDate(globalStartDate);
      setEndDate(globalEndDate);
      queryLeads(globalStartDate, globalEndDate);
    }
  }, [activePreset, globalStartDate, globalEndDate, cutoffDay, queryLeads]);

  const handleCutoffChange = async (newDay: number) => {
    setCutoffDay(newDay);
    const { startDate: s, endDate: e } = getCutoffDates(newDay);
    setStartDate(s);
    setEndDate(e);
    queryLeads(s, e);
    try {
      await fetch(`/api/views/${viewToken}/cutoff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant._id, cutoff_day: newDay }),
      });
    } catch (e) {
      console.warn("No se pudo actualizar el día de corte:", e);
    }
  };

  const handleResetToCutoff = () => {
    const { startDate: s, endDate: e } = getCutoffDates(cutoffDay);
    setStartDate(s);
    setEndDate(e);
    queryLeads(s, e);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    queryLeads(startDate, endDate);
  };

  return (
    <div className={styles.tenantCard}>
      {/* 1. Header con Nombre del Entorno */}
      <div className={styles.cardHeader}>
        <div className={styles.companyInfo}>
          <h3 className={styles.companyName} title={tenant.company_name}>
            {tenant.company_name}
          </h3>
          <span className={styles.botName}>Asistente: {tenant.chatbot_name || "Zefi"}</span>
        </div>
      </div>

      {/* 2. Área Destacada de Resultado: Conteo Prominente */}
      <div
        className={`${styles.resultHero} ${
          isLoading ? "" : error ? styles.resultHeroError : styles.resultHeroSuccess
        }`}
      >
        {isLoading ? (
          <div className={styles.resultLoading}>
            <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
            <span>Consultando leads...</span>
          </div>
        ) : error ? (
          <div className={styles.resultError}>
            <AlertTriangle size={24} />
            <span style={{ fontWeight: 600 }}>No disponible</span>
            <span className={styles.resultErrorMsg}>{error}</span>
          </div>
        ) : (
          <div>
            <div className={styles.resultCount}>
              <span>{count ?? 0}</span>
            </div>
            <div className={styles.resultLabel}>
              Leads únicos registrados en este rango
            </div>
          </div>
        )}
      </div>

      {/* 3. Selector de Corte por Defecto y Filtro de Fechas */}
      <form onSubmit={handleManualSubmit} className={styles.dateWidgetsContainer}>
        <div className={styles.cardCutoffRow}>
          <div className={styles.cardCutoffLabel}>
            <CalendarClock size={13} style={{ color: "var(--brand-primary)" }} />
            <span>Corte por defecto:</span>
          </div>
          <div className={styles.cardCutoffActions}>
            <select
              value={cutoffDay}
              onChange={(e) => handleCutoffChange(Number(e.target.value))}
              className={styles.cardCutoffSelect}
              title="Día de corte mensual por defecto. Al abrir la vista, cargará desde este corte hasta hoy."
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Día {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleResetToCutoff}
              className={styles.cardCutoffResetBtn}
              title={`Recargar rango desde el último día ${cutoffDay}`}
            >
              Recargar
            </button>
          </div>
        </div>

        <div className={styles.dateFieldsRow}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>
              <Calendar size={12} color="var(--brand-mid)" />
              <span>Fecha Inicio</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
              required
            />
          </div>

          <div className={styles.dateField}>
            <label className={styles.dateLabel}>
              <Calendar size={12} color="var(--brand-mid)" />
              <span>Fecha Fin</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={styles.queryBtn}
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>{isLoading ? "Consultando..." : "Consultar Rango"}</span>
        </button>
      </form>
    </div>
  );
}

export default function SharedViewPage({ params }: PageProps) {
  const { token } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // Filtros rápidos de rango para leads
  const [activePreset, setActivePreset] = useState<string>("cutoff");
  const [globalStart, setGlobalStart] = useState<string>("");
  const [globalEnd, setGlobalEnd] = useState<string>("");

  const loadView = useCallback(
    async (refreshBalances = false) => {
      if (refreshBalances) setIsRefreshingBalances(true);
      try {
        const url = `/api/views/${token}${refreshBalances ? "?refresh=true" : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Vista no disponible o enlace inválido");
        }

        setViewData(data.view);
        setProviders(data.providers || []);
        setTenants(data.tenants || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cargar la vista";
        setLoadError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshingBalances(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      loadView();
    }
  }, [token, loadView]);

  const applyPreset = (preset: "cutoff" | "today" | "week" | "month" | "month30") => {
    setActivePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    if (preset === "cutoff") {
      setGlobalStart("");
      setGlobalEnd("");
    } else if (preset === "today") {
      setGlobalStart(todayStr);
      setGlobalEnd(todayStr);
    } else if (preset === "week") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setGlobalStart(past.toISOString().slice(0, 10));
      setGlobalEnd(todayStr);
    } else if (preset === "month") {
      setGlobalStart(`${y}-${m}-01`);
      setGlobalEnd(todayStr);
    } else if (preset === "month30") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setGlobalStart(past.toISOString().slice(0, 10));
      setGlobalEnd(todayStr);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <div style={{ margin: "auto", textAlign: "center", padding: 40 }}>
          <Loader2 size={36} className="animate-spin" color="var(--brand-primary)" />
          <p style={{ marginTop: 16, color: "var(--text-secondary)" }}>
            Cargando vista...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !viewData) {
    return (
      <div className={styles.wrapper}>
        <div style={{ margin: "auto", textAlign: "center", padding: 40, maxWidth: 460 }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ margin: "0 auto 16px auto" }} />
          <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Enlace no disponible
          </h2>
          <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
            {loadError || "La vista no existe o fue deshabilitada."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header Ejecutivo */}
      <header className={styles.navbar}>
        <div className={styles.brandGroup}>
          <ZefironIsotipo size={32} />
          <div className={styles.brandDivider} />
          <div className={styles.viewTitleGroup}>
            <span className={styles.viewTitle}>{viewData.title}</span>
            <span className={styles.viewSubtitle}>Zefiron IA Admin Central</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.liveBadge}>
            <div className={styles.liveDot} />
            <span>En vivo</span>
          </div>
          <div className={styles.taglineBadge}>
            <span>Make your life easier</span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className={styles.main}>
        {/* SECCIÓN 1: Saldos de Inteligencia Artificial (Si están incluidos) */}
        {providers.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Sparkles size={20} style={{ color: "var(--brand-primary)" }} />
                <span>Saldos de Inteligencia Artificial</span>
              </h2>

              <button
                type="button"
                onClick={() => loadView(true)}
                disabled={isRefreshingBalances}
                className={styles.refreshBtn}
                title="Sincronizar saldo con los servidores de IA"
              >
                <RefreshCw size={13} className={isRefreshingBalances ? "animate-spin" : ""} />
                <span>{isRefreshingBalances ? "Sincronizando..." : "Actualizar Saldo"}</span>
              </button>
            </div>

            <div className={styles.balanceGrid}>
              {providers.map((b) => {
                const remaining = Number(b.last_calculated_remaining || 0);
                const isWarning = remaining <= 2;
                const balanceColor = isWarning ? "var(--warning)" : "var(--brand-primary-hover)";
                const statusClass =
                  b.last_sync_status === "success"
                    ? styles.statusSuccess
                    : b.last_sync_status === "warning"
                    ? styles.statusWarning
                    : b.last_sync_status === "error"
                    ? styles.statusError
                    : styles.statusPending;

                return (
                  <div key={b.provider} className={styles.balanceCard}>
                    <div className={styles.providerHeader}>
                      <div className={styles.providerInfo}>
                        <span className={styles.providerName}>
                          {b.provider === "claude" && <Bot size={18} style={{ color: "#E07A5F" }} />}
                          {b.provider === "openai" && <Cpu size={18} style={{ color: "#10A37F" }} />}
                          {b.provider === "openrouter" && <Layers size={18} style={{ color: "#818CF8" }} />}
                          {b.provider === "claude"
                            ? "Claude"
                            : b.provider === "openai"
                            ? "OpenAI"
                            : "OpenRouter"}
                        </span>
                        <span className={styles.providerRoleBadge}>
                          {b.provider === "claude"
                            ? "IA Comercial"
                            : b.provider === "openai"
                            ? "IA Comercial y ZefiMind"
                            : "IA Analítica"}
                        </span>
                      </div>

                      <span className={`${styles.statusPill} ${statusClass}`}>
                        <CheckCircle2 size={11} />
                        <span>En línea</span>
                      </span>
                    </div>

                    <div className={styles.balanceValueBlock}>
                      <span className={styles.balanceLabel}>Saldo Restante</span>
                      <div className={styles.balanceAmountRow}>
                        <span className={styles.balanceNumber} style={{ color: balanceColor }}>
                          ${remaining.toFixed(2)}
                        </span>
                        <span className={styles.balanceCurrency}>USD</span>
                      </div>
                    </div>

                    <div className={styles.balanceMetricsList}>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>
                          {b.provider === "openrouter" ? "Créditos Totales:" : "Saldo Inicial:"}
                        </span>
                        <span className={styles.metricVal}>
                          ${Number(b.initial_balance || 0).toFixed(2)} USD
                        </span>
                      </div>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Consumo Acumulado:</span>
                        <span className={styles.metricVal}>
                          ${Number(b.last_calculated_usage || 0).toFixed(4)} USD
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECCIÓN 2: Monitoreo y Conteo de Leads (Si están incluidos) */}
        {tenants.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Target size={20} style={{ color: "var(--brand-primary)" }} />
                <span>Track de Leads</span>
              </h2>
            </div>

            {/* Presets Rápidos de Rango */}
            <div className={styles.filterPresetsCard}>
              <span className={styles.presetLabel}>Rango Rápido:</span>
              <button
                type="button"
                onClick={() => applyPreset("cutoff")}
                className={`${styles.presetBtn} ${
                  activePreset === "cutoff" ? styles.presetBtnActive : ""
                }`}
              >
                Corte por Defecto (Por Tarjeta)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className={`${styles.presetBtn} ${
                  activePreset === "today" ? styles.presetBtnActive : ""
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => applyPreset("week")}
                className={`${styles.presetBtn} ${
                  activePreset === "week" ? styles.presetBtnActive : ""
                }`}
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                onClick={() => applyPreset("month")}
                className={`${styles.presetBtn} ${
                  activePreset === "month" ? styles.presetBtnActive : ""
                }`}
              >
                Mes Calendario
              </button>
              <button
                type="button"
                onClick={() => applyPreset("month30")}
                className={`${styles.presetBtn} ${
                  activePreset === "month30" ? styles.presetBtnActive : ""
                }`}
              >
                Últimos 30 días
              </button>
            </div>

            {/* Grid de Tarjetas de cada Entorno */}
            <div className={styles.tenantsGrid}>
              {tenants.map((t) => (
                <ViewTenantCard
                  key={t._id}
                  tenant={t}
                  viewToken={token}
                  globalStartDate={globalStart}
                  globalEndDate={globalEnd}
                  activePreset={activePreset}
                />
              ))}
            </div>
          </section>
        )}

        {/* Estado vacío si la vista no tiene tarjetas asignadas */}
        {providers.length === 0 && tenants.length === 0 && (
          <div className={styles.emptyCard}>
            <Clock size={36} color="var(--brand-primary)" />
            <p style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-primary)" }}>
              Esta vista no contiene tarjetas asignadas
            </p>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
              Comunícate con el administrador para incluir indicadores en esta vista.
            </p>
          </div>
        )}
      </main>

      {/* Footer Limpio */}
      <footer className={styles.footer}>
        <span>Zefiron IA Admin Central &copy; {new Date().getFullYear()}</span>
        <span>Make your life easier</span>
      </footer>
    </div>
  );
}


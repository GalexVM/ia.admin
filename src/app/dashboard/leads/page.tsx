"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Target,
  Server,
  Calendar,
  CalendarClock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  AlertCircle,
  KeyRound,
  Lock,
  ChevronDown,
  ChevronUp,
  Wallet,
  Bot,
  Cpu,
  Layers,
  Sliders,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  X,
  Check,
} from "lucide-react";
import styles from "./leads.module.css";
import { TenantStatus } from "@/types/tenant";

interface TenantItem {
  _id: string;
  token: string;
  company_name: string;
  chatbot_name: string;
  chatbot_url?: string;
  cutoff_day?: number;
  status: TenantStatus;
  createdAt: string;
}

interface ProviderBalanceItem {
  _id: string;
  provider: "claude" | "openai" | "openrouter";
  label: string;
  initial_balance: number;
  start_date: string;
  baseline_usage: number;
  last_calculated_usage: number;
  last_calculated_remaining: number;
  last_sync_status: "success" | "warning" | "error" | "pending";
  last_sync_message?: string;
  last_synced_at?: string;
  hasKey: boolean;
  keySource: "database" | "env" | "none";
  envVarName?: string;
  maskedKey: string;
}

export const DEFAULT_CUTOFF_DAY = 25;

/**
 * Calcula el rango de fechas por defecto desde la última fecha de corte hasta hoy.
 * Ejemplo: Si el día de corte es 25 y hoy es 16 de noviembre,
 * el último corte ocurrió el 25 de octubre -> Rango: 2026-10-25 hasta 2026-11-16.
 * Si hoy es 26 de noviembre -> Rango: 2026-11-25 hasta 2026-11-26.
 */
export const getCutoffDates = (
  cutoffDay: number = DEFAULT_CUTOFF_DAY,
  now = new Date()
) => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  // Si hoy es antes del día de corte, el último corte ocurrió el mes anterior
  if (currentDay < cutoffDay) {
    targetMonth = currentMonth - 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear = currentYear - 1;
    }
  }

  // Días totales en el mes objetivo para prevenir días inválidos (ej. 31 en febrero o abril)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualCutoffDay = Math.min(cutoffDay, daysInTargetMonth);

  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${targetYear}-${pad(targetMonth + 1)}-${pad(actualCutoffDay)}`;
  const endDate = `${currentYear}-${pad(currentMonth + 1)}-${pad(currentDay)}`;

  return { startDate, endDate };
};

// Componente para la Tarjeta de cada Entorno
function TenantLeadCard({
  tenant,
  globalStartDate,
  globalEndDate,
  activePreset,
  onCountUpdate,
}: {
  tenant: TenantItem;
  globalStartDate: string;
  globalEndDate: string;
  activePreset: string;
  onCountUpdate: (tenantId: string, count: number | null, success: boolean) => void;
}) {
  // Día de corte por defecto propio de esta tarjeta (persistido en DB / localStorage)
  const [cardCutoffDay, setCardCutoffDay] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`tenant_cutoff_${tenant._id}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) return parsed;
      }
    }
    return tenant.cutoff_day || DEFAULT_CUTOFF_DAY;
  });

  const [startDate, setStartDate] = useState(() => {
    if (activePreset !== "cutoff" && globalStartDate) return globalStartDate;
    const initialCutoff = tenant.cutoff_day || DEFAULT_CUTOFF_DAY;
    return getCutoffDates(initialCutoff).startDate;
  });
  const [endDate, setEndDate] = useState(() => {
    if (activePreset !== "cutoff" && globalEndDate) return globalEndDate;
    const initialCutoff = tenant.cutoff_day || DEFAULT_CUTOFF_DAY;
    return getCutoffDates(initialCutoff).endDate;
  });

  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [matchedKey, setMatchedKey] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Clave manual opcional para pruebas rápidas
  const [customPassword, setCustomPassword] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const queryLeads = useCallback(
    async (start: string, end: string, overridePass?: string) => {
      if (!tenant.chatbot_url || !tenant.chatbot_url.trim()) {
        setError("Este entorno no tiene un chatbot_url configurado.");
        onCountUpdate(tenant._id, null, false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let url = `/api/admin/tenants/${tenant._id}/leads?start_date=${encodeURIComponent(
          start
        )}&end_date=${encodeURIComponent(end)}`;

        const passToSend = overridePass !== undefined ? overridePass : customPassword;
        if (passToSend.trim()) {
          url += `&password=${encodeURIComponent(passToSend.trim())}`;
        }

        const res = await fetch(url);

        // Validar si la respuesta es JSON antes de parsear para evitar SyntaxError "<!DOCTYPE"
        const contentType = res.headers.get("content-type") || "";
        let data: {
          success?: boolean;
          count?: number;
          error?: string;
          targetUrl?: string;
          matchedKey?: string;
        } | null = null;

        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const rawText = await res.text();
          const cleanSnippet = rawText
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100);
          throw new Error(
            `El servidor respondió con contenido no JSON (HTTP ${res.status}): ${cleanSnippet || "Página de error"}`
          );
        }

        if (data) {
          setTargetUrl(data.targetUrl || null);
          setMatchedKey(data.matchedKey || null);
        }
        setLastChecked(new Date());

        if (res.ok && data?.success) {
          setCount(data.count ?? 0);
          setError(null);
          onCountUpdate(tenant._id, data.count ?? 0, true);
        } else {
          setCount(null);
          setError(data?.error || "No se pudo obtener el conteo de leads.");
          onCountUpdate(tenant._id, null, false);
        }
      } catch (err: unknown) {
        setCount(null);
        const msg = err instanceof Error ? err.message : "Error de conexión";
        setError(`Error al comunicar con el backend: ${msg}`);
        onCountUpdate(tenant._id, null, false);
      } finally {
        setIsLoading(false);
      }
    },
    [tenant._id, tenant.chatbot_url, customPassword, onCountUpdate]
  );

  // Sincronizar fechas cuando cambia el preset global o los parámetros
  useEffect(() => {
    if (activePreset === "cutoff") {
      const { startDate: s, endDate: e } = getCutoffDates(cardCutoffDay);
      setStartDate(s);
      setEndDate(e);
      queryLeads(s, e);
    } else if (globalStartDate && globalEndDate) {
      setStartDate(globalStartDate);
      setEndDate(globalEndDate);
      queryLeads(globalStartDate, globalEndDate);
    }
  }, [activePreset, globalStartDate, globalEndDate, cardCutoffDay, queryLeads]);

  // Manejar cambio de día de corte específico de esta tarjeta
  const handleCardCutoffChange = async (newDay: number) => {
    setCardCutoffDay(newDay);
    if (typeof window !== "undefined") {
      localStorage.setItem(`tenant_cutoff_${tenant._id}`, String(newDay));
    }
    const { startDate: s, endDate: e } = getCutoffDates(newDay);
    setStartDate(s);
    setEndDate(e);
    queryLeads(s, e);
    try {
      await fetch(`/api/admin/tenants/${tenant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoff_day: newDay }),
      });
    } catch (err) {
      console.warn("No se pudo guardar el día de corte en el backend:", err);
    }
  };

  const handleResetToCutoff = () => {
    const { startDate: s, endDate: e } = getCutoffDates(cardCutoffDay);
    setStartDate(s);
    setEndDate(e);
    queryLeads(s, e);
  };

  const handleManualQuery = (e: React.FormEvent) => {
    e.preventDefault();
    queryLeads(startDate, endDate);
  };

  const hasEndpoint = Boolean(tenant.chatbot_url && tenant.chatbot_url.trim());

  // Nombre sugerido de variable de entorno (ej. DEMO_ADMIN_KEY)
  const envSlug = tenant.company_name
    ? tenant.company_name.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
    : "ENTORNO";
  const suggestedEnvKey = `${envSlug}_ADMIN_KEY`;

  return (
    <div className={styles.tenantCard}>
      {/* 1. Header con Información del Entorno */}
      <div className={styles.cardHeader}>
        <div className={styles.companyInfo}>
          <h3 className={styles.companyName} title={tenant.company_name}>
            {tenant.company_name}
          </h3>
          <span className={styles.botName}>Asistente: {tenant.chatbot_name}</span>
        </div>

        {hasEndpoint ? (
          <span className={styles.endpointTag} title={tenant.chatbot_url}>
            <Server size={11} />
            <span>{tenant.chatbot_url}</span>
          </span>
        ) : (
          <span
            className={styles.endpointTag}
            style={{ color: "var(--warning)", borderColor: "var(--warning-border)" }}
          >
            <AlertCircle size={11} />
            <span>Sin URL asignada</span>
          </span>
        )}
      </div>

      {/* 2. Área Destacada: RESULTADO POR ENCIMA DEL WIDGET */}
      <div
        className={`${styles.resultHero} ${
          isLoading
            ? ""
            : error
            ? styles.resultHeroError
            : !hasEndpoint
            ? styles.resultHeroWarning
            : styles.resultHeroSuccess
        }`}
      >
        {isLoading ? (
          <div className={styles.resultLoading}>
            <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
            <span>Consultando /count-leads/range...</span>
          </div>
        ) : !hasEndpoint ? (
          <div className={styles.resultWarning}>
            <AlertCircle size={24} />
            <span style={{ fontWeight: 600 }}>Entorno no enlazado</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Asigna un endpoint en Registro de Configuración para consultar leads.
            </span>
          </div>
        ) : error ? (
          <div className={styles.resultError}>
            <AlertTriangle size={24} />
            <span style={{ fontWeight: 600 }}>Error al consultar endpoint</span>
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

      {/* Indicador de Clave / Header x-admin-password */}
      <div className={styles.keyInfoRow}>
        <span
          className={`${styles.keyBadge} ${
            !matchedKey && !customPassword ? styles.keyBadgeUnset : ""
          }`}
          title={
            matchedKey
              ? `Header x-admin-password cargado desde la variable de entorno: ${matchedKey}`
              : customPassword
              ? "Header x-admin-password usando clave manual"
              : `Sin clave configurada. Busca en .env.local: ${suggestedEnvKey}`
          }
        >
          <KeyRound size={11} />
          <span>
            {customPassword
              ? "Clave manual activa"
              : matchedKey
              ? matchedKey
              : `${suggestedEnvKey} (no configurada)`}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setShowOverride(!showOverride)}
          className={styles.overrideToggle}
        >
          {showOverride ? "Ocultar" : "Probar clave manual"}
        </button>
      </div>

      {showOverride && (
        <div style={{ marginTop: 2 }}>
          <input
            type="password"
            placeholder={`Probar clave manual para ${tenant.company_name}`}
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            className={styles.overrideInput}
          />
        </div>
      )}

      {/* 3. Widgets de Fecha de Inicio y de Fin con Selector de Corte por Tarjeta */}
      <form onSubmit={handleManualQuery} className={styles.dateWidgetsContainer}>
        {/* Selector de día de corte exclusivo para este entorno */}
        <div className={styles.cardCutoffRow}>
          <div className={styles.cardCutoffLabel}>
            <CalendarClock size={13} style={{ color: "var(--brand-primary)" }} />
            <span>Corte por defecto:</span>
          </div>
          <div className={styles.cardCutoffActions}>
            <select
              value={cardCutoffDay}
              onChange={(e) => handleCardCutoffChange(Number(e.target.value))}
              className={styles.cardCutoffSelect}
              title="Día de corte por defecto para esta tarjeta. Al cargar o hacer F5, medirá desde el último corte hasta hoy."
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
              title={`Restablecer rango desde el último día ${cardCutoffDay}`}
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
          disabled={isLoading || !hasEndpoint}
          className={styles.queryBtn}
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>{isLoading ? "Consultando..." : "Consultar Rango"}</span>
        </button>
      </form>

      {/* 4. Footer con Ruta y Última Verificación */}
      <div className={styles.cardFooter}>
        <span
          className={styles.endpointRouteTag}
          title={targetUrl || "/count-leads/range/{start_date}/{end_date}"}
        >
          /count-leads/range/{startDate}/{endDate}
        </span>
        {lastChecked && (
          <span>
            {lastChecked.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function LeadsTrackPage() {
  const [globalStart, setGlobalStart] = useState<string>("");
  const [globalEnd, setGlobalEnd] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("cutoff");

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);

  // Estadísticas globales agregadas
  const [tenantStats, setTenantStats] = useState<
    Record<string, { count: number | null; success: boolean }>
  >({});

  // Cargar lista de entornos
  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      if (data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error("Error al cargar tenants:", err);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Estados de Saldos de IA
  const [balances, setBalances] = useState<ProviderBalanceItem[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // Modal para configurar saldo / fecha / clave del proveedor
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<ProviderBalanceItem | null>(null);
  const [formInitialBalance, setFormInitialBalance] = useState<string>("0");
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formAdminKey, setFormAdminKey] = useState<string>("");
  const [showAdminKey, setShowAdminKey] = useState<boolean>(false);
  const [isSavingBalance, setIsSavingBalance] = useState<boolean>(false);

  const fetchBalances = async (refresh = false) => {
    if (refresh) setIsRefreshingBalances(true);
    try {
      const res = await fetch(`/api/admin/balances${refresh ? "?refresh=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.balances) {
          setBalances(data.balances);
        }
      }
    } catch (err) {
      console.error("Error al cargar saldos:", err);
    } finally {
      setIsLoadingBalances(false);
      setIsRefreshingBalances(false);
    }
  };

  const openBalanceModal = (item: ProviderBalanceItem) => {
    setEditingBalance(item);
    setFormInitialBalance(String(item.initial_balance ?? 0));
    const dateObj = item.start_date ? new Date(item.start_date) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
      dateObj.getDate()
    )}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    setFormStartDate(localIso);
    setFormAdminKey("");
    setShowAdminKey(false);
    setBalanceModalOpen(true);
  };

  const handleQuickDate = (mode: "now" | "month_start") => {
    const d = new Date();
    if (mode === "month_start") {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
    setFormStartDate(localIso);
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalance) return;
    setIsSavingBalance(true);
    try {
      const payload: {
        provider: string;
        initial_balance: number;
        start_date: string;
        admin_key?: string;
      } = {
        provider: editingBalance.provider,
        initial_balance: parseFloat(formInitialBalance) || 0,
        start_date: new Date(formStartDate).toISOString(),
      };
      if (formAdminKey.trim()) {
        payload.admin_key = formAdminKey.trim();
      }

      const res = await fetch("/api/admin/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.balance) {
        setBalances((prev) =>
          prev.map((b) => (b.provider === data.balance.provider ? data.balance : b))
        );
        setBalanceModalOpen(false);
      } else {
        alert(data.error || "Error al actualizar saldo");
      }
    } catch {
      alert("Error al conectar con el servidor");
    } finally {
      setIsSavingBalance(false);
    }
  };

  useEffect(() => {
    setActivePreset("cutoff");
    loadTenants();
    fetchBalances();
  }, []);

  const handleCountUpdate = useCallback(
    (tenantId: string, count: number | null, success: boolean) => {
      setTenantStats((prev) => ({
        ...prev,
        [tenantId]: { count, success },
      }));
    },
    []
  );

  // Filtros rápidos de rango de fechas
  const applyPreset = (
    preset: "cutoff" | "today" | "week" | "month" | "month30"
  ) => {
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
      const pastStr = past.toISOString().slice(0, 10);
      setGlobalStart(pastStr);
      setGlobalEnd(todayStr);
    } else if (preset === "month") {
      setGlobalStart(`${y}-${m}-01`);
      setGlobalEnd(todayStr);
    } else if (preset === "month30") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      const pastStr = past.toISOString().slice(0, 10);
      setGlobalStart(pastStr);
      setGlobalEnd(todayStr);
    }
  };

  // Cálculo de totales agregados
  const totalTenants = tenants.length;
  const tenantsWithUrl = tenants.filter(
    (t) => t.chatbot_url && t.chatbot_url.trim().length > 0
  ).length;

  const totalLeadsSum = Object.values(tenantStats).reduce(
    (acc, curr) => acc + (curr.count || 0),
    0
  );

  const successfulQueries = Object.values(tenantStats).filter(
    (s) => s.success
  ).length;

  return (
    <div className={styles.wrapper}>
      {/* Barra superior de contexto */}
      <header className={styles.navbar}>
        <div className={styles.moduleBreadcrumb}>
          <span className={styles.breadcrumbCategory}>Módulos</span>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>Track de Leads</span>
        </div>

        <div className={styles.taglineBadge}>
          <span>Make your life easier</span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className={styles.main}>
        {/* Encabezado del Módulo */}
        <div className={styles.topBar}>
          <div className={styles.heading}>
            <h1 className={styles.headingTitle}>Track de Leads</h1>
            <p className={styles.headingSubtitle}>
              Monitoreo y conteo de prospectos en tiempo real llamando a{" "}
              <code>/count-leads/range/&#123;start_date&#125;/&#123;end_date&#125;</code> en cada entorno.
            </p>
          </div>
        </div>

        {/* Barra de Filtros Globales y Estado de Seguridad */}
        <div className={styles.globalControlsCard}>
          <div className={styles.filterPresets}>
            <span className={styles.presetLabel}>Rango Rápido:</span>
            <button
              type="button"
              onClick={() => applyPreset("cutoff")}
              className={`${styles.presetBtn} ${
                activePreset === "cutoff" ? styles.presetBtnActive : ""
              }`}
              title="Aplica el período de corte por defecto propio de cada tarjeta"
            >
              Períodos de Corte (Por Tarjeta)
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

          <div className={styles.globalActions}>
            <div
              className={styles.passwordBadge}
              title="Busca {ENTORNO}_ADMIN_KEY (ej. DEMO_ADMIN_KEY) en .env.local"
            >
              <KeyRound size={13} color="var(--brand-primary-hover)" />
              <span>Header: <code>x-admin-password</code></span>
              <div className={styles.passwordDot} />
            </div>

            <button
              type="button"
              onClick={loadTenants}
              className={styles.refreshAllBtn}
              title="Recargar entornos y consultas"
              disabled={isLoadingTenants}
            >
              <RefreshCw size={14} className={isLoadingTenants ? "animate-spin" : ""} />
              <span>Refrescar Todo</span>
            </button>
          </div>
        </div>

        {/* Indicadores de Saldos de IA */}
        <section className={styles.balanceSection}>
          <div className={styles.balanceSectionHeader}>
            <div className={styles.balanceSectionTitle}>
              <Wallet size={18} style={{ color: "var(--brand-primary)" }} />
              <span>Saldos y Consumo de IA por Plataforma</span>
            </div>
            <button
              onClick={() => fetchBalances(true)}
              className={styles.refreshBalancesBtn}
              disabled={isRefreshingBalances || isLoadingBalances}
              title="Consultar consumo en los endpoints y recalcular saldos restantes"
            >
              <RefreshCw
                size={13}
                className={isRefreshingBalances ? "animate-spin" : ""}
              />
              <span>{isRefreshingBalances ? "Recalculando..." : "Recalcular Saldos"}</span>
            </button>
          </div>

          <div className={styles.balanceGrid}>
            {balances.map((b) => {
              const isDanger =
                b.last_calculated_remaining <= 2 && b.initial_balance > 0;
              const isWarning =
                b.last_calculated_remaining <= 10 && b.initial_balance > 0;
              const balanceColor = isDanger
                ? "var(--danger)"
                : isWarning
                ? "var(--warning)"
                : "var(--brand-primary)";

              let statusClass = styles.statusPending;
              let statusText = "Falta Key";
              let StatusIcon = Clock;

              if (b.last_sync_status === "success") {
                statusClass = styles.statusSuccess;
                statusText = "Sincronizado";
                StatusIcon = CheckCircle2;
              } else if (b.last_sync_status === "warning") {
                statusClass = styles.statusWarning;
                statusText = "Saldo Bajo";
                StatusIcon = AlertTriangle;
              } else if (b.last_sync_status === "error") {
                statusClass = styles.statusError;
                statusText = "Error Auth";
                StatusIcon = AlertTriangle;
              }

              return (
                <div key={b._id} className={styles.balanceCard}>
                  <div className={styles.providerHeader}>
                    <div className={styles.providerInfo}>
                      <span className={styles.providerName}>
                        {b.provider === "claude" && (
                          <Bot size={18} style={{ color: "#E07A5F" }} />
                        )}
                        {b.provider === "openai" && (
                          <Cpu size={18} style={{ color: "#10A37F" }} />
                        )}
                        {b.provider === "openrouter" && (
                          <Layers size={18} style={{ color: "#818CF8" }} />
                        )}
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

                    <span
                      className={`${styles.statusPill} ${statusClass}`}
                      title={b.last_sync_message || ""}
                    >
                      <StatusIcon size={11} />
                      {statusText}
                    </span>
                  </div>

                  <div className={styles.balanceValueBlock}>
                    <span className={styles.balanceLabel}>Saldo Restante</span>
                    <div className={styles.balanceAmountRow}>
                      <span
                        className={styles.balanceNumber}
                        style={{ color: balanceColor }}
                      >
                        ${Number(b.last_calculated_remaining || 0).toFixed(2)}
                      </span>
                      <span className={styles.balanceCurrency}>USD</span>
                    </div>
                  </div>

                  <div className={styles.balanceMetricsList}>
                    {b.provider === "openrouter" ? (
                      <>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Créditos Totales:</span>
                          <span className={styles.metricVal}>
                            ${Number(b.initial_balance || 0).toFixed(2)} USD
                          </span>
                        </div>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Consumo Total:</span>
                          <span
                            className={styles.metricVal}
                            style={{ color: "var(--text-primary)" }}
                          >
                            ${Number(b.last_calculated_usage || 0).toFixed(4)} USD
                          </span>
                        </div>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Fuente:</span>
                          <span
                            className={styles.metricVal}
                            style={{ color: "var(--brand-primary)", fontSize: "0.75rem" }}
                          >
                            API directa (/credits)
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Saldo Inicial:</span>
                          <span className={styles.metricVal}>
                            ${Number(b.initial_balance || 0).toFixed(2)} USD
                          </span>
                        </div>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Fecha de Corte:</span>
                          <span className={styles.metricVal}>
                            {b.start_date
                              ? new Date(b.start_date).toLocaleDateString("es-PE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </span>
                        </div>
                        <div className={styles.metricRow}>
                          <span className={styles.metricLabel}>Gasto Consumido:</span>
                          <span
                            className={styles.metricVal}
                            style={{ color: "var(--text-primary)" }}
                          >
                            ${Number(b.last_calculated_usage || 0).toFixed(4)} USD
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.cardFooterBar}>
                    <span
                      className={styles.keyIndicator}
                      title={
                        b.last_sync_message ||
                        (b.hasKey ? "Clave configurada" : "Sin clave")
                      }
                    >
                      {b.hasKey ? (
                        <>
                          <Check
                            size={12}
                            style={{ color: "var(--brand-primary)", flexShrink: 0 }}
                          />
                          <span>
                            {b.keySource === "env" && b.envVarName
                              ? b.envVarName
                              : b.maskedKey || "Key activa"}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle
                            size={12}
                            style={{ color: "var(--warning)", flexShrink: 0 }}
                          />
                          <span>Sin clave</span>
                        </>
                      )}
                    </span>

                    {b.provider !== "openrouter" && (
                      <button
                        type="button"
                        onClick={() => openBalanceModal(b)}
                        className={styles.adjustBtn}
                      >
                        <Sliders size={13} />
                        <span>Ajustar Saldo</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Grid de Tarjetas de cada Entorno */}
        <div className={styles.tenantsGrid}>
          {isLoadingTenants && (
            <div className={styles.noTenantsCard}>
              <Loader2 size={36} className="animate-spin" color="var(--brand-primary)" />
              <span className={styles.noTenantsDesc}>Cargando entornos registrados...</span>
            </div>
          )}

          {!isLoadingTenants && tenants.length === 0 && (
            <div className={styles.noTenantsCard}>
              <Target size={44} className={styles.noTenantsIcon} />
              <h3 className={styles.noTenantsTitle}>No hay entornos registrados</h3>
              <p className={styles.noTenantsDesc}>
                Para comenzar a medir leads por rango de fechas, primero registra un entorno en el módulo{" "}
                <Link href="/dashboard" style={{ color: "var(--brand-mid)", textDecoration: "underline" }}>
                  Registro de Configuración
                </Link>.
              </p>
            </div>
          )}

          {tenants.map((t) => (
            <TenantLeadCard
              key={t._id}
              tenant={t}
              globalStartDate={globalStart}
              globalEndDate={globalEnd}
              activePreset={activePreset}
              onCountUpdate={handleCountUpdate}
            />
          ))}
        </div>
      </main>

      {/* Modal de Configuración de Saldo y Consumo */}
      {balanceModalOpen && editingBalance && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 520 }}>
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Wallet size={20} style={{ color: "var(--brand-primary)" }} />
                <div>
                  <h2 className={styles.modalTitle}>
                    {editingBalance.label}
                  </h2>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Fija el saldo inicial y fecha de recarga para calcular el gasto restante automáticamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBalanceModalOpen(false)}
                className={styles.closeBtn}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className={styles.modalForm}>
              {/* Saldo Inicial */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Saldo Inicial Cargado ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formInitialBalance}
                  onChange={(e) => setFormInitialBalance(e.target.value)}
                  className={styles.modalInput}
                  required
                  autoFocus
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Monto cargado en la plataforma a la fecha de corte.
                </span>
              </div>

              {/* Fecha y hora de corte */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Fecha y Hora de Recarga / Inicio
                </label>
                <input
                  type="datetime-local"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className={styles.modalInput}
                  required
                />
                <div className={styles.quickDateRow}>
                  <button
                    type="button"
                    className={styles.quickDateBtn}
                    onClick={() => handleQuickDate("now")}
                  >
                    Fijar Ahora
                  </button>
                  <button
                    type="button"
                    className={styles.quickDateBtn}
                    onClick={() => handleQuickDate("month_start")}
                  >
                    Inicio de Mes
                  </button>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  El consumo se acumulará a partir de este punto en el tiempo.
                </span>
              </div>

              {/* Clave de Acceso */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {editingBalance.provider === "claude"
                      ? "Admin Key (Claude)"
                      : editingBalance.provider === "openai"
                      ? "Admin Key (OpenAI)"
                      : "Management Key (OpenRouter)"}
                  </label>
                  {editingBalance.hasKey && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--brand-primary)",
                      }}
                    >
                      ✔{" "}
                      {editingBalance.keySource === "env"
                        ? editingBalance.envVarName
                        : "En Base de Datos"}{" "}
                      ({editingBalance.maskedKey})
                    </span>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={showAdminKey ? "text" : "password"}
                    placeholder={
                      editingBalance.hasKey
                        ? "Dejar en blanco para conservar clave actual"
                        : editingBalance.provider === "claude"
                        ? "sk-ant-admin..."
                        : editingBalance.provider === "openai"
                        ? "sk-admin-..."
                        : "sk-or-v1-..."
                    }
                    value={formAdminKey}
                    onChange={(e) => setFormAdminKey(e.target.value)}
                    className={styles.modalInput}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showAdminKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Explicación de autenticación para cada plataforma */}
                <div className={styles.helpCallout}>
                  {editingBalance.provider === "claude" && (
                    <>
                      <strong>Autenticación Claude:</strong> Requiere una{" "}
                      <code>Admin Key</code> (<code>sk-ant-admin...</code>). Solo
                      la pueden crear los administradores en{" "}
                      <strong>Console → Settings → Admin keys</strong>. Las
                      llaves de modelo normales (<code>sk-ant-api...</code>) no
                      tienen permisos para el Cost Report.
                    </>
                  )}
                  {editingBalance.provider === "openai" && (
                    <>
                      <strong>Autenticación OpenAI:</strong> Requiere una{" "}
                      <code>Admin Key</code> (<code>sk-admin-...</code>) con
                      permiso <code>api.usage.read</code> en{" "}
                      <strong>Organization Settings → Admin keys</strong>. Las
                      llaves estándar de proyecto (<code>sk-proj-...</code>) no
                      permiten consultar la Costs API.
                    </>
                  )}
                  {editingBalance.provider === "openrouter" && (
                    <>
                      <strong>Autenticación OpenRouter:</strong> Requiere una{" "}
                      <code>Management Key</code> (<code>sk-or-v1-...</code>) creada en{" "}
                      <strong>openrouter.ai/settings/management-keys</strong>. Las
                      Management Keys permiten consultar el saldo real de créditos y
                      el consumo total de la cuenta en vivo a través del endpoint{" "}
                      <code>/api/v1/credits</code>. También puedes configurarla como{" "}
                      <code>OPENROUTER_ADMIN_KEY</code> en las variables de entorno.
                    </>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setBalanceModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBalance}
                  className={styles.primaryBtn}
                >
                  {isSavingBalance
                    ? "Guardando y Calculando..."
                    : "Guardar y Calcular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

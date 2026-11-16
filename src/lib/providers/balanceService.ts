import { IProviderBalance, ProviderId } from "@/models/ProviderBalance";

export interface ResolvedKeyInfo {
  key: string;
  source: "database" | "env" | "none";
  envVarName?: string;
  maskedKey: string;
}

export function maskKey(key?: string): string {
  if (!key || key.trim().length === 0) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 10) return "••••••••";
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

export function resolveProviderKey(
  provider: ProviderId,
  dbKey?: string
): ResolvedKeyInfo {
  if (dbKey && dbKey.trim().length > 0) {
    return {
      key: dbKey.trim(),
      source: "database",
      maskedKey: maskKey(dbKey),
    };
  }

  if (provider === "claude") {
    const envVars = ["ANTHROPIC_ADMIN_KEY", "CLAUDE_ADMIN_KEY", "ANTHROPIC_API_KEY"];
    for (const v of envVars) {
      const val = process.env[v];
      if (val && val.trim().length > 0) {
        return {
          key: val.trim(),
          source: "env",
          envVarName: v,
          maskedKey: maskKey(val),
        };
      }
    }
  }

  if (provider === "openai") {
    const envVars = ["OPENAI_ADMIN_KEY", "OPENAI_API_KEY"];
    for (const v of envVars) {
      const val = process.env[v];
      if (val && val.trim().length > 0) {
        return {
          key: val.trim(),
          source: "env",
          envVarName: v,
          maskedKey: maskKey(val),
        };
      }
    }
  }

  if (provider === "openrouter") {
    const envVars = [
      "OPENROUTER_ADMIN_KEY",
      "OPENROUTER_MANAGEMENT_KEY",
      "OPENROUTER_API_KEY",
      "OPENROUTER_KEY",
    ];
    for (const v of envVars) {
      const val = process.env[v];
      if (val && val.trim().length > 0) {
        return {
          key: val.trim(),
          source: "env",
          envVarName: v,
          maskedKey: maskKey(val),
        };
      }
    }
  }

  return {
    key: "",
    source: "none",
    maskedKey: "",
  };
}

/**
 * Consulta la API de Anthropic (Cost Report)
 * GET https://api.anthropic.com/v1/organizations/cost_report?starting_at=...&bucket_width=1d
 * Requiere Admin Key: sk-ant-admin...
 */
export async function queryClaudeCost(
  adminKey: string,
  startDate: Date
): Promise<{ totalUsage: number; message: string; raw: unknown }> {
  const isoStart = startDate.toISOString();
  let totalUsage = 0;
  let page: string | null = null;
  let pages = 0;
  const maxPages = 10;

  do {
    const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
    url.searchParams.set("starting_at", isoStart);
    url.searchParams.set("bucket_width", "1d");
    if (page) {
      url.searchParams.set("page", page);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": adminKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Anthropic API error (${res.status}): ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        }
      } catch {}

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Error de autenticación en Claude: Se requiere una Admin Key (sk-ant-admin...). Detalle: ${msg}`
        );
      }
      throw new Error(msg);
    }

    const data = await res.json();
    if (Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.amount !== undefined) {
          totalUsage += parseFloat(String(item.amount)) || 0;
        } else if (item.amount_cents !== undefined) {
          totalUsage += (Number(item.amount_cents) || 0) / 100;
        }
      }
    }

    page = data.has_more && data.next_page ? data.next_page : null;
    pages++;
  } while (page && pages < maxPages);

  return {
    totalUsage: Number(totalUsage.toFixed(4)),
    message: `Consumo sincronizado ($${totalUsage.toFixed(2)} USD gastados desde ${startDate.toLocaleDateString()})`,
    raw: { pages, totalUsage },
  };
}

/**
 * Consulta la API de OpenAI (Organization Costs)
 * GET https://api.openai.com/v1/organization/costs?start_time=...&bucket_width=1d
 * Requiere Admin Key: sk-admin-... con scope api.usage.read
 */
export async function queryOpenAICost(
  adminKey: string,
  startDate: Date
): Promise<{ totalUsage: number; message: string; raw: unknown }> {
  // OpenAI limita el historial a 1 año máximo; protegemos contra reporting_lookback_exceeded
  const minAllowedTime = Math.floor(Date.now() / 1000) - 364 * 86400;
  const startTime = Math.max(Math.floor(startDate.getTime() / 1000), minAllowedTime);
  let totalUsage = 0;
  let page: string | null = null;
  let pages = 0;
  const maxPages = 10;

  do {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", startTime.toString());
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "180");
    if (page) {
      url.searchParams.set("page", page);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `OpenAI API error (${res.status}): ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        }
      } catch {}

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Error de autenticación en OpenAI: Se requiere una Admin Key (sk-admin-...). Detalle: ${msg}`
        );
      }
      throw new Error(msg);
    }

    const data = await res.json();
    if (Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.amount?.value !== undefined) {
          totalUsage += Number(item.amount.value) || 0;
        } else if (typeof item.amount === "number") {
          totalUsage += item.amount;
        } else if (Array.isArray(item.results)) {
          for (const r of item.results) {
            if (r.amount?.value !== undefined) {
              totalUsage += Number(r.amount.value) || 0;
            } else if (typeof r.amount === "number") {
              totalUsage += r.amount;
            }
          }
        }
      }
    }

    page = data.has_more && data.next_page ? data.next_page : null;
    pages++;
  } while (page && pages < maxPages);

  return {
    totalUsage: Number(totalUsage.toFixed(4)),
    message: `Consumo sincronizado ($${totalUsage.toFixed(2)} USD gastados desde ${startDate.toLocaleDateString()})`,
    raw: { pages, totalUsage },
  };
}

/**
 * Consulta la API de OpenRouter (Credits & Account details)
 * GET https://openrouter.ai/api/v1/credits
 * Requiere Management Key (sk-or-v1-...) creada en openrouter.ai/settings/management-keys
 * Retorna directamente los créditos totales y el uso global, calculando el saldo disponible.
 */
export async function queryOpenRouterCredits(
  apiKey: string
): Promise<{
  totalUsage: number;
  remaining: number;
  totalCredits: number;
  message: string;
  raw: unknown;
}> {
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `OpenRouter API error (${res.status}): ${res.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) msg = parsed.error.message;
    } catch {}

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Error de autenticación en OpenRouter: Se requiere una Management Key (creada en openrouter.ai/settings/management-keys). Detalle: ${msg}`
      );
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const totalCredits = Number(data.data?.total_credits ?? 0);
  const totalUsage = Number(data.data?.total_usage ?? 0);
  const remaining = Math.max(0, totalCredits - totalUsage);

  return {
    totalUsage: Number(totalUsage.toFixed(4)),
    remaining: Number(remaining.toFixed(4)),
    totalCredits: Number(totalCredits.toFixed(4)),
    message: `Créditos en cuenta: $${totalCredits.toFixed(2)} USD | Consumo acumulado: $${totalUsage.toFixed(4)} USD`,
    raw: data,
  };
}

/**
 * Recalcula el saldo restante para un ProviderBalance dado
 */
export async function recalculateBalance(
  doc: IProviderBalance,
  keyOverride?: string
): Promise<{
  usage: number;
  remaining: number;
  status: "success" | "warning" | "error" | "pending";
  message: string;
  raw?: unknown;
}> {
  const resolved = resolveProviderKey(
    doc.provider,
    keyOverride !== undefined ? keyOverride : doc.admin_key
  );

  if (!resolved.key) {
    return {
      usage: doc.last_calculated_usage || 0,
      remaining: doc.initial_balance || 0,
      status: "pending",
      message: `No hay clave configurada para ${doc.label}. Ingresa una clave en la configuración o define la variable de entorno correspondiente.`,
    };
  }

  try {
    const startDate = doc.start_date ? new Date(doc.start_date) : new Date();

    if (doc.provider === "claude") {
      const res = await queryClaudeCost(resolved.key, startDate);
      const remaining = Math.max(0, (doc.initial_balance || 0) - res.totalUsage);
      return {
        usage: res.totalUsage,
        remaining: Number(remaining.toFixed(4)),
        status: remaining <= 2 ? "warning" : "success",
        message: res.message,
        raw: res.raw,
      };
    }

    if (doc.provider === "openai") {
      const res = await queryOpenAICost(resolved.key, startDate);
      const remaining = Math.max(0, (doc.initial_balance || 0) - res.totalUsage);
      return {
        usage: res.totalUsage,
        remaining: Number(remaining.toFixed(4)),
        status: remaining <= 2 ? "warning" : "success",
        message: res.message,
        raw: res.raw,
      };
    }

    if (doc.provider === "openrouter") {
      const res = await queryOpenRouterCredits(resolved.key);
      doc.initial_balance = res.totalCredits;
      return {
        usage: res.totalUsage,
        remaining: res.remaining,
        status: res.remaining <= 2 && res.totalCredits > 0 ? "warning" : "success",
        message: res.message,
        raw: res.raw,
      };
    }

    return {
      usage: 0,
      remaining: 0,
      status: "error",
      message: "Proveedor no soportado",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      usage: doc.last_calculated_usage || 0,
      remaining: doc.last_calculated_remaining || doc.initial_balance || 0,
      status: "error",
      message: errorMessage,
    };
  }
}


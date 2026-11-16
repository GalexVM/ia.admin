import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SharedView } from "@/models/SharedView";
import { TenantConfig } from "@/models/TenantConfig";

interface RouteContext {
  params: Promise<{ token: string }>;
}

function getCandidateEnvironmentSlugs(tenant: {
  company_name?: string;
  chatbot_name?: string;
  chatbot_url?: string;
}): string[] {
  const slugs = new Set<string>();

  if (tenant.chatbot_url) {
    try {
      const parsed = new URL(tenant.chatbot_url);
      const segments = parsed.pathname
        .split("/")
        .map((s) => s.trim().toLowerCase())
        .filter(
          (s) =>
            s.length > 0 &&
            !["configuration", "count-leads", "range", "api", "v1", "v2"].includes(s)
        );

      for (const seg of segments) {
        const clean = seg.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
        if (clean) slugs.add(clean);
      }
    } catch {
      const parts = tenant.chatbot_url.split(/[/:]+/);
      for (const part of parts) {
        const p = part.trim().toLowerCase();
        if (
          p &&
          ![
            "http",
            "https",
            "localhost",
            "host.docker.internal",
            "configuration",
            "count-leads",
            "range",
            "api",
          ].includes(p)
        ) {
          const clean = p.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
          if (clean) slugs.add(clean);
        }
      }
    }
  }

  if (tenant.company_name) {
    const raw = tenant.company_name.trim();
    const full = raw
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_");
    if (full) slugs.add(full);

    const words = raw.split(/\s+/).map((w) => w.toUpperCase().replace(/[^A-Z0-9_]/g, ""));
    for (const w of words) {
      if (w.length >= 2) slugs.add(w);
    }
  }

  return Array.from(slugs);
}

function resolveEnvironmentPassword(tenant: {
  company_name?: string;
  chatbot_name?: string;
  chatbot_url?: string;
}): string | undefined {
  const slugs = getCandidateEnvironmentSlugs(tenant);
  const suffixes = ["_ADMIN_KEY", "_ADMIN_PASSWORD", "_API_KEY", "_KEY", "_PASSWORD"];

  for (const slug of slugs) {
    for (const suffix of suffixes) {
      const envKey = `${slug}${suffix}`;
      const val = process.env[envKey];
      if (val && val.trim()) {
        return val.trim();
      }
    }
  }

  const globalFallbackKeys = [
    "ENDPOINT_ADMIN_PASSWORD",
    "CHATBOT_ADMIN_PASSWORD",
    "ADMIN_KEY",
  ];

  for (const key of globalFallbackKeys) {
    const val = process.env[key];
    if (val && val.trim()) {
      return val.trim();
    }
  }

  return undefined;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ success: false, error: "Falta token de vista" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id")?.trim();
    const startDate = searchParams.get("start_date")?.trim();
    const endDate = searchParams.get("end_date")?.trim();

    if (!tenantId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Parámetros incompletos (tenant_id, start_date, end_date)" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const view = await SharedView.findOne({ token, is_active: true });

    if (!view) {
      return NextResponse.json(
        { success: false, error: "Vista no encontrada o enlace inactivo" },
        { status: 404 }
      );
    }

    // Verificar que el tenant esté autorizado en esta vista
    if (!view.included_tenants.includes(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Entorno no incluido en esta vista" },
        { status: 403 }
      );
    }

    const tenant = await TenantConfig.findById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Entorno no encontrado" },
        { status: 404 }
      );
    }

    if (!tenant.chatbot_url || !tenant.chatbot_url.trim()) {
      return NextResponse.json(
        { success: false, error: "Entorno sin servicio de chatbot enlazado" },
        { status: 400 }
      );
    }

    // Resolver URL del endpoint /count-leads/range/{start_date}/{end_date}
    let baseUrl = tenant.chatbot_url.trim();
    if (baseUrl.includes("/configuration")) {
      baseUrl = baseUrl.replace(/\/configuration\/?$/, "");
    }
    baseUrl = baseUrl.replace(/\/+$/, "");

    if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
      baseUrl = baseUrl
        .replace("127.0.0.1", "host.docker.internal")
        .replace("localhost", "host.docker.internal");
    }

    const targetUrl = `${baseUrl}/count-leads/range/${encodeURIComponent(
      startDate
    )}/${encodeURIComponent(endDate)}`;

    const password = resolveEnvironmentPassword(tenant);

    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (password) {
      headers["x-admin-password"] = password;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({
        success: false,
        error: `El servicio remoto no devolvió datos estructurados (HTTP ${response.status})`,
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.detail || data.error || `HTTP ${response.status}`,
      });
    }

    let finalCount = 0;
    if (typeof data === "number") {
      finalCount = data;
    } else if (data && typeof data === "object") {
      if (typeof data.count === "number") finalCount = data.count;
      else if (typeof data.total === "number") finalCount = data.total;
      else if (typeof data.leads_count === "number") finalCount = data.leads_count;
      else if (typeof data.result === "number") finalCount = data.result;
    }

    return NextResponse.json({
      success: true,
      count: finalCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { success: false, error: `Error de conexión: ${msg}` },
      { status: 502 }
    );
  }
}


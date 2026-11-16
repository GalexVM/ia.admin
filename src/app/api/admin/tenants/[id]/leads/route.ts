import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Extrae los posibles identificadores o slugs del entorno para buscar variables de entorno.
 * Por ejemplo:
 * - https://ia.zefiron.com/demo/configuration -> ["DEMO"]
 * - company_name: "demo" -> ["DEMO"]
 * - company_name: "Inmobiliaria Panorama" -> ["INMOBILIARIA_PANORAMA", "PANORAMA", "INMOBILIARIA"]
 */
function getCandidateEnvironmentSlugs(tenant: {
  company_name?: string;
  chatbot_name?: string;
  chatbot_url?: string;
}): string[] {
  const slugs = new Set<string>();

  // 1. Extraer desde la URL del chatbot (ej. /demo/configuration -> DEMO)
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

  // 2. Extraer desde company_name (ej. "demo" -> "DEMO")
  if (tenant.company_name) {
    const raw = tenant.company_name.trim();
    const full = raw
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_");
    if (full) slugs.add(full);

    // Palabras individuales de al menos 2 letras
    const words = raw.split(/\s+/).map((w) => w.toUpperCase().replace(/[^A-Z0-9_]/g, ""));
    for (const w of words) {
      if (w.length >= 2) slugs.add(w);
    }
  }

  // 3. Extraer desde chatbot_name
  if (tenant.chatbot_name) {
    const clean = tenant.chatbot_name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (clean && clean !== "ZEFI" && clean !== "ZEFIRON" && clean !== "BOT") {
      slugs.add(clean);
    }
  }

  return Array.from(slugs);
}

/**
 * Resuelve la contraseña del entorno buscando primero por el nombre del entorno
 * (ej. DEMO_ADMIN_KEY para el entorno demo), luego alternativas y fallbacks.
 */
function resolveEnvironmentPassword(
  tenant: { company_name?: string; chatbot_name?: string; chatbot_url?: string },
  queryPassword?: string | null
): { password?: string; matchedKey?: string } {
  // 1. Si se envía una contraseña explícita en la consulta, tiene prioridad máxima
  if (queryPassword && queryPassword.trim()) {
    return { password: queryPassword.trim(), matchedKey: "QUERY_OVERRIDE" };
  }

  const slugs = getCandidateEnvironmentSlugs(tenant);

  // 2. Probar variables específicas del entorno:
  // e.g. DEMO_ADMIN_KEY, DEMO_ADMIN_PASSWORD, DEMO_API_KEY, DEMO_KEY, DEMO_PASSWORD
  const suffixes = ["_ADMIN_KEY", "_ADMIN_PASSWORD", "_API_KEY", "_KEY", "_PASSWORD"];

  for (const slug of slugs) {
    for (const suffix of suffixes) {
      const envKey = `${slug}${suffix}`;
      const val = process.env[envKey];
      if (val && val.trim()) {
        return { password: val.trim(), matchedKey: envKey };
      }
    }
  }

  // 3. Fallbacks genéricos para endpoints
  const globalFallbackKeys = [
    "ENDPOINT_ADMIN_PASSWORD",
    "CHATBOT_ADMIN_PASSWORD",
    "ADMIN_KEY",
  ];

  for (const key of globalFallbackKeys) {
    const val = process.env[key];
    if (val && val.trim()) {
      return { password: val.trim(), matchedKey: key };
    }
  }

  // Si está vacía o no existe, se intentará jalar sin contraseña
  return { password: undefined, matchedKey: undefined };
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta el ID del tenant" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date")?.trim();
    const endDate = searchParams.get("end_date")?.trim();
    const queryPassword = searchParams.get("password")?.trim();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Debe proporcionar start_date y end_date" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const tenant = await TenantConfig.findById(id).lean();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    if (!tenant.chatbot_url || !tenant.chatbot_url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "El entorno no tiene configurado un endpoint de chatbot",
        },
        { status: 400 }
      );
    }

    // 1. Limpiar la URL base
    const rawUrl = tenant.chatbot_url.trim();
    const baseUrl = rawUrl
      .replace(/\/configuration\/?$/, "")
      .replace(/\/+$/, "");

    const targetUrl = `${baseUrl}/count-leads/range/${encodeURIComponent(
      startDate
    )}/${encodeURIComponent(endDate)}`;

    // 2. Resolver la contraseña buscando por nombre de entorno (ej. DEMO_ADMIN_KEY)
    const { password: resolvedPassword, matchedKey } = resolveEnvironmentPassword(
      tenant,
      queryPassword
    );

    const headers: Record<string, string> = {
      accept: "application/json",
    };

    const hasPassword = Boolean(resolvedPassword && resolvedPassword.trim());
    if (hasPassword && resolvedPassword) {
      headers["x-admin-password"] = resolvedPassword.trim();
    }

    // Función auxiliar para llamar al endpoint con soporte de timeout
    const executeFetch = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let remoteRes: Response;

    try {
      remoteRes = await executeFetch(targetUrl);
    } catch (initialErr: unknown) {
      // Fallback localhost -> host.docker.internal si corre en Docker
      if (
        (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1")) &&
        process.env.NODE_ENV !== "test"
      ) {
        const dockerUrl = targetUrl
          .replace("localhost", "host.docker.internal")
          .replace("127.0.0.1", "host.docker.internal");
        try {
          remoteRes = await executeFetch(dockerUrl);
        } catch {
          throw initialErr;
        }
      } else {
        throw initialErr;
      }
    }

    if (!remoteRes.ok) {
      if (remoteRes.status === 401 || remoteRes.status === 403) {
        const candidateSlugs = getCandidateEnvironmentSlugs(tenant);
        const expectedHint = candidateSlugs.length > 0 ? `${candidateSlugs[0]}_ADMIN_KEY` : "ADMIN_KEY";
        return NextResponse.json({
          success: false,
          statusCode: remoteRes.status,
          error: hasPassword
            ? `Acceso no autorizado (401): la clave en ${matchedKey || "x-admin-password"} no fue aceptada`
            : `El endpoint requiere autenticación (401). Configura ${expectedHint} en tus variables de entorno`,
          targetUrl,
          hasPassword,
          matchedKey,
        });
      }

      if (remoteRes.status === 404) {
        return NextResponse.json({
          success: false,
          statusCode: 404,
          error: "El endpoint /count-leads/range/... no fue encontrado (404)",
          targetUrl,
          matchedKey,
        });
      }

      return NextResponse.json({
        success: false,
        statusCode: remoteRes.status,
        error: `El endpoint respondió con error HTTP ${remoteRes.status}`,
        targetUrl,
        matchedKey,
      });
    }

    // Procesar la respuesta del endpoint
    const rawData = await remoteRes.json().catch(() => null);

    // Extraer el conteo de leads numérico
    let leadCount: number | null = null;

    if (typeof rawData === "number") {
      leadCount = rawData;
    } else if (rawData && typeof rawData === "object") {
      if (typeof rawData.usuarios_encontrados === "number") {
        leadCount = rawData.usuarios_encontrados;
      } else if (typeof rawData.leads === "number") {
        leadCount = rawData.leads;
      } else if (typeof rawData.count === "number") {
        leadCount = rawData.count;
      } else if (rawData.error) {
        return NextResponse.json({
          success: false,
          error: String(rawData.error),
          targetUrl,
          matchedKey,
          raw: rawData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: leadCount ?? 0,
      targetUrl,
      startDate,
      endDate,
      hasPassword,
      matchedKey: matchedKey || null,
      raw: rawData,
    });
  } catch (error: unknown) {
    console.error("Error al consultar conteo de leads:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        success: false,
        error: `No se pudo conectar con el endpoint remoto: ${message}`,
      },
      { status: 502 }
    );
  }
}

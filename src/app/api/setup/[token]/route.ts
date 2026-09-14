import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    await connectToDatabase();
    const tenant = await TenantConfig.findOne({ token }).lean();

    if (!tenant) {
      return NextResponse.json(
        { error: "Token de configuración inválido o enlace caducado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        token: tenant.token,
        company_name: tenant.company_name,
        chatbot_name: tenant.chatbot_name,
        chatbot_url: tenant.chatbot_url,
        status: tenant.status,
        configuration: tenant.configuration,
        last_synced_at: tenant.last_synced_at,
      },
    });
  } catch (error) {
    console.error("Error al obtener datos de onboarding:", error);
    return NextResponse.json(
      { error: "Error interno al verificar el token" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    await connectToDatabase();
    const tenant = await TenantConfig.findOne({ token });

    if (!tenant) {
      return NextResponse.json(
        { error: "El registro para este token no existe" },
        { status: 404 }
      );
    }

    const { company_profile, bot_persona, rules_features } = body;

    // Actualizar campos base y configuración interna
    if (company_profile?.company_name) {
      tenant.company_name = company_profile.company_name;
    }
    if (bot_persona?.chatbot_name) {
      tenant.chatbot_name = bot_persona.chatbot_name;
    }

    tenant.configuration = {
      company_profile: {
        company_name: company_profile?.company_name || tenant.company_name,
        industry: company_profile?.industry || "",
        description: company_profile?.description || "",
        website: company_profile?.website || "",
        contact_email: company_profile?.contact_email || "",
        phone: company_profile?.phone || "",
      },
      bot_persona: {
        chatbot_name: bot_persona?.chatbot_name || tenant.chatbot_name,
        fallback_agent: bot_persona?.fallback_agent || "",
        writing_tone: bot_persona?.writing_tone || "friendly",
        language: bot_persona?.language || "es",
        welcome_message: bot_persona?.welcome_message || "",
        fallback_message: bot_persona?.fallback_message || "",
      },
      rules_features: {
        enable_lead_capture: rules_features?.enable_lead_capture ?? true,
        enable_booking: rules_features?.enable_booking ?? true,
        enable_human_escalation: rules_features?.enable_human_escalation ?? true,
        enable_faq: rules_features?.enable_faq ?? true,
        business_hours: {
          enabled: rules_features?.business_hours?.enabled ?? false,
          schedule: rules_features?.business_hours?.schedule || "Lunes a Viernes 09:00 - 18:00",
        },
        custom_rules: rules_features?.custom_rules || "",
        banned_topics: rules_features?.banned_topics || "",
      },
      raw_config: tenant.configuration?.raw_config || {},
    };

    let syncResult = {
      syncedDirectly: false,
      message: "Configuración guardada en base de datos. El chatbot la sincronizará al iniciar.",
    };

    // Capa de Sincronización Remota
    if (tenant.chatbot_url && tenant.chatbot_url.trim().startsWith("http")) {
      const targetUrl = tenant.chatbot_url.trim().endsWith("/configuration")
        ? tenant.chatbot_url.trim()
        : `${tenant.chatbot_url.trim().replace(/\/+$/, "")}/configuration`;

      const remotePayload = {
        company_name: tenant.configuration.company_profile.company_name,
        chatbot_name: tenant.configuration.bot_persona.chatbot_name,
        fallback_agent: tenant.configuration.bot_persona.fallback_agent,
        writing_tone: tenant.configuration.bot_persona.writing_tone,
        language: tenant.configuration.bot_persona.language,
        welcome_message: tenant.configuration.bot_persona.welcome_message,
        fallback_message: tenant.configuration.bot_persona.fallback_message,
        company_profile: tenant.configuration.company_profile,
        rules_features: tenant.configuration.rules_features,
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const remoteRes = await fetch(targetUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(remotePayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (remoteRes.ok) {
          tenant.status = "synced";
          tenant.last_synced_at = new Date();
          tenant.sync_history.push({
            synced_at: new Date(),
            status: "success",
            message: `Sincronización remota exitosa hacia ${targetUrl}`,
          });
          syncResult = {
            syncedDirectly: true,
            message: "Configuración guardada y sincronizada directamente con el chatbot en vivo.",
          };
        } else {
          tenant.status = "error";
          const errText = await remoteRes.text().catch(() => "");
          tenant.sync_history.push({
            synced_at: new Date(),
            status: "failed",
            message: `Fallo en respuesta remota (HTTP ${remoteRes.status}): ${errText.slice(0, 200)}`,
          });
          syncResult = {
            syncedDirectly: false,
            message: `Guardado en DB, pero el chatbot devolvió código HTTP ${remoteRes.status}. Se reintentará luego.`,
          };
        }
      } catch (syncErr: unknown) {
        tenant.status = "error";
        const errMsg = syncErr instanceof Error ? syncErr.message : "Timeout o error de conexión";
        tenant.sync_history.push({
          synced_at: new Date(),
          status: "failed",
          message: `No se pudo alcanzar el endpoint remoto (${targetUrl}): ${errMsg}`,
        });
        syncResult = {
          syncedDirectly: false,
          message: `Guardado en base de datos. No se pudo conectar al endpoint en vivo (${errMsg}).`,
        };
      }
    } else {
      tenant.status = "configured";
      tenant.sync_history.push({
        synced_at: new Date(),
        status: "success",
        message: "Guardado en DB para aprovisionamiento diferido (sin chatbot_url asignada aún)",
      });
    }

    await tenant.save();

    return NextResponse.json({
      success: true,
      status: tenant.status,
      ...syncResult,
    });
  } catch (error) {
    console.error("Error al guardar configuración de onboarding:", error);
    return NextResponse.json(
      { error: "Error interno al guardar la configuración" },
      { status: 500 }
    );
  }
}

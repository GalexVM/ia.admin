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

    const { configuration, company_name, chatbot_name } = body;

    // Actualizar nombre de empresa y bot
    if (company_name) {
      tenant.company_name = company_name;
    } else if (configuration?.company_name) {
      tenant.company_name = configuration.company_name;
    }

    if (chatbot_name) {
      tenant.chatbot_name = chatbot_name;
    } else if (configuration?.chatbot_name) {
      tenant.chatbot_name = configuration.chatbot_name;
    }

    // Actualizar configuración preservando valores previos (como Cat. 10 de devs)
    if (configuration && typeof configuration === "object") {
      tenant.configuration = {
        ...(tenant.configuration || {}),
        ...configuration,
      };
      tenant.markModified("configuration");
    }

    let syncResult = {
      syncedDirectly: false,
      message: "Configuración guardada en base de datos. El chatbot la sincronizará al iniciar.",
    };

    // Capa de Sincronización Remota
    if (tenant.chatbot_url && tenant.chatbot_url.trim().startsWith("http")) {
      const rawUrl = tenant.chatbot_url.trim();
      const targetUrl = rawUrl.endsWith("/configuration")
        ? rawUrl
        : `${rawUrl.replace(/\/+$/, "")}/configuration`;

      try {
        // 1. Obtener configuración actual del bot para evitar error 422 por campos faltantes
        let fullConfigToSync = tenant.configuration;
        try {
          const getRes = await fetch(targetUrl, {
            method: "GET",
            headers: { accept: "application/json" },
          });
          if (getRes.ok) {
            const remoteConfig = await getRes.json();
            if (remoteConfig && typeof remoteConfig === "object") {
              fullConfigToSync = { ...remoteConfig, ...tenant.configuration };
              // También guardamos la config completa en la BD
              tenant.configuration = fullConfigToSync;
              tenant.markModified("configuration");
            }
          }
        } catch (getErr) {
          console.warn("No se pudo obtener config remota previa al PUT:", getErr);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const remoteRes = await fetch(targetUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(fullConfigToSync),
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

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del tenant" }, { status: 400 });
    }

    await connectToDatabase();
    const tenant = await TenantConfig.findById(id).lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error("Error al obtener tenant:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el tenant" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del tenant" }, { status: 400 });
    }

    await connectToDatabase();
    const tenant = await TenantConfig.findById(id);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    const {
      company_name,
      chatbot_name,
      chatbot_url,
      configuration,
      syncToRemote = true,
    } = body;

    // Actualizar campos base
    if (company_name !== undefined) {
      tenant.company_name = company_name.trim();
    }
    if (chatbot_name !== undefined) {
      tenant.chatbot_name = chatbot_name.trim();
    }
    if (chatbot_url !== undefined) {
      tenant.chatbot_url = chatbot_url.trim();
    }

    // Fusionar configuración preservando cualquier clave previa (incluyendo Cat. 10 si no se editó)
    if (configuration && typeof configuration === "object") {
      tenant.configuration = {
        ...(tenant.configuration || {}),
        ...configuration,
      };
      tenant.markModified("configuration");
    }

    let syncResult = {
      syncedDirectly: false,
      message: "Configuración guardada en la base de datos.",
      statusCode: 200,
      details: "",
    };

    // Sincronización remota PUT a /configuration si tiene chatbot_url
    if (syncToRemote && tenant.chatbot_url && tenant.chatbot_url.trim().startsWith("http")) {
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

        const responseText = await remoteRes.text().catch(() => "");
        let responseJson = null;
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          // No es json
        }

        if (remoteRes.ok) {
          tenant.status = "synced";
          tenant.last_synced_at = new Date();
          tenant.sync_history.push({
            synced_at: new Date(),
            status: "success",
            message: `PUT exitoso a ${targetUrl} (HTTP ${remoteRes.status})`,
          });
          syncResult = {
            syncedDirectly: true,
            message: `Configuración sincronizada exitosamente con el chatbot en vivo (${targetUrl}).`,
            statusCode: remoteRes.status,
            details: responseJson ? JSON.stringify(responseJson) : responseText,
          };
        } else {
          tenant.status = "error";
          tenant.sync_history.push({
            synced_at: new Date(),
            status: "failed",
            message: `Fallo PUT a ${targetUrl} (HTTP ${remoteRes.status}): ${responseText.slice(0, 300)}`,
          });
          syncResult = {
            syncedDirectly: false,
            message: `Guardado en base de datos, pero el bot devolvió HTTP ${remoteRes.status}.`,
            statusCode: remoteRes.status,
            details: responseText.slice(0, 500),
          };
        }
      } catch (syncErr: unknown) {
        tenant.status = "error";
        const errMsg = syncErr instanceof Error ? syncErr.message : "Error desconocido de conexión";
        tenant.sync_history.push({
          synced_at: new Date(),
          status: "failed",
          message: `Error al conectar con ${targetUrl}: ${errMsg}`,
        });
        syncResult = {
          syncedDirectly: false,
          message: `Guardado en base de datos, pero falló la conexión con ${targetUrl}: ${errMsg}`,
          statusCode: 504,
          details: errMsg,
        };
      }
    } else if (!tenant.chatbot_url) {
      tenant.status = "configured";
      tenant.sync_history.push({
        synced_at: new Date(),
        status: "success",
        message: "Guardado en DB (sin chatbot_url asignada para sincronización remota)",
      });
    }

    await tenant.save();

    return NextResponse.json({
      success: true,
      tenant,
      syncResult,
    });
  } catch (error) {
    console.error("Error al actualizar tenant:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del tenant" }, { status: 400 });
    }

    await connectToDatabase();
    const result = await TenantConfig.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Tenant eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar tenant:", error);
    return NextResponse.json(
      { error: "Error interno al eliminar el tenant" },
      { status: 500 }
    );
  }
}

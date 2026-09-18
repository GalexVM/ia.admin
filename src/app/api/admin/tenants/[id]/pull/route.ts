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

    if (!tenant.chatbot_url) {
      return NextResponse.json({ error: "El tenant no tiene chatbot_url configurado" }, { status: 400 });
    }

    const rawUrl = tenant.chatbot_url.trim();
    const targetUrl = rawUrl.endsWith("/configuration")
      ? rawUrl
      : `${rawUrl.replace(/\/+$/, "")}/configuration`;

    const getRes = await fetch(targetUrl, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    if (!getRes.ok) {
      return NextResponse.json({ error: `El endpoint devolvió HTTP ${getRes.status}` }, { status: getRes.status });
    }

    const remoteConfig = await getRes.json();

    return NextResponse.json({ success: true, configuration: remoteConfig });
  } catch (error) {
    console.error("Error al hacer pull de configuración:", error);
    return NextResponse.json(
      { error: "Error interno al traer los datos del endpoint" },
      { status: 500 }
    );
  }
}

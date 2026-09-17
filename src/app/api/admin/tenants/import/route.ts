import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "Falta la URL para importar" }, { status: 400 });
    }

    // 1. Fetch configuration from URL
    const response = await fetch(url, {
      headers: { accept: "application/json" }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Error al obtener configuración de la URL (${response.status})` }, { status: 400 });
    }

    const configData = await response.json();
    
    // Extract the name from the URL, e.g., "demo" from "ia.zefiron.com/demo/configuration"
    let urlName = "Cliente Importado";
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[segments.length - 1] === "configuration") {
        urlName = segments[segments.length - 2];
      } else if (segments.length > 0) {
        urlName = segments[0];
      }
    } catch (e) {
      console.error("Error parsing URL to extract name", e);
    }
    
    const companyName = urlName;
    const chatbotName = configData.chatbot_name || "Zefiron Bot";
    
    // 2. Generate a token
    const token = crypto.randomBytes(8).toString("hex");

    // 3. Create Tenant
    const newTenant = await TenantConfig.create({
      token,
      company_name: companyName,
      chatbot_name: chatbotName,
      chatbot_url: url,
      status: "configured",
      configuration: configData,
      sync_history: [
        {
          synced_at: new Date(),
          status: "success",
          message: "Importación inicial desde URL externa",
        }
      ],
      last_synced_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      message: "Tenant importado exitosamente",
    });
  } catch (error) {
    console.error("Error al importar tenant:", error);
    return NextResponse.json(
      { error: "Error interno al importar la configuración" },
      { status: 500 }
    );
  }
}

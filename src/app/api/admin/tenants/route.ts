import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

export async function GET() {
  try {
    await connectToDatabase();
    const tenants = await TenantConfig.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, tenants });
  } catch (error) {
    console.error("Error al listar tenants:", error);
    return NextResponse.json(
      { error: "Error al recuperar la lista de clientes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { company_name, chatbot_url } = body;

    // Generar un token único y amigable para URLs (12 bytes hex)
    const token = crypto.randomBytes(8).toString("hex");

    const newTenant = await TenantConfig.create({
      token,
      company_name: company_name?.trim() || "Nuevo Cliente",
      chatbot_name: "Zefiron Bot",
      chatbot_url: chatbot_url?.trim() || "",
      status: "pending_onboarding",
      configuration: {
        company_name: company_name?.trim() || "",
        chatbot_name: "Zefiron Bot",
        writing_tone: "friendly",
        enable_budget: true,
        enable_module_visit: true,
        enabled_scoring: true,
        // Al quedar vacío, el frontend (o Python) rellenará el resto.
      },
    });

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      message: "Tenant creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear tenant:", error);
    return NextResponse.json(
      { error: "Error interno al crear el nuevo tenant" },
      { status: 500 }
    );
  }
}

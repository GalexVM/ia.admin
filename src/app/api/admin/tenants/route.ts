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
        company_profile: {
          company_name: company_name?.trim() || "",
          industry: "",
          description: "",
          website: "",
          contact_email: "",
          phone: "",
        },
        bot_persona: {
          chatbot_name: "Zefiron Bot",
          fallback_agent: "",
          writing_tone: "friendly",
          language: "es",
          welcome_message: "¡Hola! Bienvenido a nuestro canal de atención. ¿En qué podemos ayudarte hoy?",
          fallback_message: "Disculpa, no logré entender tu consulta. Un asesor humano te asistirá en breve.",
        },
        rules_features: {
          enable_lead_capture: true,
          enable_booking: true,
          enable_human_escalation: true,
          enable_faq: true,
          business_hours: {
            enabled: false,
            schedule: "Lunes a Viernes 09:00 - 18:00",
          },
          custom_rules: "",
          banned_topics: "",
        },
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

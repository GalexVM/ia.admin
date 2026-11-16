import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig, DEFAULT_TENANT_CONFIGURATION } from "@/models/TenantConfig";
import { TenantCutoff } from "@/models/TenantCutoff";

export async function GET() {
  try {
    await connectToDatabase();
    const [tenants, cutoffs] = await Promise.all([
      TenantConfig.find({}).sort({ createdAt: -1 }).lean(),
      TenantCutoff.find({}).lean(),
    ]);

    const cutoffMap = new Map(cutoffs.map((c) => [c.tenant_id, c.cutoff_day]));

    const enrichedTenants = tenants.map((t) => ({
      ...t,
      cutoff_day: cutoffMap.get(String(t._id)) ?? t.cutoff_day ?? 25,
    }));

    return NextResponse.json({ success: true, tenants: enrichedTenants });
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
    const resolvedCompanyName = company_name?.trim() || "Nuevo Cliente";

    const newTenant = await TenantConfig.create({
      token,
      company_name: resolvedCompanyName,
      chatbot_name: "Zefi",
      chatbot_url: chatbot_url?.trim() || "",
      status: "pending_onboarding",
      configuration: {
        ...DEFAULT_TENANT_CONFIGURATION,
        company_name: resolvedCompanyName,
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

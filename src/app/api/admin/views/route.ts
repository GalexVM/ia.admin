import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { SharedView } from "@/models/SharedView";
import { TenantConfig } from "@/models/TenantConfig";

export async function GET() {
  try {
    await connectToDatabase();
    const views = await SharedView.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error("Error al listar vistas:", error);
    return NextResponse.json(
      { error: "Error al recuperar las vistas compartidas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { title, included_providers, included_tenants } = body;

    const token = crypto.randomBytes(10).toString("hex");
    const resolvedTitle = title && String(title).trim().length > 0
      ? String(title).trim()
      : "Vista Ejecutiva";

    // Validar tenants
    const cleanTenants: string[] = Array.isArray(included_tenants)
      ? included_tenants.map(String).filter((id) => id.length > 0)
      : [];

    // Validar providers
    const validProviders = ["claude", "openai", "openrouter"];
    const cleanProviders: string[] = Array.isArray(included_providers)
      ? included_providers
          .map(String)
          .filter((p) => validProviders.includes(p))
      : [];

    const newView = await SharedView.create({
      token,
      title: resolvedTitle,
      included_providers: cleanProviders,
      included_tenants: cleanTenants,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      view: newView,
      message: "Vista creada exitosamente",
    });
  } catch (error) {
    console.error("Error al crear vista compartida:", error);
    return NextResponse.json(
      { error: "Error interno al crear la vista" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SharedView } from "@/models/SharedView";
import { TenantConfig } from "@/models/TenantConfig";
import { TenantCutoff } from "@/models/TenantCutoff";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ success: false, error: "Falta token de vista" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, cutoff_day } = body;

    if (!tenant_id || cutoff_day === undefined) {
      return NextResponse.json(
        { success: false, error: "Se requiere tenant_id y cutoff_day" },
        { status: 400 }
      );
    }

    const parsedCutoff = parseInt(String(cutoff_day), 10);
    if (isNaN(parsedCutoff) || parsedCutoff < 1 || parsedCutoff > 31) {
      return NextResponse.json(
        { success: false, error: "El día de corte debe estar entre 1 y 31" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const view = await SharedView.findOne({ token, is_active: true });

    if (!view) {
      return NextResponse.json(
        { success: false, error: "Vista no encontrada o enlace inactivo" },
        { status: 404 }
      );
    }

    if (!view.included_tenants.includes(tenant_id)) {
      return NextResponse.json(
        { success: false, error: "Entorno no incluido en esta vista" },
        { status: 403 }
      );
    }

    const tenant = await TenantConfig.findById(tenant_id);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Entorno no encontrado" },
        { status: 404 }
      );
    }

    tenant.cutoff_day = parsedCutoff;
    await tenant.save();

    await TenantCutoff.findOneAndUpdate(
      { tenant_id: String(tenant._id) },
      { cutoff_day: parsedCutoff, company_name: tenant.company_name },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      cutoff_day: parsedCutoff,
      message: "Día de corte actualizado",
    });
  } catch (error) {
    console.error("Error al actualizar corte en vista:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar día de corte" },
      { status: 500 }
    );
  }
}


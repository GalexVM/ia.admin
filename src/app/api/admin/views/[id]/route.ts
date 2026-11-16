import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SharedView } from "@/models/SharedView";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de la vista" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, included_providers, included_tenants } = body;

    await connectToDatabase();
    const view = await SharedView.findById(id);

    if (!view) {
      return NextResponse.json({ error: "Vista no encontrada" }, { status: 404 });
    }

    if (title !== undefined && String(title).trim().length > 0) {
      view.title = String(title).trim();
    }

    if (Array.isArray(included_providers)) {
      const validProviders = ["claude", "openai", "openrouter"];
      view.included_providers = included_providers
        .map(String)
        .filter((p) => validProviders.includes(p));
    }

    if (Array.isArray(included_tenants)) {
      view.included_tenants = included_tenants.map(String).filter((id) => id.length > 0);
    }

    await view.save();

    return NextResponse.json({
      success: true,
      view,
      message: "Vista actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar vista:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la vista" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de la vista" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await SharedView.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Vista no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Vista eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar vista:", error);
    return NextResponse.json(
      { error: "Error interno al eliminar la vista" },
      { status: 500 }
    );
  }
}


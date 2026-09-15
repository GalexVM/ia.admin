import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TenantConfig } from "@/models/TenantConfig";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

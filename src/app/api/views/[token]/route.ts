import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SharedView } from "@/models/SharedView";
import { TenantConfig } from "@/models/TenantConfig";
import { TenantCutoff } from "@/models/TenantCutoff";
import { ProviderBalance, ProviderId } from "@/models/ProviderBalance";
import { recalculateBalance } from "@/lib/providers/balanceService";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: "Falta token de vista" }, { status: 400 });
    }

    await connectToDatabase();
    const view = await SharedView.findOne({ token, is_active: true });

    if (!view) {
      return NextResponse.json(
        { error: "Vista no encontrada o enlace deshabilitado" },
        { status: 404 }
      );
    }

    // Actualizar última fecha de acceso
    view.last_accessed_at = new Date();
    await view.save();

    const shouldRefresh = req.nextUrl.searchParams.get("refresh") === "true";

    // 1. Cargar proveedores seleccionados
    let sanitizedProviders: Array<{
      provider: string;
      label: string;
      initial_balance: number;
      last_calculated_usage: number;
      last_calculated_remaining: number;
      last_sync_status: string;
      last_sync_message?: string;
      last_synced_at?: Date;
      start_date?: Date;
    }> = [];

    if (view.included_providers && view.included_providers.length > 0) {
      const balanceDocs = await ProviderBalance.find({
        provider: { $in: view.included_providers as ProviderId[] },
      });

      sanitizedProviders = await Promise.all(
        balanceDocs.map(async (doc) => {
          if (shouldRefresh) {
            const calc = await recalculateBalance(doc);
            doc.last_calculated_usage = calc.usage;
            doc.last_calculated_remaining = calc.remaining;
            doc.last_sync_status = calc.status;
            doc.last_sync_message = calc.message;
            doc.last_synced_at = new Date();
            if (doc.provider === "openrouter" && calc.raw) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const totalCredits = (calc.raw as any)?.data?.total_credits;
              if (typeof totalCredits === "number") {
                doc.initial_balance = totalCredits;
              }
            }
            if (calc.raw) {
              doc.raw_provider_data = calc.raw as Record<string, unknown>;
            }
            await doc.save();
          }

          return {
            provider: doc.provider,
            label: doc.label,
            initial_balance: doc.initial_balance,
            last_calculated_usage: doc.last_calculated_usage,
            last_calculated_remaining: doc.last_calculated_remaining,
            last_sync_status: doc.last_sync_status,
            last_sync_message: doc.last_sync_message,
            last_synced_at: doc.last_synced_at,
            start_date: doc.start_date,
          };
        })
      );
    }

    // 2. Cargar entornos/tenants seleccionados (Estrictamente sanitizados: sin URLs ni llaves)
    let sanitizedTenants: Array<{
      _id: string;
      company_name: string;
      chatbot_name: string;
      cutoff_day: number;
    }> = [];

    if (view.included_tenants && view.included_tenants.length > 0) {
      const [tenantDocs, cutoffDocs] = await Promise.all([
        TenantConfig.find({ _id: { $in: view.included_tenants } })
          .select("_id company_name chatbot_name cutoff_day")
          .lean(),
        TenantCutoff.find({ tenant_id: { $in: view.included_tenants } }).lean(),
      ]);

      const cutoffMap = new Map(cutoffDocs.map((c) => [c.tenant_id, c.cutoff_day]));

      sanitizedTenants = tenantDocs.map((t) => ({
        _id: String(t._id),
        company_name: t.company_name,
        chatbot_name: t.chatbot_name || "Zefi",
        cutoff_day: cutoffMap.get(String(t._id)) ?? t.cutoff_day ?? 25,
      }));
    }

    return NextResponse.json({
      success: true,
      view: {
        token: view.token,
        title: view.title,
        createdAt: view.createdAt,
      },
      providers: sanitizedProviders,
      tenants: sanitizedTenants,
    });
  } catch (error) {
    console.error("Error al obtener datos de vista:", error);
    return NextResponse.json(
      { error: "Error interno al cargar la vista" },
      { status: 500 }
    );
  }
}


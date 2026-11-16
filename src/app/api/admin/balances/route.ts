import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  ProviderBalance,
  IProviderBalance,
  ProviderId,
} from "@/models/ProviderBalance";
import {
  resolveProviderKey,
  recalculateBalance,
} from "@/lib/providers/balanceService";

const DEFAULT_PROVIDERS: Array<{
  provider: ProviderId;
  label: string;
}> = [
  { provider: "claude", label: "Claude (IA Comercial)" },
  { provider: "openai", label: "OpenAI (IA Comercial y ZefiMind)" },
  { provider: "openrouter", label: "OpenRouter (IA Analítica)" },
];

async function ensureDefaultProviders(): Promise<IProviderBalance[]> {
  const existing = await ProviderBalance.find({});
  const map = new Map(existing.map((item) => [item.provider, item]));

  for (const def of DEFAULT_PROVIDERS) {
    if (!map.has(def.provider)) {
      const created = await ProviderBalance.create({
        provider: def.provider,
        label: def.label,
        initial_balance: 0,
        start_date: new Date(),
        baseline_usage: 0,
        last_calculated_usage: 0,
        last_calculated_remaining: 0,
        last_sync_status: "pending",
        last_sync_message: "Pendiente de configuración inicial",
      });
      map.set(def.provider, created);
    }
  }

  return DEFAULT_PROVIDERS.map((def) => map.get(def.provider)!);
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const docs = await ensureDefaultProviders();

    const searchParams = req.nextUrl.searchParams;
    const shouldRefresh = searchParams.get("refresh") === "true";

    const results = await Promise.all(
      docs.map(async (doc) => {
        let currentDoc = doc;

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
          currentDoc = doc;
        }

        const keyInfo = resolveProviderKey(currentDoc.provider, currentDoc.admin_key);

        return {
          _id: currentDoc._id,
          provider: currentDoc.provider,
          label: currentDoc.label,
          initial_balance: currentDoc.initial_balance,
          start_date: currentDoc.start_date,
          baseline_usage: currentDoc.baseline_usage,
          last_calculated_usage: currentDoc.last_calculated_usage,
          last_calculated_remaining: currentDoc.last_calculated_remaining,
          last_sync_status: currentDoc.last_sync_status,
          last_sync_message: currentDoc.last_sync_message,
          last_synced_at: currentDoc.last_synced_at,
          hasKey: Boolean(keyInfo.key),
          keySource: keyInfo.source,
          envVarName: keyInfo.envVarName,
          maskedKey: keyInfo.maskedKey,
          raw_provider_data: currentDoc.raw_provider_data,
        };
      })
    );

    return NextResponse.json({ success: true, balances: results });
  } catch (error) {
    console.error("Error al obtener saldos de proveedores:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar los saldos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { provider, initial_balance, start_date, admin_key } = body;

    if (!provider || !["claude", "openai", "openrouter"].includes(provider)) {
      return NextResponse.json(
        { error: "Proveedor no válido (debe ser claude, openai u openrouter)" },
        { status: 400 }
      );
    }

    let doc = await ProviderBalance.findOne({ provider });
    if (!doc) {
      const def = DEFAULT_PROVIDERS.find((p) => p.provider === provider);
      doc = new ProviderBalance({
        provider,
        label: def?.label || provider,
      });
    }

    if (initial_balance !== undefined) {
      doc.initial_balance = Number(initial_balance) || 0;
    }

    if (start_date) {
      doc.start_date = new Date(start_date);
    }

    if (admin_key !== undefined) {
      doc.admin_key = admin_key.trim();
    }

    // Si es OpenRouter y se actualiza saldo inicial, sincronizamos el baseline_usage actual
    if (provider === "openrouter") {
      const keyInfo = resolveProviderKey("openrouter", doc.admin_key);
      if (keyInfo.key) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/credits", {
            headers: { Authorization: `Bearer ${keyInfo.key}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.total_usage !== undefined) {
              doc.baseline_usage = Number(json.data.total_usage) || 0;
            }
          }
        } catch (e) {
          console.warn("No se pudo obtener baseline de OpenRouter:", e);
        }
      }
    }

    // Recalcular consumo de inmediato
    const calc = await recalculateBalance(doc);
    doc.last_calculated_usage = calc.usage;
    doc.last_calculated_remaining = calc.remaining;
    doc.last_sync_status = calc.status;
    doc.last_sync_message = calc.message;
    doc.last_synced_at = new Date();
    if (calc.raw) {
      doc.raw_provider_data = calc.raw as Record<string, unknown>;
    }

    await doc.save();

    const keyInfo = resolveProviderKey(doc.provider, doc.admin_key);

    return NextResponse.json({
      success: true,
      balance: {
        _id: doc._id,
        provider: doc.provider,
        label: doc.label,
        initial_balance: doc.initial_balance,
        start_date: doc.start_date,
        baseline_usage: doc.baseline_usage,
        last_calculated_usage: doc.last_calculated_usage,
        last_calculated_remaining: doc.last_calculated_remaining,
        last_sync_status: doc.last_sync_status,
        last_sync_message: doc.last_sync_message,
        last_synced_at: doc.last_synced_at,
        hasKey: Boolean(keyInfo.key),
        keySource: keyInfo.source,
        envVarName: keyInfo.envVarName,
        maskedKey: keyInfo.maskedKey,
        raw_provider_data: doc.raw_provider_data,
      },
    });
  } catch (error) {
    console.error("Error al actualizar saldo de proveedor:", error);
    return NextResponse.json(
      { error: "Error al actualizar saldo de proveedor" },
      { status: 500 }
    );
  }
}


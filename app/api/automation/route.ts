import { NextResponse } from "next/server";

interface AutomationRule {
  id: string;
  name: string;
  condition_type: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  enabled: boolean;
  last_run?: string;
  run_count: number;
}

// In-memory store (replace with Supabase when tables are created)
const rules: AutomationRule[] = [
  {
    id: "1",
    name: "Stock bas → Prix +15%",
    condition_type: "stock_low",
    condition_value: "5",
    action_type: "price_increase",
    action_value: "15",
    enabled: true,
    last_run: "2026-03-03T14:30:00Z",
    run_count: 12,
  },
  {
    id: "2",
    name: "Promo vendredi",
    condition_type: "scheduled",
    condition_value: "friday",
    action_type: "price_decrease",
    action_value: "10",
    enabled: false,
    run_count: 0,
  },
];

export async function GET() {
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, condition_type, condition_value, action_type, action_value } = body;

    if (!name || !condition_type || !action_type) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name,
      condition_type,
      condition_value: condition_value || "",
      action_type,
      action_value: action_value || "10",
      enabled: true,
      run_count: 0,
    };

    rules.push(newRule);
    return NextResponse.json({ success: true, rule: newRule });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
    }

    rules[idx] = { ...rules[idx], ...updates };

    // If executing, simulate execution
    if (updates.execute) {
      rules[idx].last_run = new Date().toISOString();
      rules[idx].run_count += 1;
    }

    return NextResponse.json({ success: true, rule: rules[idx] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
    }

    rules.splice(idx, 1);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

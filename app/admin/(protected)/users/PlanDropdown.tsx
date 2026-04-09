"use client";

const PLANS = ["free", "starter", "pro", "scale"] as const;

export function PlanDropdown({ userId, currentPlan }: { userId: string; currentPlan: string }) {
  return (
    <form action={`/api/admin/users/${userId}/plan`} method="POST" className="inline">
      <select
        name="plan"
        defaultValue={currentPlan}
        onChange={(e) => (e.target.closest("form") as HTMLFormElement)?.requestSubmit()}
        className="text-[10px] px-1 py-1 border border-gray-200 rounded bg-white cursor-pointer"
        style={{ color: "#64748b" }}
      >
        {PLANS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </form>
  );
}

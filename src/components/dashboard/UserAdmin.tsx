"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserToggle({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !suspended }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        suspended
          ? "bg-emerald-700 text-white hover:bg-emerald-800"
          : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
      }`}
    >
      {busy ? "…" : suspended ? "Reinstate" : "Suspend"}
    </button>
  );
}

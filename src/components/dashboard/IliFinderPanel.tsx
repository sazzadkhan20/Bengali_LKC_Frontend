"use client";

import { IliFinder } from "@/components/dashboard/IliFinder";

/** Standalone ILI Finder: “Use this code” opens Quick Input prefilled, or copies the code. */
export function IliFinderPanel({ canCreate }: { canCreate: boolean }) {
  return (
    <IliFinder
      hrefFor={
        canCreate
          ? (hit) =>
              `/dashboard/quick-input?${new URLSearchParams({ ili: hit.ili }).toString()}`
          : undefined
      }
    />
  );
}

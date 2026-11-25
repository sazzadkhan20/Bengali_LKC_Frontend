/** Sentinel ILI when no Princeton WordNet 3.0 concept applies yet. */
export const ILI_NOT_AVAILABLE = "N/A";

export function isIliNotAvailable(ili?: string | null): boolean {
  return (ili ?? "").trim().toUpperCase() === "N/A";
}

export function normalizeIliCode(ili?: string | null): string {
  const t = (ili ?? "").trim();
  return isIliNotAvailable(t) ? ILI_NOT_AVAILABLE : t;
}

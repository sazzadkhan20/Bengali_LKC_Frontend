"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function ContributeForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [interestRole, setInterestRole] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const interestRoles = [
    { value: "", label: t("interestNotSure") },
    { value: "CONTRIBUTOR", label: t("interestContributor") },
    { value: "LEXICAL_EDITOR", label: t("interestEditor") },
    { value: "CHIEF_LEXICAL_EDITOR", label: t("interestChief") },
    { value: "ARBITRATION_CURATOR", label: t("interestCurator") },
    { value: "OTHER", label: t("interestOther") },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          institution: institution.trim() || undefined,
          interestRole: interestRole || undefined,
          message: message.trim(),
          honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ??
            (data.errors
              ? Object.values(data.errors).join(" ")
              : "Could not submit your request. Please try again.")
        );
        return;
      }
      setDone(true);
      setName("");
      setEmail("");
      setPhone("");
      setInstitution("");
      setInterestRole("");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
        <p className="text-lg font-bold text-emerald-900">{t("thankYouTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-800">
          {t("thankYouBody")}
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("fullName")} <span className="text-rose-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="e.g. Nusrat Jahan"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("email")} <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="you@university.edu"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("phone")} <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="+880 1XXX-XXXXXX"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("institution")}
          </label>
          <input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="University, academy, or organisation"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {t("interestRole")}
        </label>
        <select
          value={interestRole}
          onChange={(e) => setInterestRole(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          {interestRoles.map((r) => (
            <option key={r.value || "none"} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {t("whyJoin")} <span className="text-rose-500">*</span>
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={800}
          placeholder={t("whyJoinPlaceholder")}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <p className="mt-1 text-right text-[11px] text-slate-400">
          {message.length}/800
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
      >
        {busy ? t("sending") : t("submitRequest")}
      </button>
    </form>
  );
}

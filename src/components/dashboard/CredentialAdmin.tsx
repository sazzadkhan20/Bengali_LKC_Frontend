"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ROLE_LABEL, formatDate } from "@/lib/format";
import type { Role } from "@/lib/types";

export type CredentialRow = {
  id: string;
  userId: string;
  username: string;
  oneTime: boolean;
  issuedAt: string | null;
  lastChangedAt: string | null;
  deactivated: boolean;
  holderName?: string;
  holderRole?: Role;
  holderEmail?: string;
};

type IssuedCredential = {
  username: string;
  email: string;
  demoOneTimePassword: string;
  emailSent?: boolean;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CONTRIBUTOR", label: "Lexical Contributor" },
  { value: "LEXICAL_EDITOR", label: "Lexical Editor" },
  { value: "CHIEF_LEXICAL_EDITOR", label: "Chief Lexical Editor" },
  { value: "ARBITRATION_CURATOR", label: "Arbitration Curator" },
  { value: "SYSTEM_MODERATOR", label: "System Moderator" },
  { value: "PLATFORM_ARCHITECT", label: "Platform Architect" },
];

const PAGE_SIZES = [15, 30, 50, 100] as const;

function IssuedBanner({ issued }: { issued: IssuedCredential }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
      <p className="font-semibold text-emerald-800">
        Login details ready
        {issued.emailSent
          ? ` and sent to ${issued.email}`
          : ` for ${issued.email}`}
        :
      </p>
      <div className="mt-2 space-y-1 rounded-lg bg-white px-3 py-2 font-mono text-sm text-emerald-900 ring-1 ring-emerald-200">
        <p>
          <span className="text-emerald-600">Email:</span> {issued.email}
        </p>
        <p>
          <span className="text-emerald-600">Username:</span> {issued.username}
        </p>
        <p>
          <span className="text-emerald-600">Password:</span>{" "}
          <span className="font-bold">{issued.demoOneTimePassword}</span>
        </p>
      </div>
      <p className="mt-2 text-xs text-emerald-700">
        The user can sign in with either their <strong>username</strong> or{" "}
        <strong>email</strong>, plus this password. The temporary password works
        for one sign-in only and must be changed right after logging in.
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Full name is required."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9._-]{3,30}$/,
      "Username must be 3–30 characters (letters, digits, . _ -)."
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  role: z.enum([
    "PLATFORM_ARCHITECT",
    "SYSTEM_MODERATOR",
    "CONTRIBUTOR",
    "LEXICAL_EDITOR",
    "CHIEF_LEXICAL_EDITOR",
    "ARBITRATION_CURATOR",
  ]),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required.")
    .refine((v) => Date.parse(v) < Date.now(), "Date of birth must be in the past."),
  institution: z.string().trim().min(1, "Institution is required."),
  occupation: z.string().trim().min(1, "Occupation is required."),
});

type CreateForm = z.infer<typeof createUserSchema>;
type FieldErrors = Partial<Record<keyof CreateForm, string>>;

function validateCreateForm(
  form: CreateForm,
  identifiers: { usernames: string[]; emails: string[] },
  opts?: { requireComplete?: boolean; keys?: (keyof CreateForm)[] }
): { data: CreateForm | null; errors: FieldErrors } {
  const requireComplete = opts?.requireComplete ?? true;
  const errors: FieldErrors = {};
  const keys =
    opts?.keys ??
    ([
      "name",
      "username",
      "email",
      "role",
      "dob",
      "institution",
      "occupation",
    ] as (keyof CreateForm)[]);

  const fieldSchemas: Record<keyof CreateForm, z.ZodTypeAny> = {
    name: createUserSchema.shape.name,
    username: createUserSchema.shape.username,
    email: createUserSchema.shape.email,
    role: createUserSchema.shape.role,
    dob: createUserSchema.shape.dob,
    institution: createUserSchema.shape.institution,
    occupation: createUserSchema.shape.occupation,
  };

  for (const key of keys) {
    const value = form[key];
    const result = fieldSchemas[key].safeParse(value);
    if (!result.success) {
      errors[key] = result.error.issues[0]?.message ?? "Invalid value.";
    }
  }

  const username = form.username.trim().toLowerCase();
  const email = form.email.trim().toLowerCase();
  if (username && !errors.username && identifiers.usernames.includes(username)) {
    errors.username = "This username is already taken.";
  }
  if (email && !errors.email && identifiers.emails.includes(email)) {
    errors.email = "An account with this email already exists.";
  }

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }
  if (!requireComplete) {
    return { data: null, errors: {} };
  }
  const parsed = createUserSchema.safeParse(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateForm;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { data: null, errors };
  }
  return { data: parsed.data, errors: {} };
}

/** A contribute application the new account is being issued for. */
export type ApplicationPrefill = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  interestRole: string | null;
};

const EMPTY_FORM: CreateForm = {
  name: "",
  username: "",
  email: "",
  role: "CONTRIBUTOR",
  dob: "",
  institution: "",
  occupation: "",
};

const ISSUABLE_ROLES = new Set<string>(ROLE_OPTIONS.map((r) => r.value));

function suggestUsername(email: string): string {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const cleaned = local.replace(/[^a-z0-9._-]/g, "").slice(0, 30);
  return cleaned.length >= 3 ? cleaned : "";
}

function formFromApplication(app: ApplicationPrefill | null | undefined): CreateForm {
  if (!app) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    name: app.name,
    email: app.email,
    username: suggestUsername(app.email),
    institution: app.institution ?? "",
    role: app.interestRole && ISSUABLE_ROLES.has(app.interestRole) ? (app.interestRole as Role) : "CONTRIBUTOR",
  };
}

export function CreateUserForm({
  onCreated,
  application,
}: {
  onCreated: () => void;
  application?: ApplicationPrefill | null;
}) {
  const [linkedApp, setLinkedApp] = useState<ApplicationPrefill | null>(application ?? null);
  const [approvedApp, setApprovedApp] = useState<ApplicationPrefill | null>(null);
  const [form, setForm] = useState<CreateForm>(() => formFromApplication(application));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CreateForm, boolean>>>({});
  const [identifiers, setIdentifiers] = useState<{ usernames: string[]; emails: string[] }>({
    usernames: [],
    emails: [],
  });
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/users/identifiers", { credentials: "include" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      const next = {
        usernames: Array.isArray(data.usernames) ? data.usernames : [],
        emails: Array.isArray(data.emails) ? data.emails : [],
      };
      setIdentifiers(next);
      if (application) {
        // Surface conflicts in the prefilled values (e.g. the applicant already has an account).
        const prefilled = formFromApplication(application);
        const { errors } = validateCreateForm(prefilled, next, {
          requireComplete: false,
          keys: ["name", "username", "email"],
        });
        setFieldErrors(errors);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [application]);

  function revalidate(nextForm: CreateForm, nextTouched = touched) {
    const activeKeys = (Object.keys(nextTouched) as (keyof CreateForm)[]).filter(
      (k) => nextTouched[k]
    );
    const { errors } = validateCreateForm(nextForm, identifiers, {
      requireComplete: false,
      keys: activeKeys.length ? activeKeys : undefined,
    });
    const visible: FieldErrors = {};
    activeKeys.forEach((key) => {
      if (errors[key]) visible[key] = errors[key];
    });
    // Duplicate checks appear as soon as the value conflicts
    if (errors.username && nextForm.username.trim()) visible.username = errors.username;
    if (errors.email && nextForm.email.trim()) visible.email = errors.email;
    setFieldErrors(visible);
  }

  function setField<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    const nextForm = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };
    setForm(nextForm);
    setTouched(nextTouched);
    revalidate(nextForm, nextTouched);
  }

  function onBlurField(key: keyof CreateForm) {
    const nextTouched = { ...touched, [key]: true };
    setTouched(nextTouched);
    revalidate(form, nextTouched);
  }

  function openConfirm() {
    const { data, errors } = validateCreateForm(form, identifiers, {
      requireComplete: true,
    });
    setTouched({
      name: true,
      username: true,
      email: true,
      role: true,
      dob: true,
      institution: true,
      occupation: true,
    });
    setFieldErrors(errors);
    if (data) setConfirmOpen(true);
  }

  async function submitConfirmed() {
    const { data, errors } = validateCreateForm(form, identifiers, {
      requireComplete: true,
    });
    if (!data) {
      setFieldErrors(errors);
      setConfirmOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(linkedApp ? { ...data, applicationId: linkedApp.id } : data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not create the account. Please try again.");
        setConfirmOpen(false);
        return;
      }
      setIssued(body.credential);
      setApprovedApp(linkedApp);
      setLinkedApp(null);
      setIdentifiers((prev) => ({
        usernames: [...prev.usernames, data.username],
        emails: [...prev.emails, data.email],
      }));
      setForm(EMPTY_FORM);
      setTouched({});
      setFieldErrors({});
      setConfirmOpen(false);
      onCreated();
    } catch {
      setError("Could not reach the server. Please try again.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function unlinkApplication() {
    setLinkedApp(null);
    setForm(EMPTY_FORM);
    setTouched({});
    setFieldErrors({});
  }

  const field =
    "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="space-y-4">
      {issued ? <IssuedBanner issued={issued} /> : null}
      {issued && approvedApp ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span>
            Application <span className="font-mono font-semibold">{approvedApp.id}</span> from {approvedApp.name} is
            now marked approved and linked to this account.
          </span>
          <Link href="/dashboard/applications" className="font-semibold underline hover:text-emerald-900">
            Back to applications
          </Link>
        </p>
      ) : null}
      {linkedApp ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold text-sky-900">
              Issuing an account for application <span className="font-mono">{linkedApp.id}</span>
            </p>
            <p className="mt-0.5 text-xs text-sky-800">
              Name, email, institution and role are prefilled from the request
              {linkedApp.interestRole && !ISSUABLE_ROLES.has(linkedApp.interestRole)
                ? " (the applicant chose “Other”, so the role defaults to Lexical Contributor)"
                : ""}
              . Review them, add the date of birth and occupation, then create the account. The application is
              approved automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={unlinkApplication}
            className="shrink-0 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            Clear & create unlinked
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Full name
          </label>
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => onBlurField("name")}
            placeholder="e.g. Dr. Amina Khatun"
            className={field}
          />
          <FieldError message={fieldErrors.name} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Username
          </label>
          <input
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            onBlur={() => onBlurField("username")}
            placeholder="e.g. amina.k"
            className={field}
          />
          <FieldError message={fieldErrors.username} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Registered email
          </label>
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => onBlurField("email")}
            placeholder="e.g. amina@lkc.ac.bd"
            className={field}
          />
          <FieldError message={fieldErrors.email} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Role
          </label>
          <select
            value={form.role}
            onChange={(e) => setField("role", e.target.value as Role)}
            onBlur={() => onBlurField("role")}
            className={field}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.role} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Date of birth
          </label>
          <input
            type="date"
            value={form.dob}
            onChange={(e) => setField("dob", e.target.value)}
            onBlur={() => onBlurField("dob")}
            placeholder="YYYY-MM-DD"
            className={field}
          />
          <FieldError message={fieldErrors.dob} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Institution
          </label>
          <input
            value={form.institution}
            onChange={(e) => setField("institution", e.target.value)}
            onBlur={() => onBlurField("institution")}
            placeholder="e.g. University of Dhaka"
            className={field}
          />
          <FieldError message={fieldErrors.institution} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Occupation
          </label>
          <input
            value={form.occupation}
            onChange={(e) => setField("occupation", e.target.value)}
            onBlur={() => onBlurField("occupation")}
            placeholder="e.g. University Teacher"
            className={field}
          />
          <FieldError message={fieldErrors.occupation} />
        </div>
      </div>
      <button
        type="button"
        onClick={openConfirm}
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        Create account & send login details
      </button>

      <ConfirmModal
        open={confirmOpen}
        title="Create this account?"
        description={
          <>
            A temporary password will be created and sent to{" "}
            <strong>{form.email.trim() || "the registered email"}</strong>. The
            user must change it after their first sign-in.
          </>
        }
        confirmLabel={linkedApp ? "Create account & approve" : "Create account"}
        tone="primary"
        busy={busy}
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={submitConfirmed}
      />
    </div>
  );
}

function ForceResetButton({
  userId,
  username,
  onDone,
}: {
  userId: string;
  username: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reset the password. Please try again.");
        return;
      }
      setIssued(data.credential);
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
      >
        Reset password
      </button>
      {issued ? (
        <code className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {issued.demoOneTimePassword}
        </code>
      ) : null}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
      <ConfirmModal
        open={open}
        title="Reset this password?"
        description={
          <>
            A new temporary password will be sent for <strong>{username}</strong>.
            Any open sessions for this account will end immediately.
          </>
        }
        confirmLabel="Reset password"
        tone="warning"
        busy={busy}
        onCancel={() => !busy && setOpen(false)}
        onConfirm={confirm}
      />
    </div>
  );
}

function CredentialToggle({
  credentialId,
  username,
  deactivated,
  onDone,
}: {
  credentialId: string;
  username: string;
  deactivated: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/credentials/${credentialId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deactivated: !deactivated }),
      });
      if (res.ok) {
        setOpen(false);
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
          deactivated
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
        }`}
      >
        {deactivated ? "Restore access" : "Disable access"}
      </button>
      <ConfirmModal
        open={open}
        title={deactivated ? "Restore access?" : "Disable access?"}
        description={
          deactivated ? (
            <>
              Allow <strong>{username}</strong> to sign in again?
            </>
          ) : (
            <>
              Disable access for <strong>{username}</strong>? Any open sessions for
              this account will end immediately.
            </>
          )
        }
        confirmLabel={deactivated ? "Restore access" : "Disable access"}
        tone={deactivated ? "primary" : "danger"}
        busy={busy}
        onCancel={() => !busy && setOpen(false)}
        onConfirm={confirm}
      />
    </>
  );
}

export function CredentialsManager({ application }: { application?: ApplicationPrefill | null }) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<(typeof PAGE_SIZES)[number]>(15);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [items, setItems] = useState<CredentialRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(0);
      setQ(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) params.set("q", q);
    if (role !== "ALL") params.set("role", role);
    return params.toString();
  }, [page, size, q, role]);
  const requestKey = `${query}#${reloadTick}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/credentials?${query}`, { credentials: "include", cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not load login accounts.");
          setItems([]);
        } else {
          setError(null);
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotalPages(Number(data.totalPages) || 0);
          setTotalElements(Number(data.totalElements) || 0);
        }
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setError("Could not load login accounts.");
        setLoadedKey(requestKey);
      });
    return () => ctrl.abort();
  }, [query, requestKey]);

  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  const rangeLabel = useMemo(() => {
    if (!totalElements) return "0 accounts";
    const from = page * size + 1;
    const to = Math.min((page + 1) * size, totalElements);
    return `${from}–${to} of ${totalElements}`;
  }, [page, size, totalElements]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800">
            Create a user & send login details
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Username and email must be unique. A temporary password is emailed to
            the user and shown once here for confirmation.
          </p>
        </div>
        <div className="p-5">
          <CreateUserForm
            application={application}
            onCreated={() => {
              setPage(0);
              load();
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800">All login accounts</h2>
          <p className="text-xs text-slate-500">{rangeLabel}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by username, full name, or email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <select
              value={role}
              onChange={(e) => {
                setPage(0);
                setRole(e.target.value as Role | "ALL");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="m-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}

        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Username</th>
                <th className="px-3 py-3 font-semibold">Full name</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Issued</th>
                <th className="px-3 py-3 font-semibold">Password changed</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                    Loading accounts…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                    No accounts match your search.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr
                    key={c.id}
                    className={
                      c.deactivated
                        ? "bg-slate-50/80 text-slate-500 [&_td]:text-slate-500"
                        : ""
                    }
                  >
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">
                      {c.username}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{c.holderName ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {c.holderRole ? ROLE_LABEL[c.holderRole] : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {c.issuedAt ? formatDate(c.issuedAt) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {c.lastChangedAt ? formatDate(c.lastChangedAt) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {c.deactivated ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                          Disabled
                        </span>
                      ) : c.oneTime ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                          First login pending
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!c.deactivated ? (
                          <ForceResetButton
                            userId={c.userId}
                            username={c.username}
                            onDone={load}
                          />
                        ) : null}
                        <CredentialToggle
                          credentialId={c.id}
                          username={c.username}
                          deactivated={c.deactivated}
                          onDone={load}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
          >
            Previous
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Page {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Rows
              <select
                value={size}
                onChange={(e) => {
                  setPage(0);
                  setSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Disabling access or resetting a password ends all open sessions for that
        account. New users must change their temporary password after first
        sign-in.
      </p>
    </div>
  );
}

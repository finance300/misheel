import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  REPORT_GROUPS,
  type ReportGroupKey,
  type ReportRecord,
  createReport,
  deleteReport,
  listReports,
  reportFileUrl,
  uploadReportFile
} from "../lib/reports";

type Lang = "mn" | "en";

const GROUP_LABELS: Record<Lang, Record<ReportGroupKey, string>> = {
  mn: { activity: "Үйл ажиллагааны тайлан", audit: "Аудитын тайлан", regulations: "Журам" },
  en: { activity: "Operational report", audit: "Audit report", regulations: "Regulations" }
};

const T: Record<Lang, Record<string, string>> = {
  mn: {
    notConfigured: "Backend тохируулаагүй байна. Төслийн SUPABASE_SETUP.md-г үзнэ үү.",
    signInTitle: "Админ нэвтрэх",
    email: "Имэйл",
    password: "Нууц үг",
    signIn: "Нэвтрэх",
    signOut: "Гарах",
    signedInAs: "Нэвтэрсэн",
    addTitle: "Шинэ баримт нэмэх",
    group: "Бүлэг",
    docName: "Баримтын нэр",
    file: "Файл (PDF)",
    upload: "Байршуулах",
    uploading: "Байршуулж байна…",
    delete: "Устгах",
    empty: "Одоогоор баримт алга.",
    confirmDelete: "Энэ баримтыг устгах уу?",
    loading: "Ачааллаж байна…"
  },
  en: {
    notConfigured: "Backend not configured. See SUPABASE_SETUP.md in the project root.",
    signInTitle: "Admin sign in",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    addTitle: "Add a document",
    group: "Group",
    docName: "Document name",
    file: "File (PDF)",
    upload: "Upload",
    uploading: "Uploading…",
    delete: "Delete",
    empty: "No documents yet.",
    confirmDelete: "Delete this document?",
    loading: "Loading…"
  }
};

export default function ReportsAdmin({ lang }: { lang: Lang }) {
  const t = (k: string) => T[lang][k] ?? k;

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [group, setGroup] = useState<ReportGroupKey>("activity");
  const [docTitle, setDocTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    listReports()
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [session]);

  const refresh = async () => {
    try {
      setReports(await listReports());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!isSupabaseConfigured) {
    return <div className="ra-notice">{t("notConfigured")}</div>;
  }
  if (!ready) {
    return <div className="ra-notice">{t("loading")}</div>;
  }

  const onSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setAuthError(signInError.message);
    setAuthBusy(false);
  };

  const onSignOut = async () => {
    await supabase?.auth.signOut();
    setReports([]);
  };

  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !docTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const path = await uploadReportFile(file);
      await createReport({ group_key: group, title: docTitle.trim(), file_path: path });
      setDocTitle("");
      setFile(null);
      setFileKey((k) => k + 1);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (record: ReportRecord) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteReport(record);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="ra-auth">
        <h3>{t("signInTitle")}</h3>
        <form className="ra-form" onSubmit={onSignIn}>
          <label>
            {t("email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {authError ? <p className="ra-error">{authError}</p> : null}
          <button className="btn btn-accent" type="submit" disabled={authBusy}>
            {authBusy ? "…" : t("signIn")}
          </button>
        </form>
      </div>
    );
  }

  const grouped = REPORT_GROUPS.map((key) => ({
    key,
    label: GROUP_LABELS[lang][key],
    items: reports.filter((r) => r.group_key === key)
  }));

  return (
    <div className="ra">
      <div className="ra-topbar">
        <span className="ra-user">
          {t("signedInAs")}: {session.user.email}
        </span>
        <button className="btn btn-ghost" type="button" onClick={onSignOut}>
          {t("signOut")}
        </button>
      </div>

      <form className="ra-add" onSubmit={onAdd}>
        <h3>{t("addTitle")}</h3>
        <div className="ra-add-grid">
          <label>
            {t("group")}
            <select value={group} onChange={(e) => setGroup(e.target.value as ReportGroupKey)}>
              {REPORT_GROUPS.map((key) => (
                <option key={key} value={key}>
                  {GROUP_LABELS[lang][key]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("docName")}
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
          </label>
          <label>
            {t("file")}
            <input
              key={fileKey}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        </div>
        {error ? <p className="ra-error">{error}</p> : null}
        <button className="btn btn-accent" type="submit" disabled={busy || !file || !docTitle.trim()}>
          {busy ? t("uploading") : t("upload")}
        </button>
      </form>

      <div className="ra-groups">
        {grouped.map((g) => (
          <div className="ra-group" key={g.key}>
            <h4>{g.label}</h4>
            {g.items.length === 0 ? (
              <p className="ra-empty">{t("empty")}</p>
            ) : (
              <ul>
                {g.items.map((record) => (
                  <li key={record.id}>
                    <a href={reportFileUrl(record.file_path)} target="_blank" rel="noopener noreferrer">
                      {record.title}
                    </a>
                    <button
                      className="ra-del"
                      type="button"
                      onClick={() => onDelete(record)}
                      disabled={busy}
                    >
                      {t("delete")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

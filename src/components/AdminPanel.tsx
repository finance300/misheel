import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import * as cms from "../lib/cms";
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
export type Section = "mission" | "team" | "timeline" | "reports" | "contact" | "users";
type Draft<T> = Omit<T, "id"> & { id?: string };

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

const tr = (lang: Lang, mn: string, en: string) => (lang === "mn" ? mn : en);

// ---------- shared bits ----------
function Err({ error }: { error: string | null }) {
  return error ? <p className="ra-error">{error}</p> : null;
}

// In-app confirmation modal (replaces window.confirm).
function useConfirm(lang: Lang) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (message: string) =>
    new Promise<boolean>((resolve) => setState({ message, resolve }));
  const finish = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };
  const dialog = state ? (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && finish(false)}>
      <div className="confirm-card">
        <p className="confirm-msg">{state.message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" type="button" onClick={() => finish(false)}>
            {tr(lang, "Болих", "Cancel")}
          </button>
          <button className="btn btn-accent" type="button" onClick={() => finish(true)}>
            {tr(lang, "Устгах", "Delete")}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirm, dialog };
}

export default function AdminPanel({ lang, section }: { lang: Lang; section: Section }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="ra-notice">
        {tr(lang, "Backend тохируулаагүй байна. SUPABASE_SETUP.md-г үзнэ үү.", "Backend not configured. See SUPABASE_SETUP.md.")}
      </div>
    );
  }
  if (!ready) return <div className="ra-notice">{tr(lang, "Ачааллаж байна…", "Loading…")}</div>;

  if (!session) {
    const onSignIn = async (event: FormEvent) => {
      event.preventDefault();
      if (!supabase) return;
      setAuthBusy(true);
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      setAuthBusy(false);
    };
    return (
      <div className="ra-auth">
        <h3>{tr(lang, "Админ нэвтрэх", "Admin sign in")}</h3>
        <form className="ra-form" onSubmit={onSignIn}>
          <label>
            {tr(lang, "Имэйл", "Email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {tr(lang, "Нууц үг", "Password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <Err error={authError} />
          <button className="btn btn-accent" type="submit" disabled={authBusy}>
            {authBusy ? "…" : tr(lang, "Нэвтрэх", "Sign in")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin">
      {section === "mission" && <MissionEditor lang={lang} />}
      {section === "team" && <TeamEditor lang={lang} />}
      {section === "timeline" && <TimelineEditor lang={lang} />}
      {section === "reports" && <ReportsEditor lang={lang} />}
      {section === "contact" && <ContactEditor lang={lang} />}
      {section === "users" && <UsersEditor lang={lang} />}
    </div>
  );
}

// ---------- Mission / Values cards ----------
function MissionEditor({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Draft<cms.HomeCard>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm(lang);
  const reload = async () => {
    try {
      setItems(await cms.ensureHomeCards());
    } catch (e) {
      setError(errMsg(e));
    }
  };
  useEffect(() => {
    reload();
  }, []);
  const set = (i: number, key: keyof cms.HomeCard, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const add = () =>
    setItems((arr) => [...arr, { title_mn: "", body_mn: "", title_en: "", body_en: "", sort_order: arr.length }]);
  const save = async (i: number) => {
    setBusy(true);
    setError(null);
    try {
      await cms.upsertHomeCard(items[i]);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (i: number) => {
    const it = items[i];
    if (it.id && !(await confirm(tr(lang, "Устгах уу?", "Delete?")))) return;
    setBusy(true);
    try {
      if (it.id) await cms.deleteHomeCard(it.id);
      await reload();
      if (!it.id) setItems((arr) => arr.filter((_, idx) => idx !== i));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cms-section">
      {dialog}
      <div className="cms-head">
        <h3>{tr(lang, "Зорилго & Үнэт зүйлс", "Mission & Values")}</h3>
        <button className="btn btn-accent" type="button" onClick={add}>
          + {tr(lang, "Самбар нэмэх", "Add panel")}
        </button>
      </div>
      <Err error={error} />
      {items.map((it, i) => (
        <div className="cms-card" key={it.id ?? `new-${i}`}>
          <div className="cms-grid2">
            <label>
              {tr(lang, "Гарчиг (MN)", "Title (MN)")}
              <input value={it.title_mn} onChange={(e) => set(i, "title_mn", e.target.value)} />
            </label>
            <label>
              {tr(lang, "Гарчиг (EN)", "Title (EN)")}
              <input value={it.title_en} onChange={(e) => set(i, "title_en", e.target.value)} />
            </label>
            <label>
              {tr(lang, "Текст (MN)", "Text (MN)")}
              <textarea value={it.body_mn} onChange={(e) => set(i, "body_mn", e.target.value)} />
            </label>
            <label>
              {tr(lang, "Текст (EN)", "Text (EN)")}
              <textarea value={it.body_en} onChange={(e) => set(i, "body_en", e.target.value)} />
            </label>
          </div>
          <div className="cms-actions">
            <button className="btn btn-accent" type="button" disabled={busy} onClick={() => save(i)}>
              {tr(lang, "Хадгалах", "Save")}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => remove(i)}>
              {tr(lang, "Устгах", "Delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Team ----------
function TeamEditor({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Draft<cms.TeamMember>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm(lang);
  const reload = async () => {
    try {
      setItems(await cms.ensureTeam());
    } catch (e) {
      setError(errMsg(e));
    }
  };
  useEffect(() => {
    reload();
  }, []);
  const set = (i: number, key: keyof cms.TeamMember, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const add = () =>
    setItems((arr) => [
      ...arr,
      { name_mn: "", role_mn: "", name_en: "", role_en: "", photo_path: null, sort_order: arr.length }
    ]);
  const onPhoto = async (i: number, file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const path = await cms.uploadTeamPhoto(file);
      setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, photo_path: path } : it)));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async (i: number) => {
    setBusy(true);
    setError(null);
    try {
      await cms.upsertTeamMember(items[i]);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (i: number) => {
    const it = items[i];
    if (it.id && !(await confirm(tr(lang, "Устгах уу?", "Delete?")))) return;
    setBusy(true);
    try {
      if (it.id) await cms.deleteTeamMember(it as cms.TeamMember);
      await reload();
      if (!it.id) setItems((arr) => arr.filter((_, idx) => idx !== i));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cms-section">
      {dialog}
      <div className="cms-head">
        <h3>{tr(lang, "Менежментийн баг", "Management team")}</h3>
        <button className="btn btn-accent" type="button" onClick={add}>
          + {tr(lang, "Хүн нэмэх", "Add person")}
        </button>
      </div>
      <Err error={error} />
      {items.map((it, i) => (
        <div className="cms-card" key={it.id ?? `new-${i}`}>
          <div className="cms-person">
            <div className="cms-photo">
              {cms.teamPhotoUrl(it.photo_path ?? null) ? (
                <img src={cms.teamPhotoUrl(it.photo_path ?? null) as string} alt="" />
              ) : (
                <div className="cms-photo-empty">{tr(lang, "Зураггүй", "No photo")}</div>
              )}
              <input type="file" accept="image/*" onChange={(e) => onPhoto(i, e.target.files?.[0] ?? null)} />
            </div>
            <div className="cms-grid2 cms-person-fields">
              <label>
                {tr(lang, "Нэр (MN)", "Name (MN)")}
                <input value={it.name_mn} onChange={(e) => set(i, "name_mn", e.target.value)} />
              </label>
              <label>
                {tr(lang, "Нэр (EN)", "Name (EN)")}
                <input value={it.name_en} onChange={(e) => set(i, "name_en", e.target.value)} />
              </label>
              <label>
                {tr(lang, "Албан тушаал (MN)", "Title (MN)")}
                <input value={it.role_mn} onChange={(e) => set(i, "role_mn", e.target.value)} />
              </label>
              <label>
                {tr(lang, "Албан тушаал (EN)", "Title (EN)")}
                <input value={it.role_en} onChange={(e) => set(i, "role_en", e.target.value)} />
              </label>
            </div>
          </div>
          <div className="cms-actions">
            <button className="btn btn-accent" type="button" disabled={busy} onClick={() => save(i)}>
              {tr(lang, "Хадгалах", "Save")}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => remove(i)}>
              {tr(lang, "Устгах", "Delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Timeline ----------
function TimelineEditor({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Draft<cms.TimelineEvent>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm(lang);
  const reload = async () => {
    try {
      setItems(await cms.ensureTimeline());
    } catch (e) {
      setError(errMsg(e));
    }
  };
  useEffect(() => {
    reload();
  }, []);
  const set = (i: number, key: keyof cms.TimelineEvent, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const add = () =>
    setItems((arr) => [...arr, { year: "", text_mn: "", text_en: "", sort_order: arr.length }]);
  const save = async (i: number) => {
    setBusy(true);
    setError(null);
    try {
      await cms.upsertTimelineEvent(items[i]);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (i: number) => {
    const it = items[i];
    if (it.id && !(await confirm(tr(lang, "Устгах уу?", "Delete?")))) return;
    setBusy(true);
    try {
      if (it.id) await cms.deleteTimelineEvent(it.id);
      await reload();
      if (!it.id) setItems((arr) => arr.filter((_, idx) => idx !== i));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cms-section">
      {dialog}
      <div className="cms-head">
        <h3>{tr(lang, "Он цагийн хэлхээс", "Timeline")}</h3>
        <button className="btn btn-accent" type="button" onClick={add}>
          + {tr(lang, "Үе шат нэмэх", "Add entry")}
        </button>
      </div>
      <Err error={error} />
      {items.map((it, i) => (
        <div className="cms-card" key={it.id ?? `new-${i}`}>
          <div className="cms-timeline-row">
            <label className="cms-year">
              {tr(lang, "Он", "Year")}
              <input value={it.year} onChange={(e) => set(i, "year", e.target.value)} />
            </label>
            <label>
              {tr(lang, "Текст (MN)", "Text (MN)")}
              <textarea value={it.text_mn} onChange={(e) => set(i, "text_mn", e.target.value)} />
            </label>
            <label>
              {tr(lang, "Текст (EN)", "Text (EN)")}
              <textarea value={it.text_en} onChange={(e) => set(i, "text_en", e.target.value)} />
            </label>
          </div>
          <div className="cms-actions">
            <button className="btn btn-accent" type="button" disabled={busy} onClick={() => save(i)}>
              {tr(lang, "Хадгалах", "Save")}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => remove(i)}>
              {tr(lang, "Устгах", "Delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Reports ----------
const REPORT_LABELS: Record<Lang, Record<ReportGroupKey, string>> = {
  mn: { tailan: "Тайлан", bodlogo: "Бодлого", juram: "Журам", udirdamj: "Удирдамж" },
  en: { tailan: "Reports", bodlogo: "Policy", juram: "Procedures", udirdamj: "Guidelines" }
};
function ReportsEditor({ lang }: { lang: Lang }) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [group, setGroup] = useState<ReportGroupKey>("tailan");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm(lang);
  const reload = () => listReports().then(setReports).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    reload();
  }, []);
  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const path = await uploadReportFile(file);
      await createReport({ group_key: group, title: title.trim(), file_path: path });
      setTitle("");
      setFile(null);
      setFileKey((k) => k + 1);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const onDelete = async (rec: ReportRecord) => {
    if (!(await confirm(tr(lang, "Устгах уу?", "Delete?")))) return;
    setBusy(true);
    try {
      await deleteReport(rec);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cms-section">
      {dialog}
      <form className="ra-add" onSubmit={onAdd}>
        <h3>{tr(lang, "Шинэ баримт нэмэх", "Add a document")}</h3>
        <div className="ra-add-grid">
          <label>
            {tr(lang, "Бүлэг", "Group")}
            <select value={group} onChange={(e) => setGroup(e.target.value as ReportGroupKey)}>
              {REPORT_GROUPS.map((k) => (
                <option key={k} value={k}>
                  {REPORT_LABELS[lang][k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr(lang, "Баримтын нэр", "Document name")}
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            {tr(lang, "Файл (PDF)", "File (PDF)")}
            <input key={fileKey} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </label>
        </div>
        <Err error={error} />
        <button className="btn btn-accent" type="submit" disabled={busy || !file || !title.trim()}>
          {busy ? tr(lang, "Байршуулж байна…", "Uploading…") : tr(lang, "Байршуулах", "Upload")}
        </button>
      </form>
      <div className="ra-groups">
        {REPORT_GROUPS.map((k) => (
          <div className="ra-group" key={k}>
            <h4>{REPORT_LABELS[lang][k]}</h4>
            {reports.filter((r) => r.group_key === k).length === 0 ? (
              <p className="ra-empty">{tr(lang, "Одоогоор баримт алга.", "No documents yet.")}</p>
            ) : (
              <ul>
                {reports
                  .filter((r) => r.group_key === k)
                  .map((r) => (
                    <li key={r.id}>
                      <a href={reportFileUrl(r.file_path)} target="_blank" rel="noopener noreferrer">
                        {r.title}
                      </a>
                      <button className="ra-del" type="button" disabled={busy} onClick={() => onDelete(r)}>
                        {tr(lang, "Устгах", "Delete")}
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

// ---------- Contact ----------
const EMPTY_CONTACT: cms.ContactInfo = {
  company_mn: "",
  company_en: "",
  phone: "",
  email: "",
  address_mn: "",
  address_en: "",
  map_query: ""
};
function ContactEditor({ lang }: { lang: Lang }) {
  const [info, setInfo] = useState<cms.ContactInfo>(EMPTY_CONTACT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        setInfo({ ...EMPTY_CONTACT, ...(await cms.ensureContact()) });
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, []);
  const set = (key: keyof cms.ContactInfo, v: string) => setInfo((p) => ({ ...p, [key]: v }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await cms.saveContact(info);
      setSaved(true);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const F = (key: keyof cms.ContactInfo, mn: string, en: string) => (
    <label>
      {tr(lang, mn, en)}
      <input value={info[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );
  return (
    <form className="cms-section cms-card" onSubmit={save}>
      <h3>{tr(lang, "Холбоо барих", "Contact")}</h3>
      <div className="cms-grid2">
        {F("company_mn", "Компани (MN)", "Company (MN)")}
        {F("company_en", "Компани (EN)", "Company (EN)")}
        {F("phone", "Утас", "Phone")}
        {F("email", "Имэйл", "Email")}
        {F("address_mn", "Хаяг (MN)", "Address (MN)")}
        {F("address_en", "Хаяг (EN)", "Address (EN)")}
      </div>
      {F("map_query", "Газрын зургийн хайлт", "Map search query")}
      <Err error={error} />
      <div className="cms-actions">
        <button className="btn btn-accent" type="submit" disabled={busy}>
          {busy ? tr(lang, "Хадгалж байна…", "Saving…") : tr(lang, "Хадгалах", "Save")}
        </button>
        {saved ? <span className="cms-saved">{tr(lang, "Хадгалагдсан ✓", "Saved ✓")}</span> : null}
      </div>
    </form>
  );
}

// ---------- Users ----------
const ROLE_LABELS: Record<Lang, Record<cms.Role, string>> = {
  mn: { general_admin: "Ерөнхий админ", board_member: "ТУЗ гишүүн", fund_manager: "Сангийн менежер" },
  en: { general_admin: "General admin", board_member: "Board member", fund_manager: "Fund manager" }
};
function UsersEditor({ lang }: { lang: Lang }) {
  const [profiles, setProfiles] = useState<cms.Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = () => cms.listProfiles().then(setProfiles).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    reload();
  }, []);
  const change = async (id: string, role: cms.Role) => {
    setBusy(true);
    setError(null);
    try {
      await cms.setProfileRole(id, role);
      await reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cms-section">
      <div className="cms-head">
        <h3>{tr(lang, "Хэрэглэгчид & эрх", "Users & roles")}</h3>
      </div>
      <p className="cms-hint">
        {tr(
          lang,
          "Шинэ хэрэглэгч Supabase-д бүртгүүлмэгц энд харагдана. Эрхийг нь доороос сонгоно.",
          "Users appear here once they sign up in Supabase. Assign their role below."
        )}
      </p>
      <Err error={error} />
      <table className="cms-users">
        <thead>
          <tr>
            <th>{tr(lang, "Имэйл", "Email")}</th>
            <th>{tr(lang, "Эрх", "Role")}</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.email ?? p.id}</td>
              <td>
                <select value={p.role} disabled={busy} onChange={(e) => change(p.id, e.target.value as cms.Role)}>
                  {(Object.keys(ROLE_LABELS[lang]) as cms.Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[lang][r]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {profiles.length === 0 ? (
            <tr>
              <td colSpan={2} className="ra-empty">
                {tr(lang, "Хэрэглэгч алга.", "No users yet.")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

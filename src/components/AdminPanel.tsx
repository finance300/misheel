import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { isMarketConfigured, isSeriesConfigured, fetchQuotes, type Quote } from "../lib/market";
import * as cms from "../lib/cms";
import {
  type ReportRecord,
  createReport,
  deleteReport,
  listReports,
  reportFileUrl,
  uploadReportFile
} from "../lib/reports";

type Lang = "mn" | "en";
export type Section = "about" | "funds" | "reports" | "settings";
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
      {section === "about" && <AboutEditor lang={lang} />}
      {section === "funds" && <FundsEditor lang={lang} />}
      {section === "reports" && <ReportsEditor lang={lang} />}
      {section === "settings" && <SettingsEditor lang={lang} />}
    </div>
  );
}

// ---------- About us (Mission/Values + Timeline + Team) ----------
function SectionDivider({ label }: { label: string }) {
  return <h2 className="cms-divider">{label}</h2>;
}

function AboutEditor({ lang }: { lang: Lang }) {
  return (
    <div className="cms-group">
      <SectionDivider label={tr(lang, "Зорилго & Үнэт зүйлс", "Mission & Values")} />
      <MissionEditor lang={lang} />
      <SectionDivider label={tr(lang, "Он цагийн хэлхээс", "Timeline")} />
      <TimelineEditor lang={lang} />
      <SectionDivider label={tr(lang, "Менежментийн баг", "Management team")} />
      <TeamEditor lang={lang} />
    </div>
  );
}

// ---------- Investment funds ----------
const paraToText = (arr: string[]) => arr.join("\n\n");
const textToPara = (text: string) =>
  text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

function FundsEditor({ lang }: { lang: Lang }) {
  const [funds, setFunds] = useState<cms.Fund[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { confirm, dialog } = useConfirm(lang);

  useEffect(() => {
    cms.ensureFunds().then(setFunds).catch((e) => setError(errMsg(e)));
  }, []);

  // Immutable helper: replace fund at index f with patched copy.
  const patchFund = (f: number, patch: Partial<cms.Fund>) =>
    setFunds((arr) => arr.map((fund, i) => (i === f ? { ...fund, ...patch } : fund)));

  const addFund = () =>
    setFunds((arr) => {
      const next = [
        ...arr,
        {
          id: `fund-${arr.length + 1}-${Date.now().toString(36)}`,
          nameMn: "",
          nameEn: "",
          comingSoon: false,
          sections: [],
          committee: []
        }
      ];
      setSelected(next.length - 1);
      return next;
    });
  const removeFund = async (f: number) => {
    if (!(await confirm(tr(lang, "Энэ санг устгах уу?", "Delete this fund?")))) return;
    setFunds((arr) => arr.filter((_, i) => i !== f));
    setSelected((s) => Math.max(0, s >= f ? s - 1 : s));
  };

  const addSection = (f: number) =>
    patchFund(f, { sections: [...funds[f].sections, { headingMn: "", headingEn: "", bodyMn: [], bodyEn: [] }] });
  const setSection = (f: number, s: number, patch: Partial<cms.FundSection>) =>
    patchFund(f, { sections: funds[f].sections.map((sec, i) => (i === s ? { ...sec, ...patch } : sec)) });
  const removeSection = (f: number, s: number) =>
    patchFund(f, { sections: funds[f].sections.filter((_, i) => i !== s) });

  const addMember = (f: number) =>
    patchFund(f, {
      committee: [...funds[f].committee, { nameMn: "", nameEn: "", roleMn: "", roleEn: "", photo: null }]
    });
  const setMember = (f: number, m: number, patch: Partial<cms.CommitteeMember>) =>
    patchFund(f, { committee: funds[f].committee.map((mem, i) => (i === m ? { ...mem, ...patch } : mem)) });
  const removeMember = (f: number, m: number) =>
    patchFund(f, { committee: funds[f].committee.filter((_, i) => i !== m) });
  const onMemberPhoto = async (f: number, m: number, file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const path = await cms.uploadTeamPhoto(file);
      setMember(f, m, { photo: path });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await cms.saveFunds(funds);
      setSaved(true);
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
        <h3>{tr(lang, "Хөрөнгө оруулалтын сан", "Investment funds")}</h3>
        <div className="cms-head-actions">
          {funds.length > 0 ? (
            <select
              className="cms-select"
              aria-label={tr(lang, "Засах санг сонгох", "Select a fund to edit")}
              value={Math.min(selected, funds.length - 1)}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {funds.map((fund, i) => (
                <option key={fund.id} value={i}>
                  {(lang === "mn" ? fund.nameMn : fund.nameEn) || tr(lang, "(нэргүй сан)", "(untitled fund)")}
                </option>
              ))}
            </select>
          ) : null}
          <button className="btn btn-ghost" type="button" onClick={addFund}>
            + {tr(lang, "Сан нэмэх", "Add fund")}
          </button>
        </div>
      </div>
      <Err error={error} />
      {funds.length === 0 ? (
        <p className="cms-hint">{tr(lang, "Сан алга. “Сан нэмэх”-г дарна уу.", "No funds yet. Click “Add fund”.")}</p>
      ) : null}
      {(() => {
        const f = Math.min(selected, funds.length - 1);
        const fund = funds[f];
        if (!fund) return null;
        return (
        <div className="cms-card" key={fund.id}>
          <div className="cms-grid2">
            <label>
              {tr(lang, "Сангийн нэр (MN)", "Fund name (MN)")}
              <input value={fund.nameMn} onChange={(e) => patchFund(f, { nameMn: e.target.value })} />
            </label>
            <label>
              {tr(lang, "Сангийн нэр (EN)", "Fund name (EN)")}
              <input value={fund.nameEn} onChange={(e) => patchFund(f, { nameEn: e.target.value })} />
            </label>
            <label>
              {tr(lang, "Тэмдэглэгээ (MN)", "Tagline (MN)")}
              <input value={fund.tagMn ?? ""} onChange={(e) => patchFund(f, { tagMn: e.target.value })} />
            </label>
            <label>
              {tr(lang, "Тэмдэглэгээ (EN)", "Tagline (EN)")}
              <input value={fund.tagEn ?? ""} onChange={(e) => patchFund(f, { tagEn: e.target.value })} />
            </label>
          </div>
          <label className="cms-check">
            <input
              type="checkbox"
              checked={Boolean(fund.comingSoon)}
              onChange={(e) => patchFund(f, { comingSoon: e.target.checked })}
            />
            <span className="cms-check-box" aria-hidden="true" />
            <span>{tr(lang, "“Тун удахгүй” гэж тэмдэглэх", "Mark as “coming soon”")}</span>
          </label>

          <div className="cms-subhead">
            <h4>{tr(lang, "Хэсгүүд (Гарчиг + текст)", "Sections (heading + text)")}</h4>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => addSection(f)}>
              + {tr(lang, "Хэсэг нэмэх", "Add section")}
            </button>
          </div>
          {fund.sections.map((sec, s) => (
            <div className="cms-subcard" key={s}>
              <div className="cms-grid2">
                <label>
                  {tr(lang, "Гарчиг (MN) — ж: Танилцуулга", "Heading (MN) — e.g. Overview")}
                  <input value={sec.headingMn} onChange={(e) => setSection(f, s, { headingMn: e.target.value })} />
                </label>
                <label>
                  {tr(lang, "Гарчиг (EN) — e.g. Overview", "Heading (EN) — e.g. Overview")}
                  <input value={sec.headingEn} onChange={(e) => setSection(f, s, { headingEn: e.target.value })} />
                </label>
                <label>
                  {tr(lang, "Текст (MN)", "Text (MN)")}
                  <textarea
                    rows={4}
                    value={paraToText(sec.bodyMn)}
                    onChange={(e) => setSection(f, s, { bodyMn: textToPara(e.target.value) })}
                  />
                </label>
                <label>
                  {tr(lang, "Текст (EN)", "Text (EN)")}
                  <textarea
                    rows={4}
                    value={paraToText(sec.bodyEn)}
                    onChange={(e) => setSection(f, s, { bodyEn: textToPara(e.target.value) })}
                  />
                </label>
              </div>
              <p className="cms-hint">
                {tr(lang, "Догол мөр тусгаарлахдаа хоосон мөр үлдээнэ.", "Separate paragraphs with a blank line.")}
              </p>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeSection(f, s)}>
                {tr(lang, "Хэсэг устгах", "Delete section")}
              </button>
            </div>
          ))}

          <div className="cms-subhead">
            <h4>{tr(lang, "Хөрөнгө оруулалтын хороо", "Investment committee")}</h4>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => addMember(f)}>
              + {tr(lang, "Гишүүн нэмэх", "Add member")}
            </button>
          </div>
          {fund.committee.map((mem, m) => (
            <div className="cms-subcard cms-person" key={m}>
              <div className="cms-photo">
                {cms.teamPhotoUrl(mem.photo) ? (
                  <img src={cms.teamPhotoUrl(mem.photo) as string} alt="" />
                ) : (
                  <div className="cms-photo-empty">{tr(lang, "Зураггүй", "No photo")}</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => onMemberPhoto(f, m, e.target.files?.[0] ?? null)} />
              </div>
              <div className="cms-grid2 cms-person-fields">
                <label>
                  {tr(lang, "Нэр (MN)", "Name (MN)")}
                  <input value={mem.nameMn} onChange={(e) => setMember(f, m, { nameMn: e.target.value })} />
                </label>
                <label>
                  {tr(lang, "Нэр (EN)", "Name (EN)")}
                  <input value={mem.nameEn} onChange={(e) => setMember(f, m, { nameEn: e.target.value })} />
                </label>
                <label>
                  {tr(lang, "Албан тушаал (MN)", "Title (MN)")}
                  <input value={mem.roleMn} onChange={(e) => setMember(f, m, { roleMn: e.target.value })} />
                </label>
                <label>
                  {tr(lang, "Албан тушаал (EN)", "Title (EN)")}
                  <input value={mem.roleEn} onChange={(e) => setMember(f, m, { roleEn: e.target.value })} />
                </label>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeMember(f, m)}>
                {tr(lang, "Гишүүн устгах", "Delete member")}
              </button>
            </div>
          ))}

          <div className="cms-actions">
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => removeFund(f)}>
              {tr(lang, "Энэ санг устгах", "Delete this fund")}
            </button>
          </div>
        </div>
        );
      })()}

      <div className="cms-actions cms-sticky-save">
        <button className="btn btn-accent" type="button" disabled={busy} onClick={saveAll}>
          {busy ? tr(lang, "Хадгалж байна…", "Saving…") : tr(lang, "Бүгдийг хадгалах", "Save all changes")}
        </button>
        {saved ? <span className="cms-saved">{tr(lang, "Хадгалагдсан ✓", "Saved ✓")}</span> : null}
      </div>
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

// ---------- Reports & Regulations ----------
function ReportsEditor({ lang }: { lang: Lang }) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [cats, setCats] = useState<cms.ReportCategory[]>([]);
  const [group, setGroup] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catsSaved, setCatsSaved] = useState(false);
  const { confirm, dialog } = useConfirm(lang);

  const reloadReports = () => listReports().then(setReports).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    reloadReports();
    cms
      .ensureReportCategories()
      .then((c) => {
        setCats(c);
        setGroup((g) => g || c[0]?.key || "");
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const catLabel = (key: string) => {
    const c = cats.find((x) => x.key === key);
    return c ? (lang === "mn" ? c.title_mn : c.title_en) : key;
  };

  // --- Category management ---
  const setCat = (i: number, patch: Partial<cms.ReportCategory>) =>
    setCats((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addCat = () =>
    setCats((arr) => [
      ...arr,
      { key: `cat-${Date.now().toString(36)}`, title_mn: "", title_en: "", sort_order: arr.length }
    ]);
  const removeCat = async (i: number) => {
    const c = cats[i];
    const count = reports.filter((r) => r.group_key === c.key).length;
    const msg =
      count > 0
        ? tr(
            lang,
            `Энэ ангилалд ${count} баримт байна. Ангиллыг устгавал тэдгээр нуугдана. Үргэлжлүүлэх үү?`,
            `This category has ${count} document(s). Deleting it will hide them. Continue?`
          )
        : tr(lang, "Ангиллыг устгах уу?", "Delete this category?");
    if (!(await confirm(msg))) return;
    setCats((arr) => arr.filter((_, idx) => idx !== i));
  };
  const saveCats = async () => {
    setBusy(true);
    setError(null);
    setCatsSaved(false);
    try {
      await cms.saveReportCategories(cats);
      setCatsSaved(true);
      if (!cats.some((c) => c.key === group)) setGroup(cats[0]?.key || "");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // --- Documents ---
  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!files.length || !group) return;
    setBusy(true);
    setError(null);
    try {
      // One typed name only applies to a single file; otherwise name each by its filename.
      const useTitle = files.length === 1 && title.trim();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`${i + 1}/${files.length}`);
        const path = await uploadReportFile(f);
        const name = useTitle ? title.trim() : f.name.replace(/\.pdf$/i, "");
        await createReport({ group_key: group, title: name, file_path: path });
      }
      setTitle("");
      setFiles([]);
      setFileKey((k) => k + 1);
      await reloadReports();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setProgress("");
      setBusy(false);
    }
  };
  const onDelete = async (rec: ReportRecord) => {
    if (!(await confirm(tr(lang, "Устгах уу?", "Delete?")))) return;
    setBusy(true);
    try {
      await deleteReport(rec);
      await reloadReports();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cms-section">
      {dialog}
      <Err error={error} />

      <div className="cms-card">
        <div className="cms-head">
          <h3>{tr(lang, "Ангиллууд", "Categories")}</h3>
          <button className="btn btn-ghost btn-sm" type="button" onClick={addCat}>
            + {tr(lang, "Ангилал нэмэх", "Add category")}
          </button>
        </div>
        {cats.map((c, i) => (
          <div className="cms-grid2 cms-cat-row" key={c.key}>
            <label>
              {tr(lang, "Нэр (MN)", "Title (MN)")}
              <input value={c.title_mn} onChange={(e) => setCat(i, { title_mn: e.target.value })} />
            </label>
            <label>
              {tr(lang, "Нэр (EN)", "Title (EN)")}
              <input value={c.title_en} onChange={(e) => setCat(i, { title_en: e.target.value })} />
            </label>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCat(i)}>
              {tr(lang, "Устгах", "Delete")}
            </button>
          </div>
        ))}
        <div className="cms-actions">
          <button className="btn btn-accent" type="button" disabled={busy} onClick={saveCats}>
            {tr(lang, "Ангилал хадгалах", "Save categories")}
          </button>
          {catsSaved ? <span className="cms-saved">{tr(lang, "Хадгалагдсан ✓", "Saved ✓")}</span> : null}
        </div>
      </div>

      <form className="ra-add" onSubmit={onAdd}>
        <h3>{tr(lang, "Шинэ баримт нэмэх", "Add a document")}</h3>
        <div className="ra-add-grid">
          <label>
            {tr(lang, "Ангилал", "Category")}
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {lang === "mn" ? c.title_mn : c.title_en}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr(lang, "Баримтын нэр", "Document name")}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr(lang, "Хоосон бол файлын нэрийг ашиглана", "Blank → use file names")}
            />
          </label>
          <label>
            {tr(lang, "Файл (PDF)", "Files (PDF)")}
            <input
              key={fileKey}
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>
        {files.length > 0 ? (
          <div className="ra-filelist">
            <p className="cms-hint">
              {tr(lang, `${files.length} файл сонгосон`, `${files.length} file(s) selected`)}
              {files.length > 1
                ? tr(lang, " — тус бүрийг файлын нэрээр нэрлэнэ.", " — each named by its filename.")
                : ""}
            </p>
            <ul>
              {files.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <button className="btn btn-accent" type="submit" disabled={busy || !files.length || !group}>
          {busy
            ? `${tr(lang, "Байршуулж байна", "Uploading")}… ${progress}`
            : tr(lang, "Байршуулах", "Upload")}
        </button>
      </form>

      <div className="ra-groups">
        {cats.map((c) => (
          <div className="ra-group" key={c.key}>
            <h4>{catLabel(c.key)}</h4>
            {reports.filter((r) => r.group_key === c.key).length === 0 ? (
              <p className="ra-empty">{tr(lang, "Одоогоор баримт алга.", "No documents yet.")}</p>
            ) : (
              <ul>
                {reports
                  .filter((r) => r.group_key === c.key)
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

// ---------- Stock data API status ----------
function StockApiStatus({ lang }: { lang: Lang }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      const quotes: Quote[] = await fetchQuotes();
      if (quotes.length > 0) {
        const sample = quotes[0];
        setResult({
          ok: true,
          msg: tr(
            lang,
            `${quotes.length} ширхэг ханш ирлээ. Жишээ: ${sample.label} ${sample.value} (${sample.change >= 0 ? "+" : ""}${sample.change.toFixed(2)}%)`,
            `Received ${quotes.length} live quotes. Sample: ${sample.label} ${sample.value} (${sample.change >= 0 ? "+" : ""}${sample.change.toFixed(2)}%)`
          )
        });
      } else {
        setResult({
          ok: false,
          msg: tr(lang, "Ханш ирсэнгүй — API түлхүүр эсвэл хязгаарыг шалгана уу.", "No quotes returned — check the API key or rate limit.")
        });
      }
    } catch (e) {
      setResult({ ok: false, msg: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };
  const Badge = ({ on }: { on: boolean }) => (
    <span className={`cms-badge ${on ? "is-on" : "is-off"}`}>
      {on ? tr(lang, "Тохируулсан", "Configured") : tr(lang, "Тохируулаагүй", "Not set")}
    </span>
  );
  return (
    <div className="cms-section cms-card">
      <h3>{tr(lang, "Хувьцааны мэдээллийн API", "Stock data API")}</h3>
      <ul className="cms-status-list">
        <li>
          <span>Finnhub ({tr(lang, "шууд ханш", "live quotes")})</span> <Badge on={isMarketConfigured} />
        </li>
        <li>
          <span>Twelve Data ({tr(lang, "график", "charts")})</span> <Badge on={isSeriesConfigured} />
        </li>
      </ul>
      <p className="cms-hint">
        {tr(
          lang,
          "Түлхүүрүүд .env файлд (VITE_FINNHUB_API_KEY, VITE_TWELVEDATA_API_KEY) хадгалагдана.",
          "Keys live in the .env file (VITE_FINNHUB_API_KEY, VITE_TWELVEDATA_API_KEY)."
        )}
      </p>
      <div className="cms-actions">
        <button className="btn btn-accent" type="button" disabled={busy} onClick={test}>
          {busy ? tr(lang, "Шалгаж байна…", "Testing…") : tr(lang, "API шалгах", "Test API")}
        </button>
      </div>
      {result ? <p className={result.ok ? "cms-saved" : "ra-error"}>{result.msg}</p> : null}
    </div>
  );
}

// ---------- General settings (stock API + contact) ----------
const MEMBER_ROLE_LABELS: Record<Lang, Record<cms.Role, string>> = {
  mn: { general_admin: "Ерөнхий админ", board_member: "ТУЗ гишүүн", fund_manager: "Сангийн менежер" },
  en: { general_admin: "General admin", board_member: "Board member", fund_manager: "Fund manager" }
};

function MembersList({ lang }: { lang: Lang }) {
  const [profiles, setProfiles] = useState<cms.Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    cms.listProfiles().then(setProfiles).catch((e) => setError(errMsg(e)));
  }, []);
  return (
    <div className="cms-section cms-card">
      <h3>{tr(lang, "Нэвтрэх эрхтэй гишүүд", "Members with access")}</h3>
      <Err error={error} />
      {profiles.length === 0 ? (
        <p className="cms-hint">{tr(lang, "Одоогоор гишүүн алга.", "No members yet.")}</p>
      ) : (
        <ul className="member-emails">
          {profiles.map((p) => (
            <li key={p.id}>
              <span className="member-email">{p.email ?? p.id}</span>
              <span className="member-role-tag">{MEMBER_ROLE_LABELS[lang][p.role] ?? p.role}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="cms-hint">
        {tr(
          lang,
          "Шинэ гишүүнийг Supabase → Authentication → Users хэсэгт нэмнэ.",
          "Add new members in Supabase → Authentication → Users."
        )}
      </p>
    </div>
  );
}

function SettingsEditor({ lang }: { lang: Lang }) {
  return (
    <div className="cms-group">
      <SectionDivider label={tr(lang, "Хувьцааны мэдээлэл", "Stock information")} />
      <StockApiStatus lang={lang} />
      <SectionDivider label={tr(lang, "Гишүүд", "Members")} />
      <MembersList lang={lang} />
      <SectionDivider label={tr(lang, "Холбоо барих", "Contact")} />
      <ContactEditor lang={lang} />
    </div>
  );
}


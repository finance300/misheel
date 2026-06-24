import { supabase } from "./supabase";

// ---------- Types ----------
export type HomeCard = {
  id: string;
  title_mn: string;
  body_mn: string;
  title_en: string;
  body_en: string;
  sort_order: number;
};

export type TeamMember = {
  id: string;
  name_mn: string;
  role_mn: string;
  name_en: string;
  role_en: string;
  photo_path: string | null;
  sort_order: number;
};

export type TimelineEvent = {
  id: string;
  year: string;
  text_mn: string;
  text_en: string;
  sort_order: number;
};

export type Role = "general_admin" | "board_member" | "fund_manager";

export type Profile = {
  id: string;
  email: string | null;
  role: Role;
};

export type ContactInfo = {
  company_mn: string;
  company_en: string;
  phone: string;
  email: string;
  address_mn: string;
  address_en: string;
  map_query: string;
};

const TEAM_BUCKET = "team";

// Current site content — auto-populates the CMS the first time it's opened.
// Fixed IDs make seeding idempotent (re-seeding updates the same row, never duplicates).
export const DEFAULT_HOME_CARDS: HomeCard[] = [
  {
    id: "11111111-0000-4000-8000-000000000001",
    title_mn: "Алсын хараа",
    body_mn: "Бид гайхамшигт түүхийг бүтээгч, Азийн хамгийн шилдэг санхүүгийн тоглогч байна.",
    title_en: "Vision",
    body_en:
      "Together with all our stakeholders, we are the creators of wonderful history. We will be the most compelling financial firm in Asia.",
    sort_order: 0
  },
  {
    id: "11111111-0000-4000-8000-000000000002",
    title_mn: "Эрхэмсэг оршихуй",
    body_mn:
      "Нийгэмд эерэг өөрчлөлтийг авчирч, урт хугацаанд тогтвортой хөгжих хамгийн том санхүүгийн удирдан чиглүүлэгч байна.",
    title_en: "Mission",
    body_en: "Our mission is to deliver economic betterment for both our investors and our investees.",
    sort_order: 1
  },
  {
    id: "11111111-0000-4000-8000-000000000003",
    title_mn: "Үнэт зүйлс",
    body_mn: "Хүндлэл, Хамтын зүтгэл, Инноваци, Стюардшип, Төгөлдөршил, Ил тод байдал",
    title_en: "Our values",
    body_en: "Respect, Teamwork, Innovation, Stewardship, Excellence, Transparency",
    sort_order: 2
  }
];

export const DEFAULT_TEAM: TeamMember[] = [
  { id: "22222222-0000-4000-8000-000000000001", name_mn: "Лакшми Боожоо", role_mn: "ТУЗ-ийн дарга", name_en: "Lakshmi Boojoo", role_en: "Chair", photo_path: "/assets/team/lakshmi.png", sort_order: 0 },
  { id: "22222222-0000-4000-8000-000000000002", name_mn: "Монсор Нямдаваа", role_mn: "Гүйцэтгэх захирал, ТУЗ-ийн гишүүн", name_en: "Monsor Nyamdavaa", role_en: "CEO, Director", photo_path: "/assets/team/monsor.png", sort_order: 1 },
  { id: "22222222-0000-4000-8000-000000000003", name_mn: "Оймандах Жамъянсүрэн", role_mn: "ТУЗ-ийн гишүүн", name_en: "Oimandakh Jamiyansuren", role_en: "Director", photo_path: "/assets/team/oimandah.jpg", sort_order: 2 },
  { id: "22222222-0000-4000-8000-000000000004", name_mn: "Уянга Алтан-Эрдэнэ", role_mn: "Хөрөнгө оруулалтын сангийн зөвлөх", name_en: "Uyanga Altan-Erdene", role_en: "Fund Manager", photo_path: "/assets/team/uyanga.png", sort_order: 3 },
  { id: "22222222-0000-4000-8000-000000000005", name_mn: "Идэрбат Ариуна", role_mn: "Хөрөнгө оруулалтын сангийн зөвлөх", name_en: "Iderbat Ariuna", role_en: "Fund Manager", photo_path: "/assets/team/iderbat.png", sort_order: 4 }
];

export const DEFAULT_TIMELINE: TimelineEvent[] = [
  { id: "33333333-0000-4000-8000-000000000001", year: "2011", text_mn: "Ассет Менежментийн үйл ажиллагааны чиглэлтэйгээр үүсгэн байгуулагдав.", text_en: "Asset management company was established.", sort_order: 0 },
  { id: "33333333-0000-4000-8000-000000000002", year: "2013", text_mn: "Хөрөнгө Оруулалтын Сангийн тухай хуулийн ажлын хэсэгт ажиллав.", text_en: "Co-operated as part of working group of Law on Investment Funds.", sort_order: 1 },
  { id: "33333333-0000-4000-8000-000000000003", year: "2015", text_mn: "Хөрөнгө Оруулалтын Менежментийн үйл ажиллагаа эрхлэх тусгай зөвшөөрлийг СЗХ-ноос авав.", text_en: "Licensed by FRC as a fund management company.", sort_order: 2 },
  { id: "33333333-0000-4000-8000-000000000004", year: "2016", text_mn: "Компанийн үйл ажиллагаанд ESG зарчмыг тусган нэвтрүүлж эхлэв.", text_en: "Adopted ESG values as one of the core principles of the company.", sort_order: 3 },
  { id: "33333333-0000-4000-8000-000000000005", year: "2016", text_mn: "Хувийн хөрөнгө оруулалтын сан: Үл Хөдлөх Хөрөнгө.", text_en: "First real estate fund management.", sort_order: 4 },
  { id: "33333333-0000-4000-8000-000000000006", year: "2018", text_mn: "Хувийн хөрөнгө оруулалтын сан: Хувьцаат компани.", text_en: "Listed equity fund established.", sort_order: 5 }
];

export const DEFAULT_CONTACT: ContactInfo = {
  company_mn: "Улаанбаатар Ассет Менежмент ХХК",
  company_en: "Ulaanbaatar Asset Management LLC",
  phone: "+976-7011-2606",
  email: "info@ubam.mn",
  address_mn:
    "Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Чингисийн өргөн чөлөө - 24, Парк Плэйс барилга, 4 давхар, 401 тоот",
  address_en: "Suite #401, Park Place office, 1st khoroo, Sukhbaatar district, Ulaanbaatar, Mongolia",
  map_query: "Park Place, Chinggis Ave, Ulaanbaatar"
};

function ensure() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

// ---------- Home (Mission / Values) cards ----------
export async function listHomeCards(): Promise<HomeCard[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("home_cards")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeCard[];
}

export async function upsertHomeCard(card: Partial<HomeCard> & { id?: string }): Promise<void> {
  const db = ensure();
  const { error } = await db.from("home_cards").upsert(card);
  if (error) throw error;
}

export async function deleteHomeCard(id: string): Promise<void> {
  const db = ensure();
  const { error } = await db.from("home_cards").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Team members ----------
export async function listTeamMembers(): Promise<TeamMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function upsertTeamMember(m: Partial<TeamMember> & { id?: string }): Promise<void> {
  const db = ensure();
  const { error } = await db.from("team_members").upsert(m);
  if (error) throw error;
}

export async function deleteTeamMember(member: TeamMember): Promise<void> {
  const db = ensure();
  const { error } = await db.from("team_members").delete().eq("id", member.id);
  if (error) throw error;
  if (member.photo_path) {
    await db.storage.from(TEAM_BUCKET).remove([member.photo_path]);
  }
}

export async function uploadTeamPhoto(fileToUpload: File): Promise<string> {
  const db = ensure();
  const safe = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safe}`;
  const { error } = await db.storage
    .from(TEAM_BUCKET)
    .upload(path, fileToUpload, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}

export function teamPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  // Bundled assets ("/assets/...") or full URLs are used as-is; otherwise it's a storage path.
  if (path.startsWith("http") || path.startsWith("/")) return path;
  if (!supabase) return null;
  return supabase.storage.from(TEAM_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---------- Timeline ----------
export async function listTimelineEvents(): Promise<TimelineEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimelineEvent[];
}

export async function upsertTimelineEvent(
  e: Partial<TimelineEvent> & { id?: string }
): Promise<void> {
  const db = ensure();
  const { error } = await db.from("timeline_events").upsert(e);
  if (error) throw error;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const db = ensure();
  const { error } = await db.from("timeline_events").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Contact (stored in site_settings under key 'contact') ----------
export async function getContact(): Promise<ContactInfo | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "contact")
    .maybeSingle();
  if (error) throw error;
  return (data?.value as ContactInfo | undefined) ?? null;
}

export async function saveContact(info: ContactInfo): Promise<void> {
  const db = ensure();
  const { error } = await db.from("site_settings").upsert({ key: "contact", value: info });
  if (error) throw error;
}

// ---------- Auto-seed (runs once per table, race-safe) ----------
// Memoize the seed op so React's double-mount (dev) can't insert twice.
const seedGuards: Record<string, Promise<void>> = {};
function ensureSeed(key: string, run: () => Promise<void>): Promise<void> {
  if (!seedGuards[key]) {
    seedGuards[key] = run().catch((e) => {
      delete seedGuards[key]; // allow a retry on failure
      throw e;
    });
  }
  return seedGuards[key];
}

export async function ensureHomeCards(): Promise<HomeCard[]> {
  await ensureSeed("home_cards", async () => {
    if ((await listHomeCards()).length === 0) {
      await Promise.all(DEFAULT_HOME_CARDS.map((c) => upsertHomeCard(c)));
    }
  });
  return listHomeCards();
}

export async function ensureTeam(): Promise<TeamMember[]> {
  await ensureSeed("team_members", async () => {
    if ((await listTeamMembers()).length === 0) {
      await Promise.all(DEFAULT_TEAM.map((m) => upsertTeamMember(m)));
    }
  });
  return listTeamMembers();
}

export async function ensureTimeline(): Promise<TimelineEvent[]> {
  await ensureSeed("timeline_events", async () => {
    if ((await listTimelineEvents()).length === 0) {
      await Promise.all(DEFAULT_TIMELINE.map((e) => upsertTimelineEvent(e)));
    }
  });
  return listTimelineEvents();
}

export async function ensureContact(): Promise<ContactInfo> {
  await ensureSeed("contact", async () => {
    if (!(await getContact())) await saveContact(DEFAULT_CONTACT);
  });
  return (await getContact()) ?? DEFAULT_CONTACT;
}

// ---------- Profiles / roles ----------
export async function listProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setProfileRole(id: string, role: Role): Promise<void> {
  const db = ensure();
  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

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

// ---------- Investment funds (stored in site_settings under key 'funds') ----------
export type FundSection = { headingMn: string; headingEn: string; bodyMn: string[]; bodyEn: string[] };
export type CommitteeMember = {
  nameMn: string;
  nameEn: string;
  roleMn: string;
  roleEn: string;
  photo: string | null;
};
export type Fund = {
  id: string;
  nameMn: string;
  nameEn: string;
  tagMn?: string;
  tagEn?: string;
  comingSoon?: boolean;
  sections: FundSection[];
  committee: CommitteeMember[];
};

export const DEFAULT_FUNDS: Fund[] = [
  {
    id: "misheel",
    nameMn: "Мишээл Рийл Истэйт Фанд",
    nameEn: "Misheel Real Estate Fund",
    sections: [
      {
        headingMn: "Танилцуулга",
        headingEn: "Overview",
        bodyMn: [
          "Мишээл Фанд нь олон улсын хувьцааны зах зээлд мэргэшсэн, дотоодын хөрөнгө оруулагчдад зохицуулалттай бөгөөд нэгдсэн хэрэгслээр дамжуулан дэлхийн зах зээлд гарах боломжийг олгодог хувийн хөрөнгө оруулалтын сан юм. Бид Хойд Америк, Европ, Азийн тэргүүлэх биржүүдэд хөрөнгө оруулж, урт хугацааны өсөлтийн стратегийг тактикийн уян хатан шийдвэрүүдтэй хослуулан, хөрөнгө оруулагчдынхаа үнэ цэнийг тогтвортой өсгөхийг зорьдог. Сангийн үйл ажиллагааг Санхүүгийн Зохицуулах Хорооны №380/11 тоот тусгай зөвшөөрөлтэй Улаанбаатар Ассет Менежмент ХХК мэргэжлийн түвшинд удирдан зохион байгуулдаг."
        ],
        bodyEn: [
          "Misheel Fund is a private investment fund that gives qualified investors structured access to international equity markets through a single regulated vehicle. The fund invests across global exchanges — North America, Europe, and Asia — combining growth-oriented positions with selective tactical exposures, with the aim of generating long-term capital appreciation for its investors.",
          "The fund is managed by Ulaanbaatar Asset Management LLC, regulated by the Financial Regulatory Commission of Mongolia under license №380/11."
        ]
      },
      {
        headingMn: "Хөрөнгө оруулалтын бодлого",
        headingEn: "Investment approach",
        bodyMn: [
          "Бид олон улсын хувьцаа, биржээр арилжаалагддаг сан буюу ETF болон тэдгээртэй холбогдох санхүүгийн хэрэгслүүдээс бүрдсэн, салбар болон валютын өндөр төрөлжилттэй багцыг удирддаг. Хөрөнгө оруулалтын шийдвэр гаргахдаа суурь шинжилгээний гүн гүнзгий судалгаанд тулгуурлаж, техникийн шинжилгээ болон эрсдэлийн удирдлагын хатуу сахилга батыг баримталдаг."
        ],
        bodyEn: [
          "The fund holds a diversified portfolio of international equities, ETFs, and related instruments across multiple sectors and currencies. Positions are taken based on fundamental conviction, supported by technical analysis and disciplined risk management."
        ]
      },
      {
        headingMn: "Бидний оршин тогтнох шалтгаан",
        headingEn: "Why this fund exists",
        bodyMn: [
          "Олон улсын санхүүгийн зах зээл нь олон төрлийн бирж, валютын зөрүү, цагийн бүс болон хууль эрх зүйн ялгаатай орчныг даван туулж чадсан хөрөнгө оруулагчдад асар их боломжийг олгодог. Гэвч Монголын ихэнх хөрөнгө оруулагчдын хувьд санхүүгийн чадамжаас илүүтэйгээр олон улсын багцыг удирдах дэд бүтэц, мэргэжлийн судалгаа болон үйл ажиллагааны нарийн төвөгтэй байдал нь дэлхийн зах зээлд шууд нэвтрэхэд гол саад тотгор болдог юм.",
          "Мишээл Фанд яг энэ орон зайг нөхдөг. Бид дотоодын хөрөнгө оруулагчдад бие даан нэвтрэхэд хүндрэлтэй дэлхийн зах зээлд институцийн түвшний хүртээмжийг олгож байна. Ингэхдээ мэргэжлийн багийн гүнзгий судалгаа, олон улсын гүйцэтгэлийн дэд бүтэц болон эрсдэлийн удирдлагын цогц системийг хамтад нь санал болгож байна."
        ],
        bodyEn: [
          "International markets offer real opportunities to investors who can navigate multiple exchanges, currencies, time zones, and regulatory regimes. Most Mongolian investors cannot — not because they lack capital, but because the infrastructure, the research, and the operational complexity of running a multi-currency international book are out of reach.",
          "Misheel Fund closes that gap. It gives Mongolian investors institutional-grade access to markets they would otherwise have to navigate alone, with the research depth, execution infrastructure, and risk discipline of a professional management team."
        ]
      }
    ],
    committee: [
      { nameMn: "Н. Монсор", nameEn: "N. Monsor", roleMn: "Гүйцэтгэх захирал, ТУЗ-гишүүн", roleEn: "CEO, Board member", photo: "/assets/team/monsor.png" },
      { nameMn: "А. Уянга", nameEn: "A. Uyanga", roleMn: "ХОС зөвлөх", roleEn: "Investment fund advisor", photo: "/assets/team/uyanga.png" },
      { nameMn: "А. Идэрбат", nameEn: "A. Iderbat", roleMn: "ХОС зөвлөх", roleEn: "Investment fund advisor", photo: "/assets/team/iderbat.png" }
    ]
  },
  {
    id: "kk",
    nameMn: "КК Рийл Истэйт Фанд",
    nameEn: "KK Real Estate Fund",
    comingSoon: true,
    sections: [],
    committee: []
  }
];

export async function getFunds(): Promise<Fund[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "funds")
    .maybeSingle();
  if (error) throw error;
  const value = data?.value as Fund[] | undefined;
  return value && Array.isArray(value) ? value : null;
}

export async function saveFunds(funds: Fund[]): Promise<void> {
  const db = ensure();
  const { error } = await db.from("site_settings").upsert({ key: "funds", value: funds });
  if (error) throw error;
}

export async function ensureFunds(): Promise<Fund[]> {
  await ensureSeed("funds", async () => {
    if (!(await getFunds())) await saveFunds(DEFAULT_FUNDS);
  });
  return (await getFunds()) ?? DEFAULT_FUNDS;
}

// ---------- Report categories (stored in site_settings under key 'report_categories') ----------
export type ReportCategory = { key: string; title_mn: string; title_en: string; sort_order: number };

export const DEFAULT_REPORT_CATEGORIES: ReportCategory[] = [
  { key: "tailan", title_mn: "Тайлан", title_en: "Reports", sort_order: 0 },
  { key: "bodlogo", title_mn: "Бодлого", title_en: "Policy", sort_order: 1 },
  { key: "juram", title_mn: "Журам", title_en: "Procedures", sort_order: 2 },
  { key: "udirdamj", title_mn: "Удирдамж", title_en: "Guidelines", sort_order: 3 }
];

export async function getReportCategories(): Promise<ReportCategory[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "report_categories")
    .maybeSingle();
  if (error) throw error;
  const value = data?.value as ReportCategory[] | undefined;
  return value && Array.isArray(value) ? value : null;
}

export async function saveReportCategories(cats: ReportCategory[]): Promise<void> {
  const db = ensure();
  const { error } = await db.from("site_settings").upsert({ key: "report_categories", value: cats });
  if (error) throw error;
}

export async function ensureReportCategories(): Promise<ReportCategory[]> {
  await ensureSeed("report_categories", async () => {
    if (!(await getReportCategories())) await saveReportCategories(DEFAULT_REPORT_CATEGORIES);
  });
  return (await getReportCategories()) ?? DEFAULT_REPORT_CATEGORIES;
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

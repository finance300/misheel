import { useMemo, useState } from "react";

type Lang = "mn" | "en";
type Role = "board_member" | "fund_manager";

type TranslationMap = Record<string, string>;

const translations: Record<Lang, TranslationMap> = {
  mn: {
    "brand.sub": "Улаанбаатар Ассет Менежмент",
    "nav.home": "Эхлэл",
    "nav.about": "Бидний тухай",
    "nav.strategy": "Стратеги",
    "nav.team": "Баг",
    "nav.timeline": "Он цаг",
    "nav.contact": "Холбоо барих",
    "auth.login": "Нэвтрэх",
    "hero.kicker": "Investment Management",
    "hero.body": "Бид гайхамшигт түүхийг бүтээгч, Азийн хамгийн шилдэг санхүүгийн тоглогч байна.",
    "hero.learn": "Дэлгэрэнгүй",
    "about.visionTitle": "Алсын хараа",
    "about.visionBody": "Бид гайхамшигт түүхийг бүтээгч, Азийн хамгийн шилдэг санхүүгийн тоглогч байна.",
    "about.missionTitle": "Эрхэмсэг оршихуй",
    "about.missionBody":
      "Нийгэмд эерэг өөрчлөлтийг авчирч, урт хугацаанд тогтвортой хөгжих хамгийн том санхүүгийн удирдан чиглүүлэгч байна.",
    "about.valuesTitle": "Үнэт зүйлс",
    "about.valuesBody": "Хүндлэл, Хамтын зүтгэл, Инноваци, Стюардшип, Төгөлдөршил, Ил тод байдал",
    "about.glanceTitle": "Туршлага",
    "about.glanceBody":
      "Анх 2011 онд байгуулагдахдаа дотоодын зах зээлд хөрөнгө оруулалт хийх замаар хөгжүүлэх зорилготой байгуулагдсан. Өнөөдрийн байдлаар СЗХ-ны 380/11 тоот тусгай зөвшөөрлийн хүрээнд хэд хэдэн Хөрөнгө Оруулалтын Сан (ХОС) удирдаж байна.",
    "strategy.title": "Хөрөнгө оруулалтын стратеги",
    "strategy.s1": "Тогтвортой бизнесийн ХОС",
    "strategy.s2": "Үл Хөдлөх Хөрөнгийн ХОС",
    "strategy.s3": "Түрээсийн ХОС",
    "strategy.s4": "Хаалттай Компанийн Хувьцааны ХОС",
    "team.title": "Менежментийн баг",
    "timeline.title": "Он цагийн хэлхээс",
    "investor.title": "Хөрөнгө оруулагч",
    "investor.subtitle": "Хөрөнгө оруулагчдад зориулсан веб систем",
    "contact.title": "Холбоо барих",
    "contact.company": "Улаанбаатар Ассет Менежмент ҮЦК ХХК",
    "contact.address":
      "Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Чингисийн өргөн чөлөө - 24, Парк Плэйс барилга, 4 давхар, 401 тоот",
    "footer.copy": "© 2026 Улаанбаатар Ассет Менежмент ҮЦК ХХК. Бүх эрх хуулиар хамгаалагдсан.",
    "login.title": "Дотоод системд нэвтрэх",
    "login.desc": "Нэвтрэх эрхээ сонгоно уу.",
    "login.cancel": "Буцах",
    "role.board": "ТУЗ Гишүүн",
    "role.fund": "Сангийн Менежер",
    "internal.brand": "Дотоод Систем",
    "internal.back": "Нүүр сайт руу буцах",
    "internal.selected": "Сонгосон эрх",
    "internal.desc":
      "Энэ бол дотоод системийн нэвтрэх цэг. Дараагийн алхмаар Supabase Auth болон эрхийн хяналтыг холбоно.",
    "internal.switch": "Эрх дахин сонгох",
    "internal.help": "Холбоо барих"
  },
  en: {
    "brand.sub": "Ulaanbaatar Asset Management",
    "nav.home": "Home",
    "nav.about": "About",
    "nav.strategy": "Strategy",
    "nav.team": "Team",
    "nav.timeline": "Timeline",
    "nav.contact": "Contact",
    "auth.login": "Log in",
    "hero.kicker": "Investment Management",
    "hero.body": "We are the creators of a wonderful history and the best financial players in Asia.",
    "hero.learn": "Learn more",
    "about.visionTitle": "Vision",
    "about.visionBody":
      "Together with all our stakeholders, we are the creators of wonderful history. We will be the most compelling financial firm in Asia.",
    "about.missionTitle": "Mission",
    "about.missionBody": "Our mission is to deliver economic betterment for both our investors and our investees.",
    "about.valuesTitle": "Our values",
    "about.valuesBody": "Respect, Teamwork, Innovation, Stewardship, Excellence, Transparency",
    "about.glanceTitle": "UBAM at a glance",
    "about.glanceBody":
      "Established in 2011, UBAM currently has several private funds under management.",
    "strategy.title": "Investment Strategy",
    "strategy.s1": "Impact investment opportunity",
    "strategy.s2": "Real estate opportunity",
    "strategy.s3": "Real estate investment trust",
    "strategy.s4": "Private equity opportunity",
    "team.title": "Management team",
    "timeline.title": "Timeline",
    "investor.title": "Investors",
    "investor.subtitle": "Web system for collaborating partners and investors",
    "contact.title": "Contact us",
    "contact.company": "Ulaanbaatar Asset Management LLC",
    "contact.address": "Suite #401, Park Place office, 1st khoroo, Sukhbaatar district, Ulaanbaatar, Mongolia",
    "footer.copy": "© 2026 Ulaanbaatar Asset Management LLC. All rights reserved.",
    "login.title": "Internal portal login",
    "login.desc": "Select your role to continue.",
    "login.cancel": "Cancel",
    "role.board": "Board Member",
    "role.fund": "Fund Manager",
    "internal.brand": "Internal Portal",
    "internal.back": "Back to website",
    "internal.selected": "Selected role",
    "internal.desc":
      "This is the internal login entry point. Next we will connect Supabase Auth and role-based access control.",
    "internal.switch": "Choose role again",
    "internal.help": "Contact us"
  }
};

const teamData: Record<Lang, Array<{ name: string; role: string }>> = {
  mn: [
    { name: "Лакшми Боожоо", role: "ТУЗ-ийн дарга" },
    { name: "Монсор Нямдаваа", role: "ТУЗ-ийн гишүүн" },
    { name: "Оймандах Жамъянсүрэн", role: "ТУЗ-ийн гишүүн" },
    { name: "Уянга Алтан-Эрдэнэ", role: "Хөрөнгө оруулалтын сангийн зөвлөх" },
    { name: "Идэрбат Ариуна", role: "Хөрөнгө оруулалтын сангийн зөвлөх" },
    { name: "НЭР Нэр", role: "Гүйцэтгэх захирал" }
  ],
  en: [
    { name: "Lakshmi Boojoo", role: "Chair" },
    { name: "Monsor Nyamdavaa", role: "Director" },
    { name: "Oimandakh Jamiyansuren", role: "Director" },
    { name: "Uyanga Altan-Erdene", role: "Fund Manager" },
    { name: "Iderbat Ariuna", role: "Fund Manager" },
    { name: "Name Name", role: "CEO" }
  ]
};

const timelineData: Record<Lang, Array<{ year: string; text: string }>> = {
  mn: [
    { year: "2011", text: "Ассет Менежментийн үйл ажиллагааны чиглэлтэйгээр үүсгэн байгуулагдав." },
    { year: "2013", text: "Хөрөнгө Оруулалтын Сангийн тухай хуулийн ажлын хэсэгт ажиллав." },
    { year: "2015", text: "Хөрөнгө Оруулалтын Менежментийн үйл ажиллагаа эрхлэх тусгай зөвшөөрлийг СЗХ-ноос авав." },
    { year: "2016", text: "Компанийн үйл ажиллагаанд ESG зарчмыг тусган нэвтрүүлж эхлэв." },
    { year: "2016", text: "Хувийн хөрөнгө оруулалтын сан: Үл Хөдлөх Хөрөнгө." },
    { year: "2018", text: "Хувийн хөрөнгө оруулалтын сан: Хувьцаат компани." }
  ],
  en: [
    { year: "2011", text: "Asset management company was established." },
    { year: "2013", text: "Co-operated as part of working group of Law on Investment Funds." },
    { year: "2015", text: "Licensed by FRC as a fund management company." },
    { year: "2016", text: "Adopted ESG values as one of the core principles of the company." },
    { year: "2016", text: "First real estate fund management." },
    { year: "2018", text: "Listed equity fund established." }
  ]
};

const marketIndexes: Array<{ name: string; value: string; change: number }> = [
  { name: "S&P 500", value: "5,218.29", change: 0.42 },
  { name: "NASDAQ", value: "16,379.46", change: -0.18 },
  { name: "DOW JONES", value: "39,812.54", change: 0.27 },
  { name: "NIKKEI 225", value: "38,721.90", change: 0.61 },
  { name: "HANG SENG", value: "17,203.15", change: -0.34 },
  { name: "TOP 20", value: "42,137.80", change: 0.95 }
];

function readLangFromQuery(): Lang | null {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "en" || lang === "mn") {
    return lang;
  }
  return null;
}

function isInternalPath() {
  return window.location.pathname === "/internal" || window.location.pathname === "/internal/";
}

function readRoleFromQuery(): Role {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  return role === "fund_manager" ? "fund_manager" : "board_member";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function App() {
  const initialInternal = useMemo(() => isInternalPath(), []);
  const initialRole = useMemo(() => readRoleFromQuery(), []);
  const initialLang = useMemo(
    () => readLangFromQuery() ?? ((localStorage.getItem("lang") as Lang | null) ?? "mn"),
    []
  );

  const [lang, setLang] = useState<Lang>(initialLang === "en" ? "en" : "mn");
  const [role] = useState<Role>(initialRole);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeAboutIndex, setActiveAboutIndex] = useState(0);

  const t = (key: string) => translations[lang][key] ?? key;
  const aboutCards = [
    { title: t("about.visionTitle"), body: t("about.visionBody") },
    { title: t("about.missionTitle"), body: t("about.missionBody") },
    { title: t("about.valuesTitle"), body: t("about.valuesBody") }
  ];

  const onToggleLang = () => {
    const next = lang === "mn" ? "en" : "mn";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const toInternal = (selectedRole: Role) => {
    window.location.href = `/internal?role=${selectedRole}&lang=${lang}`;
  };

  if (initialInternal) {
    const selectedRoleLabel = role === "fund_manager" ? t("role.fund") : t("role.board");
    return (
      <div className="app">
        <header className="site-header">
          <div className="container header-wrap">
            <a className="brand" href={`/?lang=${lang}`}>
              <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
              <div>
                <p className="brand-name">UB Asset Management</p>
                <p className="brand-sub">{t("internal.brand")}</p>
              </div>
            </a>
            <div />
            <div className="header-actions">
              <a className="btn btn-ghost" href={`/?lang=${lang}`}>
                {t("internal.back")}
              </a>
            </div>
          </div>
        </header>

        <main>
          <section className="section section-soft">
            <div className="container internal-wrap">
              <article className="internal-card">
                <p className="internal-label">{t("internal.selected")}</p>
                <h1>{selectedRoleLabel}</h1>
                <p>{t("internal.desc")}</p>
                <div className="internal-actions">
                  <a className="btn btn-accent" href={`/?lang=${lang}`}>
                    {t("internal.switch")}
                  </a>
                  <a className="btn btn-ghost" href={`/?lang=${lang}#contact`}>
                    {t("internal.help")}
                  </a>
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header" id="home">
        <div className="container header-wrap">
          <a className="brand" href="#home">
            <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
            <div>
              <p className="brand-name">UB Asset Management</p>
              <p className="brand-sub">{t("brand.sub")}</p>
            </div>
          </a>
          <div />

          <div className="header-actions">
            <button className="btn btn-ghost" type="button" onClick={onToggleLang}>
              {lang === "mn" ? "EN" : "MN"}
            </button>
            <button className="btn btn-accent" type="button" onClick={() => setLoginOpen(true)}>
              {t("auth.login")}
            </button>
          </div>
        </div>
      </header>

      <section className="market-strip" aria-label="Market indexes">
        <div className="market-track">
          {[0, 1].map((group) => (
            <div className="market-group" key={`market-${group}`}>
              {marketIndexes.map((item) => (
                <article className="market-item" key={`${group}-${item.name}`}>
                  <span className="market-name">{item.name}</span>
                  <span className="market-value">{item.value}</span>
                  <span className={`market-change ${item.change >= 0 ? "up" : "down"}`}>
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(2)}%
                  </span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="container hero-content">
            <p className="hero-kicker">{t("hero.kicker")}</p>
            <h1>
              UB
              <br />
              Asset Management
            </h1>
            <p>{t("hero.body")}</p>
          </div>
        </section>

        <section className="section" id="about">
          <div className="container">
            <div className="about-carousel">
              {aboutCards.map((card, index) => {
                const isActive = index === activeAboutIndex;
                const sideClass = !isActive && index < activeAboutIndex ? "side-left" : "side-right";
                return (
                  <button
                    key={`${card.title}-${index}`}
                    type="button"
                    className={`about-card ${isActive ? "active" : sideClass}`}
                    onClick={() => setActiveAboutIndex(index)}
                    aria-pressed={isActive}
                  >
                    <h2>{card.title}</h2>
                    <p>{card.body}</p>
                  </button>
                );
              })}
            </div>
            <div className="experience-panel">
              <h3>{t("about.glanceTitle")}</h3>
              <p>{t("about.glanceBody")}</p>
            </div>
          </div>
        </section>

        <section className="section" id="team">
          <div className="container">
            <h2 className="section-title">{t("team.title")}</h2>
            <div className="team-grid">
              {teamData[lang].map((person) => (
                <article className="member-card" key={`${person.name}-${person.role}`}>
                  <div className="member-avatar">{initials(person.name)}</div>
                  <p className="member-name">{person.name}</p>
                  <p className="member-role">{person.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-soft" id="timeline">
          <div className="container">
            <h2 className="section-title">{t("timeline.title")}</h2>
            <div className="timeline-template">
              <div className="timeline-template-inner">
                <div className="timeline-band">
                  {timelineData[lang].map((item, index) => (
                    <span className={`timeline-segment shade-${(index % 6) + 1}`} key={`${item.year}-${index}`} />
                  ))}
                </div>

                <div className="timeline-columns">
                  {timelineData[lang].map((item, index) => {
                    const isTop = index % 2 === 0;
                    return (
                      <article className="timeline-column" key={`${item.year}-${item.text}`}>
                        {isTop ? (
                          <div className="timeline-card">
                            <h3>{item.year}</h3>
                            <p>{item.text}</p>
                          </div>
                        ) : (
                          <div className="timeline-card-spacer" />
                        )}

                        <div className="timeline-mid">
                          {isTop ? (
                            <>
                              <div className="timeline-badge">{item.year}</div>
                              <div className="timeline-stick" />
                              <div className="timeline-dot" />
                            </>
                          ) : (
                            <>
                              <div className="timeline-dot" />
                              <div className="timeline-stick" />
                              <div className="timeline-badge">{item.year}</div>
                            </>
                          )}
                        </div>

                        {!isTop ? (
                          <div className="timeline-card">
                            <h3>{item.year}</h3>
                            <p>{item.text}</p>
                          </div>
                        ) : (
                          <div className="timeline-card-spacer" />
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="contact">
          <div className="container contact-grid">
            <div>
              <h2 className="section-title">{t("contact.title")}</h2>
              <p className="contact-item">{t("contact.company")}</p>
              <p className="contact-item">+976-7011-2606</p>
              <p className="contact-item">info@ubam.mn</p>
              <p className="contact-item">{t("contact.address")}</p>
            </div>
            <div>
              <iframe
                title="UBAM location"
                src="https://maps.google.com/maps?q=Park%20Place%2C%20Chinggis%20Ave%2C%20Ulaanbaatar&t=&z=13&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-wrap">
          <p>{t("footer.copy")}</p>
        </div>
      </footer>

      {loginOpen ? (
        <div className="modal" onClick={(event) => event.target === event.currentTarget && setLoginOpen(false)}>
          <div className="modal-card">
            <h3>{t("login.title")}</h3>
            <p>{t("login.desc")}</p>
            <div className="role-grid">
              <button className="role-btn" type="button" onClick={() => toInternal("board_member")}>
                {t("role.board")}
              </button>
              <button className="role-btn" type="button" onClick={() => toInternal("fund_manager")}>
                {t("role.fund")}
              </button>
            </div>
            <button className="btn btn-ghost full" type="button" onClick={() => setLoginOpen(false)}>
              {t("login.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

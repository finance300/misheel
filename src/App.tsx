import {
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import * as XLSX from "xlsx";
import AdminPanel, { type Section as AdminSection } from "./components/AdminPanel";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  type Quote,
  type FxRate,
  type ChartRange,
  type ChartSeries,
  type CryptoStat,
  fetchPrices,
  fetchQuotes,
  fetchBoMRates,
  fetchChanges,
  fetchCrypto,
  fetchSpxSeries,
  bomRatesFallback,
  isMarketConfigured
} from "./lib/market";
import {
  REPORT_GROUPS,
  type ReportGroupKey,
  type ReportRecord,
  listReports,
  reportFileUrl
} from "./lib/reports";
import {
  type ContactInfo,
  type HomeCard,
  type TeamMember,
  type TimelineEvent,
  getContact,
  listHomeCards,
  listTeamMembers,
  listTimelineEvents,
  teamPhotoUrl
} from "./lib/cms";
import { computeFund, fundCalc, fundInputs } from "./data/fund-calc";
import fundTrades from "./data/fund-trades.json";
import fundBanks from "./data/fund-banks.json";
import fundInvestorSubscriptions from "./data/fund-investor-subscriptions.json";
import fundTradeSummary from "./data/fund-trade-summary.json";

type Lang = "mn" | "en";
type Page = "home" | "about" | "funds" | "reports";
type Role = "board_member" | "fund_manager" | "general_admin";
type FundManagerTab =
  | "nav"
  | "portfolio"
  | "trades"
  | "bank"
  | "new_trades"
  | "users"
  | "reports"
  | "settings"
  | "mission"
  | "team"
  | "timeline"
  | "contact";

type InvestorSubscription = {
  no: number | null;
  lastName: string | null;
  firstName: string | null;
  registerNumber: string | null;
  phone: string | number | null;
  email: string | null;
  unitsPurchased: number | null;
  unitsReturned: number | null;
  unitsActive: number | null;
  unitValue: number | null;
  transferAmount: number | null;
  transferDate: string | null;
  calcDate: string | null;
  daysHeld: number | null;
  dailyFee: number | null;
  accruedFee: number | null;
  annualFee: number | null;
};

type BankTransaction = {
  date: string;
  openingBalance: number | null;
  debit: number | null;
  credit: number | null;
  endingBalance: number | null;
  description: string | null;
  counterpartAccount: string | number | null;
  fxRate?: number | null;
  debitMnt?: string | number | null;
  creditMnt?: string | number | null;
};

type BankAccount = {
  name: string;
  accountNumber: string;
  currency: string;
  alias: string;
  currentBalance: number | null;
  asOf: string | null;
  transactionCount: number;
  transactions: BankTransaction[];
};

type FundManagerUser = {
  id: number;
  name: string;
  email: string;
  title: string;
  status: "active" | "invited";
  lastLogin: string;
};
type ProposalAction = "add" | "reduce";
type ProposalStatus = "pending" | "approved" | "rejected";

type Proposal = {
  id: number;
  asset: string;
  action: ProposalAction;
  amount: number;
  reason: string;
  status: ProposalStatus;
  createdAt: string;
};

type TradeConfirmation = {
  id: number;
  securityType: string;
  type: string;
  currency: string;
  tradeDate: string;
  settleDate: string;
  securityName: string;
  ticker: string;
  instrumentType: string;
  portfolioClass: string;
  quantity: number;
  unitPrice: number;
  secTotal: number;
  feePerc: number;
  feeAmount: number;
  fixedFee: number;
  totalFee: number;
  total: number;
  exchangeRate: string;
  totalUsd: string;
  stockSplit: string;
  description: string;
};

type TranslationMap = Record<string, string>;

const translations: Record<Lang, TranslationMap> = {
  mn: {
    "brand.sub": "Улаанбаатар Ассет Менежмент",
    "nav.home": "Эхлэл",
    "nav.about": "Бидний тухай",
    "nav.funds": "Хөрөнгө оруулалтын сангууд",
    "nav.strategy": "Стратеги",
    "nav.team": "Баг хамт олон",
    "nav.timeline": "Түүхэн замнал",
    "nav.financials": "Тайлан журам",
    "nav.contact": "Холбоо барих",
    "about.eyebrow": "Бидний тухай",
    "about.title": "Эрхэм зорилго, үнэт зүйлс",
    "about.intro": "Биднийг хөтөлж буй алсын хараа, эрхэм зорилго, үнэт зүйлс.",
    "team.eyebrow": "Манай хүмүүс",
    "timeline.eyebrow": "Түүхэн замнал",
    "value.title": "Дэлхийн зах зээлд, мэргэжлийн түвшинд",
    "value.intro": "Бид Монголын хөрөнгө оруулагчдад олон улсын зах зээлд институцийн түвшний хүртээмжийг нээж өгдөг.",
    "value.c1.t": "Олон улсын зах зээл",
    "value.c1.d": "Хойд Америк, Европ, Азийн тэргүүлэх биржүүдэд хөрөнгө оруулна.",
    "value.c2.t": "Мэргэжлийн удирдлага",
    "value.c2.d": "Туршлагатай, мэргэжлийн баг таны хөрөнгийг удирдана.",
    "value.c3.t": "Хил хязгааргүй хүртээмж",
    "value.c3.d": "Дотоодын хөрөнгө оруулагчдад дэлхийн зах зээлд нэвтрэх боломж.",
    "value.assets": "Хөрөнгө оруулах боломж",
    "asset.global": "Олон улсын хувьцаа",
    "asset.domestic": "Дотоодын хувьцаа",
    "asset.bonds": "Бонд",
    "asset.realestate": "Үл хөдлөх хөрөнгө",
    "markets.title": "Зах зээлийн тойм",
    "markets.asia": "Азийн зах зээл",
    "markets.us": "АНУ-ын зах зээл",
    "markets.europe": "Европын зах зээл",
    "markets.fx": "Монгол банкны ханш",
    "markets.commodities": "Салбаруудын зах зээл",
    "markets.indices": "Гол индексүүд",
    "markets.fxNote": "Эх сурвалж: Монголбанк. 1 нэгж валют = ₮ (төгрөг). Заримдаа төлөөлөх утга харуулна.",
    "funds.intro": "Бид хөрөнгө оруулагчдынхаа итгэлийг даган мэргэжлийн удирдлагатай сан удирдаж байна.",
    "funds.misheel.name": "Мишээл сан",
    "funds.misheel.tag": "Хувьцаа, бонд, мөнгөн хөрөнгийн төрөлжсөн сан",
    "funds.misheel.desc": "Мишээл сан нь дотоод болон гадаадын хувьцаа, тогтмол өгөөжтэй бонд, мөнгөн хөрөнгийг хослуулсан, эрсдэлээ удирдсан, урт хугацааны өсөлтөд чиглэсэн хөрөнгө оруулалтын сан юм.",
    "funds.point1": "Олон улсын зах зээлд төрөлжсөн хөрөнгө оруулалт",
    "funds.point2": "Эрсдэлийг идэвхтэй удирдсан мэргэжлийн менежмент",
    "funds.point3": "Хөрөнгө оруулагчдад ил тод тайлагнал",
    "funds.cta": "Нэвтрэн дэлгэрэнгүй үзэх",
    "funds.committee": "Хөрөнгө оруулалтын хороо",
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
    "team.title": "Удирдлагын баг",
    "timeline.title": "Он цагийн хэлхээс",
    "investor.title": "Хөрөнгө оруулагч",
    "investor.subtitle": "Хөрөнгө оруулагчдад зориулсан веб систем",
    "contact.title": "Холбоо барих",
    "contact.company": "Улаанбаатар Ассет Менежмент ХХК",
    "contact.address":
      "Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Чингисийн өргөн чөлөө - 24, Парк Плэйс барилга, 4 давхар, 401 тоот",
    "footer.copy": "© 2026 Улаанбаатар Ассет Менежмент ХХК.",
    "login.title": "Дотоод системд нэвтрэх",
    "login.desc": "Нэвтрэх эрхээ сонгоно уу.",
    "login.cancel": "Буцах",
    "role.board": "ТУЗ Гишүүн",
    "role.fund": "Сангийн Менежер",
    "role.admin": "Ерөнхий админ",
    "role.boardDesc": "Санал хураалт, баталгаажуулалт",
    "role.fundDesc": "Багц, NAV, арилжаа удирдах",
    "role.adminDesc": "Системийн бүрэн хандалт",
    "internal.brand": "Дотоод Систем",
    "internal.back": "Нүүр сайт руу буцах",
    "internal.selected": "Сонгосон эрх",
    "internal.desc":
      "Энэ бол дотоод системийн нэвтрэх цэг. Дараагийн алхмаар Supabase Auth болон эрхийн хяналтыг холбоно.",
    "internal.switch": "Эрх дахин сонгох",
    "internal.help": "Холбоо барих",
    "internal.fmTitle": "Сангийн менежерийн самбар",
    "internal.fmSubtitle": "Позици өөрчлөлтийн санал үүсгэж, шийдвэрийн явцыг хянана.",
    "internal.fmSidebar.workspace": "Ажлын талбар",
    "internal.fmSidebar.signedAs": "Нэвтэрсэн",
    "internal.fmSidebar.signout": "Гарах",
    "internal.fmTabs.nav": "Цэвэр хөрөнгийн үнэлгээ",
    "internal.fmTabs.portfolio": "Багцын бүтэц",
    "internal.fmTabs.trades": "Арилжааны түүх",
    "internal.fmTabs.bank": "Арилжааны банк",
    "internal.fmTabs.newTrades": "Арилжаа хийх",
    "internal.trades.segActive": "Идэвхтэй",
    "internal.trades.segInactive": "Идэвхгүй",
    "internal.trades.activeStocks": "Идэвхтэй хувьцаа",
    "internal.trades.activeOptions": "Идэвхтэй опцион",
    "internal.trades.inactiveStocks": "Идэвхгүй хувьцаа",
    "internal.trades.inactiveOptions": "Идэвхгүй опцион",
    "internal.fmTabs.users": "Хэрэглэгчид",
    "internal.fmTabs.reports": "Удирдлага",
    "internal.fmTabs.settings": "Тохиргоо",
    "internal.page.nav.title": "Цэвэр хөрөнгийн үнэлгээ",
    "internal.page.nav.subtitle": "Сангийн NAV болон гол үзүүлэлтүүдийг хянана.",
    "internal.page.portfolio.title": "Портфолио бүтэц",
    "internal.page.portfolio.subtitle": "Идэвхтэй позици, бонд, бэлэн мөнгө болон валютын ханш.",
    "internal.portfolio.fxTitle": "Валютын ханш",
    "internal.portfolio.fxSub": "Цэвэр хөрөнгийн тооцоонд ашигласан ханшнууд.",
    "internal.portfolio.cashTitle": "Бэлэн мөнгө",
    "internal.portfolio.bondsTitle": "Бонд",
    "internal.portfolio.bondsSub": "Хуримтлагдсан хүүтэйгээр.",
    "internal.portfolio.equitiesTitle": "Хувьцаа & опцион",
    "internal.portfolio.equitiesSub": "Зах зээлийн үнэлгээгээр эрэмбэлэв.",
    "internal.portfolio.stocksTitle": "Хувьцаа",
    "internal.portfolio.stocksSub": "Валютаар бүлэглэв.",
    "internal.portfolio.optionsTitle": "Опцион",
    "internal.portfolio.optionsSub": "Худалдан авсан үнэт цаасны опцион.",
    "internal.portfolio.edit": "Засах",
    "internal.portfolio.bondAdd": "Бонд нэмэх",
    "internal.trades.stockAdd": "Хувьцаа нэмэх",
    "internal.trades.excelImport": "Excel оруулах",
    "internal.trades.manualEntry": "Гараар оруулах",
    "internal.trades.splitBtn": "Хуваалт",
    "internal.trades.splitModal.title": "Хувьцааны хуваалт",
    "internal.trades.splitModal.hint": "Жишээ: 10 : 1 → 1 хувьцаа 10 хувьцаа болно. Дундаж үнэ автоматаар хуваагдана.",
    "internal.trades.splitModal.new": "Шинэ",
    "internal.trades.splitModal.old": "Хуучин",
    "internal.trades.splitModal.apply": "Хэрэглэх",
    "internal.trades.addChoiceTitle": "Хувьцаа хэрхэн нэмэх вэ?",
    "internal.trades.preview.title": "Импортын урьдчилсан харагдац",
    "internal.trades.preview.found": "мөр илрэв",
    "internal.trades.preview.missing": "Дутуу багана",
    "internal.trades.preview.allFound": "Бүх шаардлагатай баганууд оллоо",
    "internal.trades.preview.confirm": "Импортлох",
    "internal.trades.preview.cancel": "Болих",
    "internal.trades.preview.sample": "Эхний 5 мөр",
    "internal.portfolio.bondModal.title": "Шинэ бонд бүртгэх",
    "internal.portfolio.bondModal.ticker": "Тикер",
    "internal.portfolio.bondModal.name": "Нэр",
    "internal.portfolio.bondModal.yield": "Жилийн хүү (%)",
    "internal.portfolio.bondModal.qty": "Тоо ширхэг",
    "internal.portfolio.bondModal.value": "Үнэлгээ (MNT)",
    "internal.portfolio.bondModal.purchaseInterest": "Худалдан авсан үед төлсөн хүү (MNT)",
    "internal.portfolio.bondModal.purchaseDate": "Худалдан авсан огноо",
    "internal.portfolio.bondModal.paymentDates": "Хүү төлөх огноонууд",
    "internal.portfolio.bondModal.addPaymentDate": "Огноо нэмэх",
    "internal.portfolio.bondModal.maturityDate": "Дуусах огноо",
    "internal.portfolio.bondModal.submit": "Хадгалах",
    "internal.portfolio.bondModal.cancel": "Болих",
    "internal.portfolio.colTicker": "Тикер",
    "internal.portfolio.colName": "Нэр",
    "internal.portfolio.colCurrency": "Валют",
    "internal.portfolio.colType": "Төрөл",
    "internal.portfolio.colQty": "Тоо ширхэг",
    "internal.portfolio.colCost": "Өртөг",
    "internal.portfolio.colYield": "Хүү",
    "internal.portfolio.colStart": "Эхэлсэн",
    "internal.portfolio.colCalc": "Тооцсон",
    "internal.portfolio.colAccrued": "Хуримтлагдсан",
    "internal.portfolio.colTotalValue": "Нийт үнэлгээ",
    "internal.portfolio.colAvgPrice": "Дундаж үнэ",
    "internal.portfolio.colPrice": "Зах зээлийн үнэ",
    "internal.portfolio.colMcap": "Mcap",
    "internal.portfolio.colMcapMnt": "Mcap (MNT)",
    "internal.portfolio.colPnL": "Хөрөнгийн зөрүү",
    "internal.portfolio.colAllocation": "Хувь",
    "internal.portfolio.colAmount": "Дүн",
    "internal.portfolio.colMntValue": "MNT-ээр",
    "internal.nav.todayLabel": "Өнөөдрийн нэгж эрхийн үнэлгээ",
    "internal.nav.statusPublished": "Нийтлэгдсэн",
    "internal.nav.statusDraft": "Батлагдаагүй",
    "internal.nav.statusRejected": "Татгалзсан",
    "internal.nav.approveBtn": "Батлах",
    "internal.nav.rejectBtn": "Татгалзах",
    "internal.nav.approveHint": "Батласны дараа өнөөдрийн NAV-г бүх хэрэглэгчид харах боломжтой болно.",
    "internal.nav.unpublishBtn": "Нийтлэлийг буцаах",
    "internal.nav.resetBtn": "Дахин харуулах",
    "internal.nav.approvedBy": "Баталсан",
    "internal.nav.rejectedBy": "Татгалзсан",
    "internal.nav.approvedAt": "Цаг",
    "internal.nav.trendTitle": "NAV-ийн хөдөлгөөн",
    "internal.nav.trendSub": "Сүүлийн арилжааны өдрүүдийн NAV-ийн өсөлт.",
    "internal.nav.breakdownTitle": "Цэвэр хөрөнгийн задаргаа",
    "internal.nav.breakdownSub": "Позици, FX ханш, өр төлбөрөөс шууд тооцов.",
    "internal.nav.brEquities": "Хувьцаа (зах зээлийн үнэлгээ)",
    "internal.nav.brOptions": "Опцион (зах зээлийн үнэлгээ)",
    "internal.nav.brBonds": "Бонд (хуримтлагдсан хүүтэй)",
    "internal.nav.brCash": "Бэлэн мөнгө",
    "internal.nav.brLiabilities": "Өр төлбөр (хуримтлагдсан шимтгэл)",
    "internal.nav.brNet": "Цэвэр хөрөнгө",
    "internal.nav.brUnits": "Эзэмшигчийн идэвхтэй нэгж эрх",
    "internal.nav.brPerUnit": "Нэгж эрхийн үнэлгээ",
    "internal.page.trades.title": "Арилжааны бүртгэл",
    "internal.page.trades.subtitle": "Худалдан авсан хувьцаа, арилжааны түүх.",
    "internal.page.bank.title": "Банкны данс",
    "internal.page.bank.subtitle": "Сангийн дансны үлдэгдэл болон гүйлгээний түүх.",
    "internal.bank.totalBalance": "Нийт үлдэгдэл (MNT)",
    "internal.bank.asOf": "Тооцсон огноо",
    "internal.bank.account": "Данс",
    "internal.bank.currency": "Валют",
    "internal.bank.balance": "Үлдэгдэл",
    "internal.bank.txnCount": "Гүйлгээ",
    "internal.bank.recentTxns": "Сүүлийн гүйлгээ",
    "internal.bank.colDate": "Огноо",
    "internal.bank.colDescription": "Утга",
    "internal.bank.colDebit": "Зарлага",
    "internal.bank.colCredit": "Орлого",
    "internal.bank.colEnd": "Үлдэгдэл",
    "internal.bank.colCounterpart": "Харьцсан данс",
    "internal.bank.colType": "Гүйлгээний төрөл",
    "internal.bank.typePlaceholder": "Сонгох",
    "internal.bank.showLegacy": "Хуучин данс харах (8863)",
    "internal.bank.legacyBadge": "Хуучин",
    "internal.bank.uploadExcel": "Excel оруулах",
    "internal.bank.type.0": "Данс хооронд",
    "internal.bank.type.1": "Харилцагч орлого",
    "internal.bank.type.2": "Харилцагч буцаалт",
    "internal.bank.type.3": "Бонд",
    "internal.bank.type.4": "Бондын хүү",
    "internal.bank.type.5": "Гадаад арилжаа",
    "internal.bank.type.6": "Дотоод арилжаа",
    "internal.bank.type.7": "USD",
    "internal.bank.type.8": "ХОМК шимтгэл",
    "internal.bank.type.9": "Брокер шимтгэл",
    "internal.bank.type.10": "Бусад шимтгэл",
    "internal.bank.type.11": "Данс хөтөлсний шимтгэл",
    "internal.bank.type.12": "Гүйлгээний шимтгэл",
    "internal.bank.summary.title": "Гүйлгээний төрлийн нэгтгэл",
    "internal.bank.summary.colCode": "Код",
    "internal.bank.summary.colLabel": "Утга",
    "internal.bank.summary.colPlus": "(+)",
    "internal.bank.summary.colMinus": "(-)",
    "internal.bank.summary.total": "Нийт",
    "internal.bank.summary.balance": "Төгрөг үлдэгдэл",
    "internal.bank.summary.pending": "Хүлээгдэж байгаа",
    "internal.page.newTrades.title": "Шинэ арилжааны санал",
    "internal.page.newTrades.subtitle": "Өнөөдөр хийх арилжааны саналыг ТУЗ-д танилцуулна.",
    "internal.page.realized.title": "Арилжааны түүх",
    "internal.page.realized.subtitle": "Бүрэн хаасан позициудын ашиг, алдагдал.",
    "internal.page.users.title": "Сангийн менежерүүд",
    "internal.page.users.subtitle": "Системд бүртгэлтэй сангийн менежерүүд.",
    "internal.page.settings.title": "Тохиргоо",
    "internal.page.settings.subtitle": "Профайл, нууц үг, өгөгдлийн эх үүсвэр.",
    "internal.stat.nav": "Сүүлд тооцсон NAV",
    "internal.stat.pending": "Хүлээгдэж буй санал",
    "internal.stat.approved": "Батлагдсан санал",
    "internal.navHistory.title": "NAV түүх",
    "internal.navHistory.date": "Огноо",
    "internal.navHistory.value": "NAV",
    "internal.navHistory.change": "Өөрчлөлт",
    "internal.realized.title": "Биелсэн ашиг, алдагдал",
    "internal.realized.total": "Нийт хүлээн авсан ашиг алдагдал",
    "internal.realized.winRate": "Ашиг & Алдагдал %",
    "internal.realized.best": "Шилдэг арилжаа",
    "internal.realized.asset": "Актив",
    "internal.realized.pnl": "P&L",
    "internal.realized.return": "Өгөөж",
    "internal.users.segWorkers": "Сангийн ажилтнууд",
    "internal.users.segInvestors": "Хөрөнгө оруулагчид",
    "internal.users.investorsTitle": "Идэвхтэй хөрөнгө оруулагчид",
    "internal.users.colInvestor": "Овог Нэр",
    "internal.users.colRegister": "Регистр",
    "internal.users.colPhone": "Утас",
    "internal.users.colUnits": "Эзэмшсэн эрх",
    "internal.users.colUnitValue": "Нэгж эрхийн үнэлгээ",
    "internal.users.colTransferAmount": "Шилжүүлсэн дүн (MNT)",
    "internal.users.colTransferDate": "Огноо",
    "internal.users.totalInvestorsLabel": "Нийт харилцагчид",
    "internal.users.totalActiveUnitsLabel": "Идэвхтэй нэгж эрх",
    "internal.users.totalReturnedUnitsLabel": "Буцаасан нэгж эрх",
    "internal.users.colReturned": "Буцаасан",
    "internal.users.colActive": "Идэвхтэй",
    "internal.users.colSubs": "Гүйлгээ",
    "internal.users.colPurchased": "Худалдан авсан",
    "internal.users.colType": "Төрөл",
    "internal.users.subsOne": "гүйлгээ",
    "internal.users.subsMany": "гүйлгээ",
    "internal.users.title": "Менежерүүдийн жагсаалт",
    "internal.users.colName": "Нэр",
    "internal.users.colEmail": "Имэйл",
    "internal.users.colTitle": "Албан тушаал",
    "internal.users.colStatus": "Төлөв",
    "internal.users.colLogin": "Сүүлд нэвтэрсэн",
    "internal.users.statusActive": "Идэвхтэй",
    "internal.users.statusInvited": "Урилгатай",
    "internal.users.invite": "Менежер урих",
    "internal.users.totalLabel": "Нийт менежер",
    "internal.users.activeLabel": "Идэвхтэй",
    "internal.users.invitedLabel": "Урилга илгээсэн",
    "internal.settings.profileTitle": "Профайл",
    "internal.settings.profileDesc": "Системд харагдах хэрэглэгчийн мэдээлэл.",
    "internal.settings.fullName": "Бүтэн нэр",
    "internal.settings.email": "Имэйл",
    "internal.settings.language": "Хэл",
    "internal.settings.save": "Хадгалах",
    "internal.settings.passwordTitle": "Нууц үг солих",
    "internal.settings.passwordDesc": "Аккаунтын аюулгүй байдлын төлөө 90 хоног тутамд солихыг зөвлөнө.",
    "internal.settings.currentPassword": "Одоогийн нууц үг",
    "internal.settings.newPassword": "Шинэ нууц үг",
    "internal.settings.confirmPassword": "Шинэ нууц үгийг давтах",
    "internal.settings.updatePassword": "Нууц үг шинэчлэх",
    "internal.settings.dataSourceTitle": "Өгөгдлийн эх үүсвэр",
    "internal.settings.dataSourceDesc": "Зах зээлийн үнэ болон арилжааны өгөгдөл доорх эх үүсвэрээс татагдана.",
    "internal.settings.provider": "Үйлчилгээ үзүүлэгч",
    "internal.settings.endpoint": "API хаяг",
    "internal.settings.apiKey": "API түлхүүр",
    "internal.settings.refresh": "Шинэчлэх давтамж",
    "internal.settings.statusLabel": "Холболтын төлөв",
    "internal.settings.statusOk": "Холбогдсон",
    "internal.trades.entryTitle": "Trade Confirmation оруулах",
    "internal.trades.tableTitle": "Trade Confirmation бүртгэл",
    "internal.trades.submit": "Арилжаа хадгалах",
    "internal.trades.export": "Excel татах",
    "internal.trades.empty": "Одоогоор trade confirmation алга.",
    "internal.form.title": "Позици өөрчлөх санал",
    "internal.form.asset": "Актив / Тикер",
    "internal.form.action": "Үйлдэл",
    "internal.form.actionAdd": "Нэмэх",
    "internal.form.actionReduce": "Хасах",
    "internal.form.amount": "Дүн (MNT)",
    "internal.form.reason": "Тайлбар",
    "internal.form.submit": "Санал илгээх",
    "internal.table.title": "Илгээсэн саналууд",
    "internal.table.asset": "Актив",
    "internal.table.action": "Үйлдэл",
    "internal.table.amount": "Дүн",
    "internal.table.status": "Төлөв",
    "internal.table.date": "Огноо",
    "internal.status.pending": "Хүлээгдэж буй",
    "internal.status.approved": "Батлагдсан",
    "internal.status.rejected": "Татгалзсан",
    "internal.empty": "Одоогоор санал алга.",
    "internal.boardTitle": "ТУЗ гишүүний хэсэг",
    "internal.boardDesc": "Дараагийн алхмаар ТУЗ-ийн санал хураалт, баталгаажуулалтын урсгалыг энд нэмнэ."
  },
  en: {
    "brand.sub": "Ulaanbaatar Asset Management",
    "nav.home": "Home",
    "nav.about": "About us",
    "nav.funds": "Investment funds",
    "nav.strategy": "Strategy",
    "nav.team": "Our Team",
    "nav.timeline": "History",
    "nav.financials": "Reports & Regulations",
    "nav.contact": "Contact",
    "about.eyebrow": "About us",
    "about.title": "Our vision, mission & values",
    "about.intro": "The vision, mission and values that guide everything we do.",
    "team.eyebrow": "Our people",
    "timeline.eyebrow": "Our journey",
    "value.title": "The world's markets, professionally managed",
    "value.intro": "We open institutional-grade access to international markets for Mongolian investors.",
    "value.c1.t": "Global markets",
    "value.c1.d": "Investing across leading exchanges in North America, Europe and Asia.",
    "value.c2.t": "Professional management",
    "value.c2.d": "An experienced, professional team manages your capital.",
    "value.c3.t": "Borderless access",
    "value.c3.d": "Direct access to global markets for domestic investors.",
    "value.assets": "Invest across",
    "asset.global": "Global stocks",
    "asset.domestic": "Domestic stocks",
    "asset.bonds": "Bonds",
    "asset.realestate": "Real estate",
    "markets.title": "Market overview",
    "markets.asia": "Asian markets",
    "markets.us": "US markets",
    "markets.europe": "European markets",
    "markets.fx": "Bank of Mongolia rates",
    "markets.commodities": "Market sectors",
    "markets.indices": "Major indices",
    "markets.fxNote": "Source: Bank of Mongolia. 1 unit of currency = ₮ (MNT). Representative values may be shown.",
    "funds.intro": "We manage professionally-run funds in line with the trust our investors place in us.",
    "funds.misheel.name": "Misheel Fund",
    "funds.misheel.tag": "Diversified equity, bond & cash fund",
    "funds.misheel.desc": "The Misheel Fund is a risk-managed, long-term growth fund combining domestic and international equities, fixed-income bonds, and cash holdings.",
    "funds.point1": "Diversified exposure across international markets",
    "funds.point2": "Active, professional risk-managed strategy",
    "funds.point3": "Transparent reporting for investors",
    "funds.cta": "Log in to view details",
    "funds.committee": "Investment committee",
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
    "footer.copy": "© 2026 Ulaanbaatar Asset Management LLC.",
    "login.title": "Internal portal login",
    "login.desc": "Select your role to continue.",
    "login.cancel": "Cancel",
    "role.board": "Board Member",
    "role.fund": "Fund Manager",
    "role.admin": "General Admin",
    "role.boardDesc": "Voting and approvals",
    "role.fundDesc": "Manage portfolio, NAV, trades",
    "role.adminDesc": "Full system access",
    "internal.brand": "Internal Portal",
    "internal.back": "Back to website",
    "internal.selected": "Selected role",
    "internal.desc":
      "This is the internal login entry point. Next we will connect Supabase Auth and role-based access control.",
    "internal.switch": "Choose role again",
    "internal.help": "Contact us",
    "internal.fmTitle": "Fund Manager Dashboard",
    "internal.fmSubtitle": "Create position change proposals and track decision progress.",
    "internal.fmSidebar.workspace": "Workspace",
    "internal.fmSidebar.signedAs": "Signed in as",
    "internal.fmSidebar.signout": "Sign out",
    "internal.fmTabs.nav": "NAV",
    "internal.fmTabs.portfolio": "Portfolio",
    "internal.fmTabs.trades": "Trade history",
    "internal.fmTabs.bank": "Bank",
    "internal.fmTabs.newTrades": "New Trades",
    "internal.trades.segActive": "Active",
    "internal.trades.segInactive": "Closed",
    "internal.trades.activeStocks": "Active stocks",
    "internal.trades.activeOptions": "Active options",
    "internal.trades.inactiveStocks": "Closed stocks",
    "internal.trades.inactiveOptions": "Closed options",
    "internal.fmTabs.users": "Users",
    "internal.fmTabs.reports": "Admin",
    "internal.fmTabs.settings": "Settings",
    "internal.page.nav.title": "Net Asset Value",
    "internal.page.nav.subtitle": "Track the fund's NAV and key performance indicators.",
    "internal.page.portfolio.title": "Portfolio Builder",
    "internal.page.portfolio.subtitle": "Active positions, bonds, cash and FX rates.",
    "internal.portfolio.fxTitle": "FX rates",
    "internal.portfolio.fxSub": "Used by the NAV calculation.",
    "internal.portfolio.cashTitle": "Cash",
    "internal.portfolio.bondsTitle": "Bonds",
    "internal.portfolio.bondsSub": "Carried with accrued interest.",
    "internal.portfolio.equitiesTitle": "Equities & options",
    "internal.portfolio.equitiesSub": "Sorted by market value.",
    "internal.portfolio.stocksTitle": "Stocks",
    "internal.portfolio.stocksSub": "Grouped by trading currency.",
    "internal.portfolio.optionsTitle": "Options",
    "internal.portfolio.optionsSub": "Equity options.",
    "internal.portfolio.edit": "Edit",
    "internal.portfolio.bondAdd": "Add bond",
    "internal.trades.stockAdd": "Add stock",
    "internal.trades.excelImport": "Import Excel",
    "internal.trades.manualEntry": "Enter manually",
    "internal.trades.splitBtn": "Split",
    "internal.trades.splitModal.title": "Stock split",
    "internal.trades.splitModal.hint": "Example: 10 : 1 → 1 share becomes 10. Average price is divided accordingly.",
    "internal.trades.splitModal.new": "New",
    "internal.trades.splitModal.old": "Old",
    "internal.trades.splitModal.apply": "Apply",
    "internal.trades.addChoiceTitle": "How would you like to add the stock?",
    "internal.trades.preview.title": "Import preview",
    "internal.trades.preview.found": "rows detected",
    "internal.trades.preview.missing": "Missing columns",
    "internal.trades.preview.allFound": "All required columns detected",
    "internal.trades.preview.confirm": "Import",
    "internal.trades.preview.cancel": "Cancel",
    "internal.trades.preview.sample": "First 5 rows",
    "internal.portfolio.bondModal.title": "Register new bond",
    "internal.portfolio.bondModal.ticker": "Ticker",
    "internal.portfolio.bondModal.name": "Name",
    "internal.portfolio.bondModal.yield": "Annual yield (%)",
    "internal.portfolio.bondModal.qty": "Quantity",
    "internal.portfolio.bondModal.value": "Value (MNT)",
    "internal.portfolio.bondModal.purchaseInterest": "Interest paid at purchase (MNT)",
    "internal.portfolio.bondModal.purchaseDate": "Purchase date",
    "internal.portfolio.bondModal.paymentDate": "Coupon payment date",
    "internal.portfolio.bondModal.maturityDate": "Maturity date",
    "internal.portfolio.bondModal.submit": "Save",
    "internal.portfolio.bondModal.cancel": "Cancel",
    "internal.portfolio.colTicker": "Ticker",
    "internal.portfolio.colName": "Name",
    "internal.portfolio.colCurrency": "Currency",
    "internal.portfolio.colType": "Type",
    "internal.portfolio.colQty": "Quantity",
    "internal.portfolio.colCost": "Cost basis",
    "internal.portfolio.colYield": "Yield",
    "internal.portfolio.colStart": "Initial date",
    "internal.portfolio.colCalc": "Calc date",
    "internal.portfolio.colAccrued": "Accrued interest",
    "internal.portfolio.colTotalValue": "Total value",
    "internal.portfolio.colAvgPrice": "Avg price",
    "internal.portfolio.colPrice": "Market price",
    "internal.portfolio.colMcap": "Mcap",
    "internal.portfolio.colMcapMnt": "Mcap (MNT)",
    "internal.portfolio.colPnL": "Unrealized P&L",
    "internal.portfolio.colAllocation": "Allocation",
    "internal.portfolio.colAmount": "Amount",
    "internal.portfolio.colMntValue": "MNT value",
    "internal.nav.todayLabel": "Today's NAV / unit",
    "internal.nav.statusPublished": "Published",
    "internal.nav.statusDraft": "Pending review",
    "internal.nav.statusRejected": "Rejected",
    "internal.nav.approveBtn": "Approve",
    "internal.nav.rejectBtn": "Reject",
    "internal.nav.approveHint": "Once approved, today's NAV will be visible to all users.",
    "internal.nav.unpublishBtn": "Unpublish",
    "internal.nav.resetBtn": "Reset",
    "internal.nav.approvedBy": "Approved by",
    "internal.nav.rejectedBy": "Rejected by",
    "internal.nav.approvedAt": "At",
    "internal.nav.trendTitle": "NAV trend",
    "internal.nav.trendSub": "NAV movement across recent trading days.",
    "internal.nav.breakdownTitle": "Net Asset breakdown",
    "internal.nav.breakdownSub": "Computed live from positions, FX rates, and liabilities.",
    "internal.nav.brEquities": "Stocks (market value)",
    "internal.nav.brOptions": "Options (market value)",
    "internal.nav.brBonds": "Bonds (with accrued interest)",
    "internal.nav.brCash": "Cash",
    "internal.nav.brLiabilities": "Liabilities (accrued management fees)",
    "internal.nav.brNet": "Net Assets",
    "internal.nav.brUnits": "Total Units Outstanding",
    "internal.nav.brPerUnit": "Unit value",
    "internal.page.trades.title": "Trade History",
    "internal.page.trades.subtitle": "Stocks the fund has bought and the trade confirmation log.",
    "internal.page.bank.title": "Bank accounts",
    "internal.page.bank.subtitle": "Account balances and transaction history.",
    "internal.bank.totalBalance": "Total balance (MNT)",
    "internal.bank.asOf": "As of",
    "internal.bank.account": "Account",
    "internal.bank.currency": "Currency",
    "internal.bank.balance": "Balance",
    "internal.bank.txnCount": "Transactions",
    "internal.bank.recentTxns": "Recent transactions",
    "internal.bank.colDate": "Date",
    "internal.bank.colDescription": "Description",
    "internal.bank.colDebit": "Debit",
    "internal.bank.colCredit": "Credit",
    "internal.bank.colEnd": "Balance",
    "internal.bank.colCounterpart": "Counterpart",
    "internal.bank.colType": "Type",
    "internal.bank.typePlaceholder": "Choose",
    "internal.bank.showLegacy": "Show legacy account (8863)",
    "internal.bank.legacyBadge": "Legacy",
    "internal.bank.uploadExcel": "Upload Excel",
    "internal.bank.type.0": "Between accounts",
    "internal.bank.type.1": "Counterparty income",
    "internal.bank.type.2": "Counterparty refund",
    "internal.bank.type.3": "Bond",
    "internal.bank.type.4": "Bond interest",
    "internal.bank.type.5": "Foreign trade",
    "internal.bank.type.6": "Domestic trade",
    "internal.bank.type.7": "USD",
    "internal.bank.type.8": "Custody fee",
    "internal.bank.type.9": "Broker fee",
    "internal.bank.type.10": "Other fee",
    "internal.bank.type.11": "Account maintenance fee",
    "internal.bank.type.12": "Transaction fee",
    "internal.bank.summary.title": "Transaction-type summary",
    "internal.bank.summary.colCode": "Code",
    "internal.bank.summary.colLabel": "Description",
    "internal.bank.summary.colPlus": "(+)",
    "internal.bank.summary.colMinus": "(-)",
    "internal.bank.summary.total": "Total",
    "internal.bank.summary.balance": "Balance",
    "internal.bank.summary.pending": "Pending",
    "internal.page.newTrades.title": "New Trade Proposals",
    "internal.page.newTrades.subtitle": "Submit trades for the day so the board can vote on them.",
    "internal.page.realized.title": "Sold Stocks' P&L",
    "internal.page.realized.subtitle": "Profit and loss from fully closed positions.",
    "internal.page.users.title": "Fund Managers",
    "internal.page.users.subtitle": "Fund managers with access to this workspace.",
    "internal.page.settings.title": "Settings",
    "internal.page.settings.subtitle": "Profile, password and market data source.",
    "internal.stat.nav": "Latest NAV",
    "internal.stat.pending": "Pending Proposals",
    "internal.stat.approved": "Approved Proposals",
    "internal.navHistory.title": "NAV History",
    "internal.navHistory.date": "Date",
    "internal.navHistory.value": "NAV",
    "internal.navHistory.change": "Change",
    "internal.realized.title": "Realized Profit & Loss",
    "internal.realized.total": "Total Realized P&L",
    "internal.realized.winRate": "P&L %",
    "internal.realized.best": "Best Trade",
    "internal.realized.asset": "Asset",
    "internal.realized.pnl": "P&L",
    "internal.realized.return": "Return",
    "internal.users.segWorkers": "Fund staff",
    "internal.users.segInvestors": "Investors",
    "internal.users.investorsTitle": "Active investors",
    "internal.users.colInvestor": "Name",
    "internal.users.colRegister": "Register",
    "internal.users.colPhone": "Phone",
    "internal.users.colUnits": "Units held",
    "internal.users.colUnitValue": "Unit price",
    "internal.users.colTransferAmount": "Transferred (MNT)",
    "internal.users.colTransferDate": "Date",
    "internal.users.totalInvestorsLabel": "Total clients",
    "internal.users.totalActiveUnitsLabel": "Active units",
    "internal.users.totalReturnedUnitsLabel": "Returned units",
    "internal.users.colReturned": "Returned",
    "internal.users.colActive": "Active",
    "internal.users.colSubs": "Subscriptions",
    "internal.users.colPurchased": "Purchased",
    "internal.users.colType": "Type",
    "internal.users.subsOne": "subscription",
    "internal.users.subsMany": "subscriptions",
    "internal.users.title": "Manager directory",
    "internal.users.colName": "Name",
    "internal.users.colEmail": "Email",
    "internal.users.colTitle": "Title",
    "internal.users.colStatus": "Status",
    "internal.users.colLogin": "Last login",
    "internal.users.statusActive": "Active",
    "internal.users.statusInvited": "Invited",
    "internal.users.invite": "Invite manager",
    "internal.users.totalLabel": "Total managers",
    "internal.users.activeLabel": "Active",
    "internal.users.invitedLabel": "Invitations sent",
    "internal.settings.profileTitle": "Profile",
    "internal.settings.profileDesc": "How you appear inside the portal.",
    "internal.settings.fullName": "Full name",
    "internal.settings.email": "Email",
    "internal.settings.language": "Language",
    "internal.settings.save": "Save changes",
    "internal.settings.passwordTitle": "Change password",
    "internal.settings.passwordDesc": "We recommend rotating your password every 90 days.",
    "internal.settings.currentPassword": "Current password",
    "internal.settings.newPassword": "New password",
    "internal.settings.confirmPassword": "Confirm new password",
    "internal.settings.updatePassword": "Update password",
    "internal.settings.dataSourceTitle": "Data source",
    "internal.settings.dataSourceDesc": "Market prices and trade data are pulled from the source below.",
    "internal.settings.provider": "Provider",
    "internal.settings.endpoint": "API endpoint",
    "internal.settings.apiKey": "API key",
    "internal.settings.refresh": "Refresh interval",
    "internal.settings.statusLabel": "Connection status",
    "internal.settings.statusOk": "Connected",
    "internal.trades.entryTitle": "Add Trade Confirmation",
    "internal.trades.tableTitle": "Trade Confirmation Records",
    "internal.trades.submit": "Save Trade",
    "internal.trades.export": "Export Excel",
    "internal.trades.empty": "No trade confirmations yet.",
    "internal.form.title": "Create Position Proposal",
    "internal.form.asset": "Asset / Ticker",
    "internal.form.action": "Action",
    "internal.form.actionAdd": "Add",
    "internal.form.actionReduce": "Reduce",
    "internal.form.amount": "Amount (MNT)",
    "internal.form.reason": "Reason",
    "internal.form.submit": "Submit Proposal",
    "internal.table.title": "Submitted Proposals",
    "internal.table.asset": "Asset",
    "internal.table.action": "Action",
    "internal.table.amount": "Amount",
    "internal.table.status": "Status",
    "internal.table.date": "Date",
    "internal.status.pending": "Pending",
    "internal.status.approved": "Approved",
    "internal.status.rejected": "Rejected",
    "internal.empty": "No proposals yet.",
    "internal.boardTitle": "Board Member Section",
    "internal.boardDesc": "Board voting and approval workflow will be added here in the next step."
  }
};

const teamData: Record<Lang, Array<{ name: string; role: string }>> = {
  mn: [
    { name: "Лакшми Боожоо", role: "ТУЗ-ийн дарга" },
    { name: "Монсор Нямдаваа", role: "Гүйцэтгэх захирал, ТУЗ-ийн гишүүн" },
    { name: "Оймандах Жамъянсүрэн", role: "ТУЗ-ийн гишүүн" },
    { name: "Уянга Алтан-Эрдэнэ", role: "Хөрөнгө оруулалтын сангийн зөвлөх" },
    { name: "Идэрбат Ариуна", role: "Хөрөнгө оруулалтын сангийн зөвлөх" }
  ],
  en: [
    { name: "Lakshmi Boojoo", role: "Chair" },
    { name: "Monsor Nyamdavaa", role: "CEO, Director" },
    { name: "Oimandakh Jamiyansuren", role: "Director" },
    { name: "Uyanga Altan-Erdene", role: "Fund Manager" },
    { name: "Iderbat Ariuna", role: "Fund Manager" }
  ]
};

// Team photos, by position (same order as teamData). Drop files into public/assets/team/.
const teamPhotos: string[] = [
  "/assets/team/lakshmi.png",
  "/assets/team/monsor.png",
  "/assets/team/oimandah.jpg",
  "/assets/team/uyanga.png",
  "/assets/team/iderbat.png"
];

function MemberAvatar({ name, photo }: { name: string; photo?: string }) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <img
        className="member-avatar member-avatar-photo"
        src={photo}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className="member-avatar">{initials(name)}</div>;
}

// Lightweight inline SVG sparkline (area + line). Stretches to its container.
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const w = 100;
  const h = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${w},${h} L0,${h} Z`;
  const color = up ? "#0a8a4a" : "#c0392b";
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const CHART_RANGES: ChartRange[] = ["1D", "1M", "3M", "1Y", "5Y", "All"];

// Representative S&P (SPY-scale) series per range — used until a live key is set
// or when a request fails, so the chart is always interactive.
function fallbackSeries(range: ChartRange): ChartSeries {
  const cfg: Record<ChartRange, [number, number]> = {
    "1D": [78, -1.22],
    "1M": [22, 2.1],
    "3M": [66, -3.4],
    "1Y": [252, 12.5],
    "5Y": [260, 70],
    All: [360, 280]
  };
  const [n, target] = cfg[range];
  const last = 743.2;
  const first = last / (1 + target / 100);
  const amp = last * 0.004;
  const points: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const base = first + (last - first) * f;
    points.push(base + amp * Math.sin(i * 0.7) + amp * 0.6 * Math.sin(i * 0.23));
  }
  points[n - 1] = last;
  const f0 = points[0];
  return {
    points,
    times: points.map(() => ""),
    last,
    changeAbs: last - f0,
    changePct: ((last - f0) / f0) * 100
  };
}

const fmtPrice = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dependency-free CSS 3D wireframe globe — the "borderless / global markets"
// hero of the market overview, replacing the featured chart.
const GLOBE_MERIDIANS = [0, 20, 40, 60, 80, 100, 120, 140, 160];
function FeaturedGlobe({ lang }: { lang: Lang }) {
  return (
    <div className="ms-card ms-globe-card">
      <div className="globe-caption">
        <span className="globe-kicker">
          {lang === "mn" ? "Дэлхийн зах зээл" : "Global markets"}
        </span>
        <span className="globe-sub">
          {lang === "mn" ? "Хил хязгааргүй хөрөнгө оруулалт" : "Borderless investing"}
        </span>
      </div>
      <div className="globe-stage">
        <div className="globe">
          {GLOBE_MERIDIANS.map((deg) => (
            <span
              key={deg}
              className="globe-ring globe-meridian"
              style={{ transform: `rotateY(${deg}deg)` }}
            />
          ))}
          <span className="globe-ring globe-equator" />
          <span className="globe-ring globe-lat globe-lat-n" />
          <span className="globe-ring globe-lat globe-lat-s" />
        </div>
      </div>
    </div>
  );
}

// Representative market-overview data (structure mirrors a market summary board;
// values are indicative until wired to a live feed).
const featuredIndex = {
  badge: "500",
  name: "S&P 500 Index",
  value: "7,383.20",
  changeAbs: "-91.20",
  changePct: -1.22,
  series: [
    7460, 7468, 7472, 7465, 7458, 7451, 7455, 7448, 7440, 7435, 7442, 7430, 7424,
    7418, 7410, 7415, 7404, 7398, 7402, 7394, 7388, 7392, 7385, 7383
  ]
};

// ---- Heatmap (squarified treemap) -----------------------------------------
type HeatItem = { label: string; weight: number; change: number; symbol?: string };
type HeatRect = { x: number; y: number; w: number; h: number; label: string; change?: number; header?: boolean };

// Squarified treemap: lays items into (0,0)-(W,H), keeping tiles near-square.
function squarifyRects(items: HeatItem[], W: number, H: number) {
  const nodes = items
    .filter((it) => it.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((it) => ({ item: it, area: 0 }));
  if (!nodes.length || W <= 0 || H <= 0) return [];
  const total = nodes.reduce((s, n) => s + n.item.weight, 0);
  const totalArea = W * H;
  nodes.forEach((n) => (n.area = (n.item.weight / total) * totalArea));

  const out: Array<{ x: number; y: number; w: number; h: number; item: HeatItem }> = [];
  let x = 0;
  let y = 0;
  let w = W;
  let h = H;
  let row: typeof nodes = [];

  const worst = (r: typeof nodes, side: number) => {
    const sum = r.reduce((a, n) => a + n.area, 0);
    const mx = Math.max(...r.map((n) => n.area));
    const mn = Math.min(...r.map((n) => n.area));
    const s2 = sum * sum;
    const side2 = side * side;
    return Math.max((side2 * mx) / s2, s2 / (side2 * mn));
  };
  const flush = (r: typeof nodes) => {
    const sum = r.reduce((a, n) => a + n.area, 0);
    if (w >= h) {
      const rw = sum / h;
      let ry = y;
      for (const n of r) {
        const rh = n.area / rw;
        out.push({ x, y: ry, w: rw, h: rh, item: n.item });
        ry += rh;
      }
      x += rw;
      w -= rw;
    } else {
      const rh = sum / w;
      let rx = x;
      for (const n of r) {
        const rw2 = n.area / rh;
        out.push({ x: rx, y, w: rw2, h: rh, item: n.item });
        rx += rw2;
      }
      y += rh;
      h -= rh;
    }
  };

  for (const n of nodes) {
    if (!row.length) {
      row.push(n);
      continue;
    }
    const side = Math.min(w, h);
    if (worst([...row, n], side) <= worst(row, side)) row.push(n);
    else {
      flush(row);
      row = [n];
    }
  }
  if (row.length) flush(row);
  return out;
}

// Treemap a flat list, returning rects in percentage space.
function flatHeat(items: HeatItem[], W: number, H: number): HeatRect[] {
  return squarifyRects(items, W, H).map((p) => ({
    x: (p.x / W) * 100,
    y: (p.y / H) * 100,
    w: (p.w / W) * 100,
    h: (p.h / H) * 100,
    label: p.item.label,
    change: p.item.change
  }));
}

// Treemap grouped categories (each gets a header strip), in percentage space.
function groupedHeat(
  groups: Array<{ name: string; items: HeatItem[] }>,
  W: number,
  H: number,
  headerH: number
): HeatRect[] {
  const cats: HeatItem[] = groups.map((g) => ({
    label: g.name,
    weight: g.items.reduce((s, i) => s + i.weight, 0),
    change: 0
  }));
  const out: HeatRect[] = [];
  for (const cr of squarifyRects(cats, W, H)) {
    const g = groups.find((gr) => gr.name === cr.item.label);
    if (!g) continue;
    out.push({ x: (cr.x / W) * 100, y: (cr.y / H) * 100, w: (cr.w / W) * 100, h: (headerH / H) * 100, label: g.name, header: true });
    const innerH = cr.h - headerH;
    if (innerH <= 4) continue;
    for (const ch of squarifyRects(g.items, cr.w, innerH)) {
      out.push({
        x: ((cr.x + ch.x) / W) * 100,
        y: ((cr.y + headerH + ch.y) / H) * 100,
        w: (ch.w / W) * 100,
        h: (ch.h / H) * 100,
        label: ch.item.label,
        change: ch.item.change
      });
    }
  }
  return out;
}

function heatColor(change: number): string {
  // Crisp red/green; magnitude adds vividness (not darkness), never grey/muddy.
  const mag = Math.min(Math.abs(change) / 3.5, 1);
  if (change >= 0) {
    const s = 44 + mag * 22; // 44%..66%
    const l = 43 - mag * 7; // 43%..36%
    return `hsl(147 ${s}% ${l}%)`;
  }
  const s = 62 + mag * 16; // 62%..78%
  const l = 49 - mag * 9; // 49%..40%
  return `hsl(3 ${s}% ${l}%)`;
}

function Heatmap({ rects, height }: { rects: HeatRect[]; height: number }) {
  return (
    <div className="heatmap" style={{ height }}>
      {rects.map((r, i) =>
        r.header ? (
          <div
            key={`h-${i}`}
            className="heat-head"
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
          >
            {r.label}
          </div>
        ) : (
          <div
            key={`t-${i}`}
            className="heat-tile"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: `${r.h}%`,
              background: heatColor(r.change ?? 0)
            }}
          >
            <span className="heat-label">{r.label}</span>
            <span className="heat-chg">
              {(r.change ?? 0) >= 0 ? "+" : ""}
              {(r.change ?? 0).toFixed(2)}%
            </span>
          </div>
        )
      )}
    </div>
  );
}

// Index heatmap (weights = rough relative prominence; symbol = Finnhub ETF proxy).
const indexHeatItems: HeatItem[] = [
  { label: "S&P 500", symbol: "SPY", weight: 100, change: -1.22 },
  { label: "Nasdaq 100", symbol: "QQQ", weight: 82, change: -0.19 },
  { label: "Japan 225", symbol: "EWJ", weight: 48, change: -3.55 },
  { label: "SSE Composite", symbol: "MCHI", weight: 42, change: 0.72 },
  { label: "DAX", symbol: "EWG", weight: 34, change: 0.62 },
  { label: "FTSE 100", symbol: "EWU", weight: 34, change: 0.72 },
  { label: "CAC 40", symbol: "EWQ", weight: 26, change: -0.25 }
];

// Stock-market heatmap, grouped by sector (representative large-caps & values).
const marketGroups: Array<{ name: string; items: HeatItem[] }> = [
  {
    name: "TECHNOLOGY",
    items: [
      { label: "AAPL", weight: 60, change: -0.8 },
      { label: "MSFT", weight: 58, change: -1.2 },
      { label: "NVDA", weight: 55, change: -0.97 },
      { label: "AVGO", weight: 30, change: -1.5 },
      { label: "ORCL", weight: 18, change: 0.6 },
      { label: "ADBE", weight: 14, change: -0.9 }
    ]
  },
  {
    name: "COMMUNICATION",
    items: [
      { label: "GOOGL", weight: 40, change: -2.1 },
      { label: "META", weight: 35, change: -2.32 },
      { label: "NFLX", weight: 16, change: 0.4 },
      { label: "DIS", weight: 10, change: -0.7 }
    ]
  },
  {
    name: "CONSUMER",
    items: [
      { label: "AMZN", weight: 45, change: -1.8 },
      { label: "TSLA", weight: 30, change: 1.14 },
      { label: "HD", weight: 14, change: 0.3 },
      { label: "MCD", weight: 12, change: -0.4 },
      { label: "NKE", weight: 9, change: -1.1 }
    ]
  },
  {
    name: "FINANCIALS",
    items: [
      { label: "JPM", weight: 35, change: 1.92 },
      { label: "BRK.B", weight: 30, change: 0.2 },
      { label: "V", weight: 28, change: 0.5 },
      { label: "MA", weight: 24, change: 0.4 },
      { label: "BAC", weight: 18, change: 0.9 }
    ]
  },
  {
    name: "HEALTHCARE",
    items: [
      { label: "LLY", weight: 35, change: 1.1 },
      { label: "UNH", weight: 25, change: -0.6 },
      { label: "JNJ", weight: 20, change: 0.3 },
      { label: "MRK", weight: 16, change: -0.4 },
      { label: "PFE", weight: 10, change: -0.8 }
    ]
  },
  {
    name: "ENERGY",
    items: [
      { label: "XOM", weight: 22, change: -1.4 },
      { label: "CVX", weight: 18, change: -1.1 },
      { label: "COP", weight: 10, change: -0.9 }
    ]
  },
  {
    name: "INDUSTRIALS",
    items: [
      { label: "CAT", weight: 16, change: 0.7 },
      { label: "GE", weight: 12, change: 0.5 },
      { label: "BA", weight: 12, change: -1.3 }
    ]
  }
];

// Representative crypto values shown until the live CoinGecko data arrives.
const cryptoFallback: CryptoStat[] = [
  {
    code: "BTC",
    nameMn: "Биткойн",
    nameEn: "Bitcoin",
    value: "$108,000",
    change: -1.4,
    series: [110, 109.2, 109.6, 108.4, 108.8, 107.9, 108.3, 107.6, 108.1, 107.4, 108]
  },
  {
    code: "ETH",
    nameMn: "Этериум",
    nameEn: "Ethereum",
    value: "$3,900",
    change: -2.1,
    series: [4.02, 3.98, 3.95, 3.97, 3.9, 3.92, 3.86, 3.9, 3.88, 3.91, 3.9]
  },
  {
    code: "SOL",
    nameMn: "Солана",
    nameEn: "Solana",
    value: "$175",
    change: -3.0,
    series: [188, 185, 186, 182, 183, 179, 181, 177, 178, 176, 175]
  }
];

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

// Localized titles for the three report groups (keys match the Supabase group_key).
const reportGroupTitles: Record<Lang, Record<ReportGroupKey, string>> = {
  mn: { tailan: "Тайлан", bodlogo: "Бодлого", juram: "Журам", udirdamj: "Удирдамж" },
  en: { tailan: "Reports", bodlogo: "Policy", juram: "Procedures", udirdamj: "Guidelines" }
};

// The two funds the company manages (shown via a dropdown on the Funds page).
type CommitteeMember = {
  nameMn: string;
  nameEn: string;
  roleMn: string;
  roleEn: string;
  photo: string;
};
type FundSection = { headingMn: string; headingEn: string; bodyMn: string[]; bodyEn: string[] };
type FundInfo = {
  id: string;
  nameMn: string;
  nameEn: string;
  tagMn?: string;
  tagEn?: string;
  sections?: FundSection[];
  comingSoon?: boolean;
  committee?: CommitteeMember[];
};
const FUNDS: FundInfo[] = [
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
      {
        nameMn: "Н. Монсор",
        nameEn: "N. Monsor",
        roleMn: "Гүйцэтгэх захирал, ТУЗ-гишүүн",
        roleEn: "CEO, Board member",
        photo: "/assets/team/monsor.png"
      },
      {
        nameMn: "А. Уянга",
        nameEn: "A. Uyanga",
        roleMn: "ХОС зөвлөх",
        roleEn: "Investment fund advisor",
        photo: "/assets/team/uyanga.png"
      },
      {
        nameMn: "А. Идэрбат",
        nameEn: "A. Iderbat",
        roleMn: "ХОС зөвлөх",
        roleEn: "Investment fund advisor",
        photo: "/assets/team/iderbat.png"
      }
    ]
  },
  {
    id: "kk",
    nameMn: "КК Рийл Истэйт Фанд",
    nameEn: "KK Real Estate Fund",
    comingSoon: true
  }
];

// Placeholder documents shown when Supabase is not yet configured / empty.
type ReportDoc = { name: string; href: string };
const reportGroups: Record<Lang, Array<{ title: string; items: ReportDoc[] }>> = {
  mn: [
    {
      title: "Үйл ажиллагааны тайлан",
      items: [
        { name: "2025 оны үйл ажиллагааны тайлан", href: "/assets/reports/2025-activity.pdf" },
        { name: "2024 оны үйл ажиллагааны тайлан", href: "/assets/reports/2024-activity.pdf" }
      ]
    },
    {
      title: "Аудитын тайлан",
      items: [
        { name: "2025 оны аудитын тайлан", href: "/assets/reports/2025-audit.pdf" },
        { name: "2024 оны аудитын тайлан", href: "/assets/reports/2024-audit.pdf" }
      ]
    },
    {
      title: "Журам",
      items: [
        { name: "Хөрөнгө оруулалтын сангийн дотоод журам", href: "/assets/reports/fund-rules.pdf" },
        { name: "Эрсдэлийн удирдлагын журам", href: "/assets/reports/risk-policy.pdf" }
      ]
    }
  ],
  en: [
    {
      title: "Operational report",
      items: [
        { name: "2025 operational report", href: "/assets/reports/2025-activity.pdf" },
        { name: "2024 operational report", href: "/assets/reports/2024-activity.pdf" }
      ]
    },
    {
      title: "Audit report",
      items: [
        { name: "2025 audit report", href: "/assets/reports/2025-audit.pdf" },
        { name: "2024 audit report", href: "/assets/reports/2024-audit.pdf" }
      ]
    },
    {
      title: "Regulations",
      items: [
        { name: "Fund internal regulations", href: "/assets/reports/fund-rules.pdf" },
        { name: "Risk management policy", href: "/assets/reports/risk-policy.pdf" }
      ]
    }
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

const initialProposals: Proposal[] = [
  {
    id: 1001,
    asset: "MSE: APU",
    action: "add",
    amount: 25000000,
    reason: "Consumer defensive allocation",
    status: "pending",
    createdAt: "2026-04-10"
  },
  {
    id: 1002,
    asset: "MSE: INV",
    action: "reduce",
    amount: 18000000,
    reason: "Rebalancing exposure",
    status: "approved",
    createdAt: "2026-04-08"
  }
];

function asStr(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "number") return v.toString();
  return String(v);
}

const initialTradeConfirmations: TradeConfirmation[] = (fundTrades as Array<Record<string, unknown>>)
  .map((row, idx) => ({
    id: idx + 1,
    securityType: asStr(row.securityType, "Stock"),
    type: asStr(row.type, "BUY"),
    currency: asStr(row.currency, "MNT"),
    tradeDate: asStr(row.tradeDate, ""),
    settleDate: asStr(row.settleDate, asStr(row.tradeDate, "")),
    securityName: asStr(row.securityName, ""),
    ticker: asStr(row.ticker, ""),
    instrumentType: asStr(row.instrumentType, "RVP"),
    portfolioClass: asStr(row.portfolioClass, "Equity"),
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unitPrice ?? 0),
    secTotal: Number(row.secTotal ?? 0),
    feePerc: Number(row.feePerc ?? 0),
    feeAmount: Number(row.feeAmount ?? 0),
    fixedFee: Number(row.fixedFee ?? 0),
    totalFee: Number(row.totalFee ?? 0),
    total: Number(row.total ?? 0),
    exchangeRate: asStr(row.exchangeRate, "-"),
    totalUsd: asStr(row.totalUsd, "-"),
    stockSplit: asStr(row.stockSplit, "-"),
    description: asStr(row.description, "-")
  }))
  .filter((t) => t.ticker && t.tradeDate)
  .sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1));

function readLangFromQuery(): Lang | null {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "en" || lang === "mn") {
    return lang;
  }
  return null;
}

// When set at build time, hide the login / internal portal and serve only the public landing page.
const PUBLIC_ONLY = import.meta.env.VITE_PUBLIC_ONLY === "true";

function isInternalPath() {
  return window.location.pathname === "/internal" || window.location.pathname === "/internal/";
}

function readRoleFromQuery(): Role {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  if (role === "fund_manager") return "fund_manager";
  if (role === "general_admin") return "general_admin";
  return "board_member";
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

function calculateSettleDate(tradeDate: string, lagDaysRaw: string) {
  const lagDays = Number(lagDaysRaw);
  if (!tradeDate || !Number.isFinite(lagDays) || lagDays < 0) {
    return tradeDate;
  }
  const base = new Date(`${tradeDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return tradeDate;
  }
  base.setDate(base.getDate() + Math.floor(lagDays));
  return base.toISOString().slice(0, 10);
}

type NavHistoryPoint = { date: string; nav: number };
type NavApproval = { date: string; at: string; by: string };

// Net Assets is recomputed live from positions/FX/liabilities — see src/data/fund-calc.ts
const todayDateString = new Date().toISOString().slice(0, 10);

// Until daily NAV history is tracked, synthesize a 7-day lead-in walking back from the live Net Assets.
const __latestNav = fundCalc.netAssets;
const navHistoryData: NavHistoryPoint[] = (() => {
  const steps = [-0.0058, -0.0021, 0.0014, -0.0009, 0.0023, 0.0017, 0.0034];
  const today = new Date();
  const lead: NavHistoryPoint[] = [];
  let v = __latestNav;
  for (let i = steps.length - 1; i >= 0; i--) {
    v = v / (1 + steps[i]);
    const d = new Date(today);
    d.setDate(today.getDate() - (steps.length - i));
    lead.unshift({ date: d.toISOString().slice(0, 10), nav: Math.round(v) });
  }
  return [...lead, { date: todayDateString, nav: Math.round(__latestNav) }];
})();

function NavChart({ data }: { data: NavHistoryPoint[] }) {
  const width = 820;
  const height = 280;
  const padding = { top: 22, right: 32, bottom: 38, left: 78 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return null;
  }

  const navValues = data.map((d) => d.nav);
  const minNav = Math.min(...navValues);
  const maxNav = Math.max(...navValues);
  const range = maxNav - minNav || Math.max(1, maxNav * 0.01);
  const yMin = minNav - range * 0.25;
  const yMax = maxNav + range * 0.25;
  const yRange = yMax - yMin;

  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + innerH - ((d.nav - yMin) / yRange) * innerH,
    date: d.date,
    nav: d.nav
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const baselineY = padding.top + innerH;
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z`;

  const yTickCount = 4;
  const yTicks = Array.from(
    { length: yTickCount + 1 },
    (_, i) => yMin + (yRange * i) / yTickCount
  );
  const formatY = (v: number) => `${(v / 1_000_000_000).toFixed(2)}B`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="fm-nav-chart" role="img" aria-label="NAV history chart">
      <defs>
        <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a10112" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#a10112" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((tv, i) => {
        const y = padding.top + innerH - ((tv - yMin) / yRange) * innerH;
        return (
          <g key={`tick-${i}`}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#ececec"
              strokeDasharray={i === 0 ? undefined : "3 4"}
            />
            <text
              x={padding.left - 10}
              y={y}
              dy="0.35em"
              textAnchor="end"
              fontSize="11"
              fill="#9a9a9a"
            >
              {formatY(tv)} MNT
            </text>
          </g>
        );
      })}

      {points.map((p, i) => (
        <text
          key={`x-${i}`}
          x={p.x}
          y={height - padding.bottom + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#9a9a9a"
        >
          {p.date.slice(5)}
        </text>
      ))}

      <path d={areaPath} fill="url(#navGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="#a10112"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={`pt-${i}`}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 5 : 3.6}
          fill="#fff"
          stroke="#a10112"
          strokeWidth="2.2"
        />
      ))}
    </svg>
  );
}

const fundManagersDirectory: FundManagerUser[] = [
  {
    id: 1,
    name: "Uyanga Altan-Erdene",
    email: "uyanga@ubam.mn",
    title: "Senior Fund Manager",
    status: "active",
    lastLogin: "2026-04-10 09:42"
  },
  {
    id: 2,
    name: "Iderbat Ariuna",
    email: "iderbat@ubam.mn",
    title: "Fund Manager",
    status: "active",
    lastLogin: "2026-04-10 08:15"
  },
  {
    id: 3,
    name: "Tuvshintur Bat-Erdene",
    email: "tuvshintur@ubam.mn",
    title: "Junior Fund Manager",
    status: "active",
    lastLogin: "2026-04-09 17:28"
  },
  {
    id: 4,
    name: "Solongo Munkhbat",
    email: "solongo@ubam.mn",
    title: "Fund Manager",
    status: "invited",
    lastLogin: "—"
  }
];

function tabIcon(id: FundManagerTab): ReactElement {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  switch (id) {
    case "nav":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15l3-4 3 3 5-7" />
        </svg>
      );
    case "trades":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M9 4v16" />
        </svg>
      );
    case "new_trades":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "users":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="9" cy="9" r="3.2" />
          <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="8" r="2.4" />
          <path d="M15.5 13.4a5 5 0 0 1 5.5 4.6" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M14 3v5h5" />
          <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case "settings":
    default:
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export default function App() {
  const initialInternal = useMemo(() => isInternalPath() && !PUBLIC_ONLY, []);
  const initialRole = useMemo(() => readRoleFromQuery(), []);
  const initialLang = useMemo(
    () => readLangFromQuery() ?? ((localStorage.getItem("lang") as Lang | null) ?? "mn"),
    []
  );

  const [lang, setLang] = useState<Lang>(initialLang === "en" ? "en" : "mn");
  const [page, setPage] = useState<Page>("home");
  // Each nav click is a real page switch, so jump back to the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const [role] = useState<Role>(initialRole);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ReportDoc | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<Quote[] | null>(null);
  useEffect(() => {
    if (!isMarketConfigured) return;
    let active = true;
    const load = () =>
      fetchQuotes()
        .then((q) => {
          if (active && q.length) setLiveQuotes(q);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);
  const tickerItems: Quote[] =
    liveQuotes ?? marketIndexes.map((m) => ({ label: m.name, value: m.value, change: m.change }));
  // Home-page Bank of Mongolia exchange rates (global indices come from the
  // embedded TradingView widgets).
  // Live market prices for the fund's US-listed equities → NAV recomputes from them.
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!initialInternal || !isMarketConfigured) return;
    const symbols = fundInputs.equities
      .filter((e) => e.currency === "USD" && e.type === "Stock" && /^[A-Z.]{1,6}$/.test(e.ticker))
      .map((e) => e.ticker);
    const load = () => fetchPrices(symbols).then(setLivePrices).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  const liveFund = computeFund(livePrices);
  const livePriceCount = Object.keys(livePrices).length;
  const [liveReports, setLiveReports] = useState<ReportRecord[] | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listReports()
      .then(setLiveReports)
      .catch(() => setLiveReports(null));
  }, []);
  // Show live documents from Supabase when available; otherwise the built-in placeholders.
  // Only real uploaded documents — no placeholders. Empty groups show an empty state.
  const [reportQuery, setReportQuery] = useState("");
  const reportNeedle = reportQuery.trim().toLowerCase();
  // Funds page: dropdown to switch between the company's funds.
  const [fundIdx, setFundIdx] = useState(0);
  const [fundMenuOpen, setFundMenuOpen] = useState(false);
  const fundPickerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!fundMenuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (fundPickerRef.current && !fundPickerRef.current.contains(event.target as Node)) {
        setFundMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [fundMenuOpen]);
  const displayReportGroups = REPORT_GROUPS.map((key) => ({
    title: reportGroupTitles[lang][key],
    items: (liveReports ?? [])
      .filter((r) => r.group_key === key)
      .filter((r) => !reportNeedle || r.title.toLowerCase().includes(reportNeedle))
      .map((r) => ({ name: r.title, href: reportFileUrl(r.file_path) }))
  }));

  // Live CMS content (overrides the built-in content when present).
  const [liveCards, setLiveCards] = useState<HomeCard[] | null>(null);
  const [liveTeam, setLiveTeam] = useState<TeamMember[] | null>(null);
  const [liveTimeline, setLiveTimeline] = useState<TimelineEvent[] | null>(null);
  const [liveContact, setLiveContact] = useState<ContactInfo | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured || initialInternal) return;
    listHomeCards().then((d) => d.length && setLiveCards(d)).catch(() => {});
    listTeamMembers().then((d) => d.length && setLiveTeam(d)).catch(() => {});
    listTimelineEvents().then((d) => d.length && setLiveTimeline(d)).catch(() => {});
    getContact().then((c) => c && setLiveContact(c)).catch(() => {});
  }, []);

  const [activeFundTab, setActiveFundTab] = useState<FundManagerTab>(
    initialRole === "general_admin" ? "mission" : "nav"
  );
  const [tradeEntryOpen, setTradeEntryOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [tradeConfirmations, setTradeConfirmations] = useState<TradeConfirmation[]>(initialTradeConfirmations);
  const tradeFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [stockAddChoiceOpen, setStockAddChoiceOpen] = useState(false);
  type ExcelPreview = {
    rows: TradeConfirmation[];
    detected: string[];
    missing: string[];
    fileName: string;
    error?: string;
  };
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
  const REQUIRED_TRADE_COLUMNS = ["Ticker", "TYPE", "Quantity", "Unit price", "Date - trade"];
  const onImportTrades = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = wb.SheetNames.find((n) => /trade/i.test(n)) ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const detected = rows.length ? Object.keys(rows[0]) : [];
        const missing = REQUIRED_TRADE_COLUMNS.filter((c) => !detected.includes(c));
        const toIsoDate = (v: unknown): string => {
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          if (typeof v === "number") {
            const d = XLSX.SSF.parse_date_code(v);
            if (d) {
              const yyyy = String(d.y).padStart(4, "0");
              const mm = String(d.m).padStart(2, "0");
              const dd = String(d.d).padStart(2, "0");
              return `${yyyy}-${mm}-${dd}`;
            }
          }
          return String(v ?? "");
        };
        const parsed: TradeConfirmation[] = [];
        rows.forEach((row, idx) => {
          const ticker = String(row["Ticker"] ?? "").trim();
          if (!ticker) return;
          parsed.push({
            id: Date.now() + idx,
            securityType: String(row["Security type"] ?? "Stock"),
            type: String(row["TYPE"] ?? "BUY"),
            currency: String(row["Currency"] ?? "MNT"),
            tradeDate: toIsoDate(row["Date - trade"]),
            settleDate: toIsoDate(row["Date - settle"] ?? row["Date - trade"]),
            securityName: String(row["Security name"] ?? ""),
            ticker,
            instrumentType: String(row["Inst. Type"] ?? "RVP"),
            portfolioClass: String(row["Portfolio class"] ?? "Equity"),
            quantity: Number(row["Quantity"] ?? 0),
            unitPrice: Number(row["Unit price"] ?? 0),
            secTotal: Number(row["SEC total"] ?? 0),
            feePerc: Number(row["Fee perc."] ?? 0),
            feeAmount: Number(row["Fee amount"] ?? 0),
            fixedFee: Number(row["Fixed fee"] ?? 0),
            totalFee: Number(row["Total fee"] ?? 0),
            total: Number(row["Total"] ?? 0),
            exchangeRate: String(row["Exchange rate"] ?? "-"),
            totalUsd: String(row["Total USD"] ?? "-"),
            stockSplit: String(row["Stock split"] ?? "-"),
            description: String(row["Description"] ?? "-")
          });
        });
        setExcelPreview({
          rows: parsed,
          detected,
          missing,
          fileName: file.name,
          error: parsed.length === 0 ? "Үнэтэй мөр олдсонгүй" : undefined
        });
      } catch (err) {
        console.error(err);
        setExcelPreview({
          rows: [],
          detected: [],
          missing: REQUIRED_TRADE_COLUMNS,
          fileName: file.name,
          error: "Файлыг уншиж чадсангүй"
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const [splitTicker, setSplitTicker] = useState<{ currency: string; ticker: string } | null>(null);
  const [splitForm, setSplitForm] = useState({ newShares: "", oldShares: "" });
  const applySplit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!splitTicker) return;
    const ns = Number(splitForm.newShares);
    const os = Number(splitForm.oldShares);
    if (!Number.isFinite(ns) || !Number.isFinite(os) || ns <= 0 || os <= 0) return;
    const factor = ns / os;
    setTradeConfirmations((current) =>
      current.map((tr) => {
        if (tr.ticker !== splitTicker.ticker || (tr.currency || "MNT") !== splitTicker.currency) return tr;
        return {
          ...tr,
          quantity: tr.quantity * factor,
          unitPrice: tr.unitPrice / factor
        };
      })
    );
    setSplitTicker(null);
    setSplitForm({ newShares: "", oldShares: "" });
  };
  const confirmExcelImport = () => {
    if (!excelPreview) return;
    setTradeConfirmations((current) => [...excelPreview.rows, ...current]);
    setImportStatus(`+${excelPreview.rows.length} мөр импортлогдсон`);
    setExcelPreview(null);
    setTimeout(() => setImportStatus(null), 4000);
  };
  const [navApproval, setNavApproval] = useState<NavApproval | null>(null);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [usersSegment, setUsersSegment] = useState<"workers" | "investors">("investors");
  const [tradesSegment, setTradesSegment] = useState<"active" | "inactive">("active");
  const [bondFormOpen, setBondFormOpen] = useState(false);
  const [activeBankAccount, setActiveBankAccount] = useState<string>("0134");
  const [bankTxnTypes, setBankTxnTypes] = useState<Record<string, string>>({});
  const [bankPending, setBankPending] = useState<Record<string, string>>({});
  const [bankImportStatus, setBankImportStatus] = useState<string | null>(null);
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);
  const onBankExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        setBankImportStatus(
          lang === "mn"
            ? `${file.name} хүлээн авлаа (${rows.length} мөр)`
            : `Received ${file.name} (${rows.length} rows)`
        );
        setTimeout(() => setBankImportStatus(null), 5000);
      } catch {
        setBankImportStatus(lang === "mn" ? "Файл уншиж чадсангүй" : "Could not read file");
        setTimeout(() => setBankImportStatus(null), 5000);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  type AddedBond = {
    ticker: string;
    name: string;
    yield: number;
    qty: number;
    value: number;
    purchaseInterest: number;
    purchaseDate: string;
    paymentDate: string;
    maturityDate: string;
  };
  const [addedBonds, setAddedBonds] = useState<AddedBond[]>([]);
  const [bondForm, setBondForm] = useState({
    ticker: "",
    name: "",
    yield: "",
    qty: "",
    value: "",
    purchaseInterest: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    paymentDate: "",
    maturityDate: ""
  });
  const onSubmitBond = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const y = Number(bondForm.yield) / 100;
    const qty = Number(bondForm.qty);
    const value = Number(bondForm.value);
    const purchaseInterest = Number(bondForm.purchaseInterest) || 0;
    if (
      !bondForm.ticker.trim() ||
      !bondForm.name.trim() ||
      !Number.isFinite(y) ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }
    setAddedBonds((prev) => [
      ...prev,
      {
        ticker: bondForm.ticker.trim(),
        name: bondForm.name.trim(),
        yield: y,
        qty,
        value,
        purchaseInterest,
        purchaseDate: bondForm.purchaseDate,
        paymentDate: bondForm.paymentDate,
        maturityDate: bondForm.maturityDate
      }
    ]);
    setBondForm({
      ticker: "",
      name: "",
      yield: "",
      qty: "",
      value: "",
      purchaseInterest: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentDate: "",
      maturityDate: ""
    });
    setBondFormOpen(false);
  };
  const toggleTicker = (key: string) => {
    setExpandedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  type TickerSummary = {
    ticker: string;
    securityName: string;
    currency: string;
    securityType: string;
    trades: TradeConfirmation[];
    buyQty: number;
    sellQty: number;
    netQty: number;
    totalCost: number;
    totalProceeds: number;
    realizedPnL: number;
    realizedPnLPct: number;
  };

  const tickerSplitMap = useMemo(() => {
    const m = new Map<string, { total: number; afterSplit: number }>();
    for (const s of fundTradeSummary as Array<{
      currency: string | null;
      ticker: string | null;
      total: number | null;
      totalAfterSplit: number | null;
    }>) {
      if (!s.ticker || s.total == null || s.totalAfterSplit == null) continue;
      m.set(`${s.currency ?? "MNT"}|${s.ticker.trim()}`, {
        total: s.total,
        afterSplit: s.totalAfterSplit
      });
    }
    return m;
  }, []);

  const tickerSummaries = useMemo<TickerSummary[]>(() => {
    const byTicker = new Map<string, TradeConfirmation[]>();
    for (const trade of tradeConfirmations) {
      const key = `${trade.currency || "MNT"}|${trade.ticker}`;
      const list = byTicker.get(key) ?? [];
      list.push(trade);
      byTicker.set(key, list);
    }
    return [...byTicker.entries()].map(([key, trades]) => {
      const sorted = [...trades].sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1));
      const buyQty = sorted.filter((t) => t.type === "BUY").reduce((s, t) => s + t.quantity, 0);
      const sellQty = sorted.filter((t) => t.type === "SELL").reduce((s, t) => s + t.quantity, 0);
      const totalCost = sorted.filter((t) => t.type === "BUY").reduce((s, t) => s + t.total, 0);
      const totalProceeds = sorted.filter((t) => t.type === "SELL").reduce((s, t) => s + t.total, 0);
      const realizedPnL = totalProceeds - totalCost;
      const realizedPnLPct = totalCost > 0 ? realizedPnL / totalCost : 0;
      const [currency, ticker] = key.split("|");
      return {
        ticker,
        securityName: sorted[0]?.securityName ?? "",
        currency,
        securityType: sorted[0]?.securityType ?? "Stock",
        trades: sorted,
        buyQty,
        sellQty,
        netQty: buyQty - sellQty,
        totalCost,
        totalProceeds,
        realizedPnL,
        realizedPnLPct
      };
    });
  }, [tradeConfirmations]);

  const groupByCurrency = (positions: TickerSummary[]) => {
    const order = ["USD", "AUD", "EUR", "CAD", "HKD", "MNT"];
    const byCurrency: Record<string, TickerSummary[]> = {};
    for (const pos of positions) {
      const cur = pos.currency || "MNT";
      (byCurrency[cur] ??= []).push(pos);
    }
    const currencies = [
      ...order.filter((c) => byCurrency[c]),
      ...Object.keys(byCurrency).filter((c) => !order.includes(c))
    ];
    return currencies.map((currency) => ({
      currency,
      tickers: byCurrency[currency].sort((a, b) => a.ticker.localeCompare(b.ticker))
    }));
  };

  const openPositionGroups = useMemo(
    () => groupByCurrency(tickerSummaries.filter((p) => p.netQty !== 0)),
    [tickerSummaries]
  );
  const closedPositionGroups = useMemo(
    () => groupByCurrency(tickerSummaries.filter((p) => p.netQty === 0 && (p.buyQty > 0 || p.sellQty > 0))),
    [tickerSummaries]
  );

  const closedPositions = useMemo(() => tickerSummaries.filter((p) => p.netQty === 0 && p.buyQty > 0), [tickerSummaries]);
  const closedPnLByCurrency = useMemo(() => {
    const byCur = new Map<string, { pnl: number; cost: number; count: number }>();
    for (const p of closedPositions) {
      const cur = p.currency || "MNT";
      const e = byCur.get(cur) ?? { pnl: 0, cost: 0, count: 0 };
      e.pnl += p.realizedPnL;
      e.cost += p.totalCost;
      e.count += 1;
      byCur.set(cur, e);
    }
    const order = ["USD", "AUD", "EUR", "CAD", "HKD", "MNT"];
    return [...byCur.entries()]
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([currency, { pnl, cost, count }]) => ({
        currency,
        pnl,
        cost,
        pnlPct: cost > 0 ? pnl / cost : 0,
        count
      }));
  }, [closedPositions]);
  const [proposalForm, setProposalForm] = useState<{
    asset: string;
    action: ProposalAction;
    amount: string;
    reason: string;
  }>({
    asset: "",
    action: "add",
    amount: "",
    reason: ""
  });
  const [tradeForm, setTradeForm] = useState<{
    securityType: string;
    type: string;
    currency: string;
    tradeDate: string;
    settlementLag: string;
    securityName: string;
    ticker: string;
    instrumentType: string;
    portfolioClass: string;
    quantity: string;
    unitPrice: string;
    feePerc: string;
    fixedFee: string;
    exchangeRate: string;
    stockSplit: string;
    description: string;
  }>({
    securityType: "Stock",
    type: "BUY",
    currency: "USD",
    tradeDate: new Date().toISOString().slice(0, 10),
    settlementLag: "1",
    securityName: "",
    ticker: "",
    instrumentType: "RVP",
    portfolioClass: "Equity",
    quantity: "",
    unitPrice: "",
    feePerc: "0.003",
    fixedFee: "0",
    exchangeRate: "1",
    stockSplit: "-",
    description: "-"
  });

  const t = (key: string) => translations[lang][key] ?? key;
  const adminIcon = (path: ReactElement) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
  const fundManagerTabs: Array<{ id: FundManagerTab; label: string; icon: ReactElement }> =
    role === "general_admin"
      ? [
          { id: "mission", label: lang === "mn" ? "Зорилго & Үнэт зүйлс" : "Mission & Values", icon: adminIcon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></>) },
          { id: "team", label: lang === "mn" ? "Менежментийн баг" : "Management team", icon: tabIcon("users") },
          { id: "timeline", label: lang === "mn" ? "Он цагийн хэлхээс" : "Timeline", icon: adminIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
          { id: "reports", label: lang === "mn" ? "Тайлан & Журам" : "Reports", icon: tabIcon("reports") },
          { id: "contact", label: lang === "mn" ? "Холбоо барих" : "Contact", icon: adminIcon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>) },
          { id: "users", label: lang === "mn" ? "Хэрэглэгчид" : "Users", icon: adminIcon(<><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" /></>) }
        ]
      : [
          { id: "nav", label: t("internal.fmTabs.nav"), icon: tabIcon("nav") },
          { id: "portfolio", label: t("internal.fmTabs.portfolio"), icon: tabIcon("portfolio") },
          { id: "trades", label: t("internal.fmTabs.trades"), icon: tabIcon("trades") },
          { id: "bank", label: t("internal.fmTabs.bank"), icon: tabIcon("bank") },
          { id: "new_trades", label: t("internal.fmTabs.newTrades"), icon: tabIcon("new_trades") },
          { id: "users", label: t("internal.fmTabs.users"), icon: tabIcon("users") },
          { id: "settings", label: t("internal.fmTabs.settings"), icon: tabIcon("settings") }
        ];
  const aboutCards = liveCards
    ? liveCards.map((c) => ({
        title: lang === "mn" ? c.title_mn : c.title_en,
        body: lang === "mn" ? c.body_mn : c.body_en
      }))
    : [
        { title: t("about.visionTitle"), body: t("about.visionBody") },
        { title: t("about.missionTitle"), body: t("about.missionBody") },
        { title: t("about.valuesTitle"), body: t("about.valuesBody") }
      ];
  // Triple the cards so a previous and next slide always exist (infinite loop).
  const aboutCount = aboutCards.length;
  const aboutLoopCards = [...aboutCards, ...aboutCards, ...aboutCards];
  const [aboutPos, setAboutPos] = useState(aboutCount);
  const [aboutAnimate, setAboutAnimate] = useState(true);
  const aboutActive = ((aboutPos % aboutCount) + aboutCount) % aboutCount;
  const aboutViewportRef = useRef<HTMLDivElement | null>(null);
  const aboutTrackRef = useRef<HTMLDivElement | null>(null);
  const [aboutViewportWidth, setAboutViewportWidth] = useState(0);
  const [aboutTrackX, setAboutTrackX] = useState(0);
  useEffect(() => {
    // The About section mounts lazily when its page opens, so re-measure on
    // page change (not just initial mount) or the cards render at zero width.
    const el = aboutViewportRef.current;
    if (!el) return;
    const update = () => setAboutViewportWidth(el.clientWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [page]);
  useEffect(() => {
    // Only auto-rotate while the About page is open; otherwise the position
    // drifts out of range and the carousel freezes when you return to it.
    if (page !== "about") return;
    // Re-center into the middle copy (in case it drifted) before rotating.
    setAboutPos((p) => aboutCount + (((p % aboutCount) + aboutCount) % aboutCount));
    const id = setInterval(() => setAboutPos((p) => p + 1), 5000);
    return () => clearInterval(id);
  }, [page, aboutCount]);
  // Card takes half the viewport so each neighbour shows half of itself on the sides.
  const aboutCardFraction = aboutViewportWidth > 0 && aboutViewportWidth < 700 ? 0.78 : 0.5;
  const aboutCardPx = aboutViewportWidth * aboutCardFraction;
  // Center the active card from its real measured position so it always lands dead-center.
  useEffect(() => {
    const viewport = aboutViewportRef.current;
    const track = aboutTrackRef.current;
    if (!viewport || !track) return;
    const active = track.children[aboutPos] as HTMLElement | undefined;
    if (!active) return;
    setAboutTrackX(viewport.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2));
  }, [aboutPos, aboutViewportWidth, aboutCardPx]);
  // After sliding into a cloned edge, jump back to the middle copy without animating.
  useEffect(() => {
    if (aboutAnimate) return;
    const id = requestAnimationFrame(() => setAboutAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [aboutAnimate]);

  const onToggleLang = () => {
    const next = lang === "mn" ? "en" : "mn";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const toInternal = (selectedRole: Role, fund?: string) => {
    const fundParam = fund ? `&fund=${fund}` : "";
    window.location.href = `/internal?role=${selectedRole}&lang=${lang}${fundParam}`;
  };
  // Funds the user can manage. Today there's just one (Misheel); the picker scales to more.
  const funds = [{ id: "misheel", name: lang === "mn" ? "Мишээл сан" : "Misheel Fund" }];
  const chooseRole = (selectedRole: Role) => {
    // The general admin manages reports, not a specific fund — skip fund selection.
    if (selectedRole === "general_admin") {
      toInternal(selectedRole);
    } else {
      setPendingRole(selectedRole);
    }
  };
  const closeLogin = () => {
    setLoginOpen(false);
    setPendingRole(null);
  };

  const [activeMilestone, setActiveMilestone] = useState(0);
  const combinedTimeline = liveTimeline
    ? liveTimeline.map((e) => ({ year: e.year, text: lang === "mn" ? e.text_mn : e.text_en }))
    : timelineData[lang];
  const teamMembers = liveTeam
    ? liveTeam.map((m) => ({
        name: lang === "mn" ? m.name_mn : m.name_en,
        role: lang === "mn" ? m.role_mn : m.role_en,
        photo: teamPhotoUrl(m.photo_path) ?? undefined
      }))
    : teamData[lang].map((p, i) => ({ name: p.name, role: p.role, photo: teamPhotos[i] as string | undefined }));
  const activeEntry = combinedTimeline[Math.min(activeMilestone, combinedTimeline.length - 1)];
  const goMilestone = (next: number) => {
    const len = combinedTimeline.length;
    setActiveMilestone(((next % len) + len) % len);
  };
  // Auto-advance the active year; loops within the timeline.
  useEffect(() => {
    const id = setInterval(() => {
      setActiveMilestone((m) => (m + 1) % combinedTimeline.length);
    }, 4500);
    return () => clearInterval(id);
  }, [combinedTimeline.length]);

  const currentSettleDate = calculateSettleDate(tradeForm.tradeDate, tradeForm.settlementLag);

  const actionLabel = (action: ProposalAction) =>
    action === "add" ? t("internal.form.actionAdd") : t("internal.form.actionReduce");

  const statusLabel = (status: ProposalStatus) => t(`internal.status.${status}`);

  const onSubmitProposal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amountNumber = Number(proposalForm.amount);
    if (!proposalForm.asset.trim() || !proposalForm.reason.trim() || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return;
    }

    const nextId = proposals.reduce((maxId, proposal) => Math.max(maxId, proposal.id), 1000) + 1;
    const today = new Date().toISOString().slice(0, 10);

    const nextProposal: Proposal = {
      id: nextId,
      asset: proposalForm.asset.trim(),
      action: proposalForm.action,
      amount: amountNumber,
      reason: proposalForm.reason.trim(),
      status: "pending",
      createdAt: today
    };

    setProposals((current) => [nextProposal, ...current]);
    setProposalForm({
      asset: "",
      action: "add",
      amount: "",
      reason: ""
    });
  };

  const onSubmitTradeConfirmation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const quantity = Number(tradeForm.quantity);
    const unitPrice = Number(tradeForm.unitPrice);
    const feePerc = Number(tradeForm.feePerc);
    const fixedFee = Number(tradeForm.fixedFee);
    const settlementLag = Number(tradeForm.settlementLag);
    const exchangeRate = Number(tradeForm.exchangeRate);

    if (
      !tradeForm.securityName.trim() ||
      !tradeForm.ticker.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0 ||
      !Number.isFinite(feePerc) ||
      feePerc < 0 ||
      !Number.isFinite(fixedFee) ||
      fixedFee < 0 ||
      !Number.isFinite(settlementLag) ||
      settlementLag < 0
    ) {
      return;
    }

    const secTotal = quantity * unitPrice;
    const feeAmount = secTotal * feePerc;
    const totalFee = feeAmount + fixedFee;
    const total = tradeForm.type === "SELL" ? secTotal - totalFee : secTotal + totalFee;
    const totalUsd = Number.isFinite(exchangeRate) && exchangeRate > 0 ? (total * exchangeRate).toFixed(6) : "-";
    const nextId = tradeConfirmations.reduce((maxId, trade) => Math.max(maxId, trade.id), 0) + 1;

    const nextTrade: TradeConfirmation = {
      id: nextId,
      securityType: tradeForm.securityType,
      type: tradeForm.type,
      currency: tradeForm.currency,
      tradeDate: tradeForm.tradeDate,
      settleDate: calculateSettleDate(tradeForm.tradeDate, tradeForm.settlementLag),
      securityName: tradeForm.securityName.trim(),
      ticker: tradeForm.ticker.trim(),
      instrumentType: tradeForm.instrumentType,
      portfolioClass: tradeForm.portfolioClass,
      quantity,
      unitPrice,
      secTotal,
      feePerc,
      feeAmount,
      fixedFee,
      totalFee,
      total,
      exchangeRate: tradeForm.exchangeRate.trim() || "-",
      totalUsd,
      stockSplit: tradeForm.stockSplit.trim() || "-",
      description: tradeForm.description.trim() || "-"
    };

    setTradeConfirmations((current) => [nextTrade, ...current]);
    setTradeForm((current) => ({
      ...current,
      securityName: "",
      ticker: "",
      quantity: "",
      unitPrice: "",
      settlementLag: "1",
      description: "-"
    }));
    setTradeEntryOpen(false);
  };

  if (initialInternal) {
    const selectedRoleLabel =
      role === "fund_manager" ? t("role.fund") : role === "general_admin" ? t("role.admin") : t("role.board");

    if (role === "fund_manager" || role === "general_admin") {
      const currentUser = fundManagersDirectory[1];
      const activeUsers = fundManagersDirectory.filter((u) => u.status === "active").length;
      const invitedUsers = fundManagersDirectory.filter((u) => u.status === "invited").length;
      const latestNav = navHistoryData[navHistoryData.length - 1];
      const formatNav = (n: number) =>
        `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MNT`;
      const fmt2 = (n: number) =>
        n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmt2Str = (s: string | null | undefined) => {
        if (s == null || s === "-" || s === "") return s ?? "—";
        const n = Number(s);
        return Number.isFinite(n) ? fmt2(n) : s;
      };
      const buildStamp = () => {
        const stamp = new Date();
        const hh = stamp.getHours().toString().padStart(2, "0");
        const mm = stamp.getMinutes().toString().padStart(2, "0");
        return `${latestNav.date} ${hh}:${mm}`;
      };
      const approveTodayNav = () => {
        setNavApproval({
          date: latestNav.date,
          at: buildStamp(),
          by: currentUser.name
        });
      };
      const isTodayApproved = navApproval?.date === latestNav.date;
      return (
        <div className="fm-app">
          <aside className="fm-sidebar" aria-label="Fund manager navigation">
            <div className="fm-sidebar-brand">
              <img src="/assets/logo.png" alt="UB Asset Management logo" />
              <div>
                <p className="fm-sidebar-brand-name">Улаанбаатар Ассет Менежмент ХХК</p>
              </div>
            </div>

            <nav className="fm-sidebar-nav">
              {fundManagerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`fm-sidebar-item ${activeFundTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveFundTab(tab.id)}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="fm-sidebar-footer">
              {role !== "general_admin" ? (
                <div className="fm-sidebar-user">
                  <div className="fm-sidebar-avatar">{initials(currentUser.name)}</div>
                  <div className="fm-sidebar-user-meta">
                    <p className="fm-sidebar-user-name">{currentUser.name}</p>
                    <p className="fm-sidebar-user-email">{currentUser.email}</p>
                  </div>
                </div>
              ) : null}
              <div className="fm-sidebar-actions">
                <button
                  type="button"
                  className="fm-sidebar-action"
                  onClick={onToggleLang}
                  aria-label="Toggle language"
                >
                  {lang === "mn" ? "EN" : "MN"}
                </button>
                <a className="fm-sidebar-action" href={`/?lang=${lang}`}>
                  {t("internal.fmSidebar.signout")}
                </a>
              </div>
            </div>
          </aside>

          <div className="fm-main">
            <header className="fm-topbar">
              <div>
                <h1 className="fm-topbar-title">
                  {fundManagerTabs.find((tab) => tab.id === activeFundTab)?.label ??
                    t("internal.fmTabs.nav")}
                </h1>
              </div>
              <div className="fm-topbar-role">
                <span className="fm-topbar-role-label">{selectedRoleLabel}</span>
              </div>
            </header>

            <main className="fm-content">
              {role === "general_admin" ? (
                <AdminPanel lang={lang} section={activeFundTab as AdminSection} />
              ) : (
                <>
              {activeFundTab === "nav" ? (
                <>
                  <div className="fm-nav-row">
                    <section className={`fm-nav-banner ${isTodayApproved ? "is-approved" : ""}`}>
                      <div className="fm-nav-banner-info">
                        <p className="fm-nav-banner-label">{t("internal.nav.todayLabel")}</p>
                        <p className="fm-nav-banner-date">{latestNav.date}</p>
                        <p className="fm-nav-banner-value">
                          {liveFund.navPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MNT
                        </p>
                        {livePriceCount > 0 ? (
                          <p className="fm-nav-banner-live">
                            <span className="status-dot" />
                            {lang === "mn"
                              ? `${livePriceCount} позиц зах зээлийн үнээр (Finnhub)`
                              : `${livePriceCount} positions priced live (Finnhub)`}
                          </p>
                        ) : null}
                      </div>
                      <div className="fm-nav-banner-actions">
                        <span className={`fm-nav-banner-pill ${isTodayApproved ? "published" : "draft"}`}>
                          <span className="status-dot" />
                          {isTodayApproved ? t("internal.nav.statusPublished") : t("internal.nav.statusDraft")}
                        </span>
                      </div>
                    </section>
                    {!isTodayApproved ? (
                      <button
                        type="button"
                        className="fm-nav-outside-btn approve"
                        onClick={approveTodayNav}
                      >
                        {t("internal.nav.approveBtn")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="fm-nav-outside-btn ghost"
                        onClick={() => setNavApproval(null)}
                      >
                        {t("internal.nav.unpublishBtn")}
                      </button>
                    )}
                  </div>

                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.nav.breakdownTitle")}</h2>
                    </header>
                    {(() => {
                      const stocksTotalMnt = liveFund.equities
                        .filter((e) => e.type !== "Option")
                        .reduce((s, e) => s + e.liveMcapMnt, 0);
                      const optionsTotalMnt = liveFund.equities
                        .filter((e) => e.type === "Option")
                        .reduce((s, e) => s + e.liveMcapMnt, 0);
                      return (
                    <ul className="fm-breakdown">
                      <li>
                        <span>{t("internal.nav.brEquities")}</span>
                        <strong>{formatNav(stocksTotalMnt)}</strong>
                      </li>
                      <li>
                        <span>{t("internal.nav.brOptions")}</span>
                        <strong>{formatNav(optionsTotalMnt)}</strong>
                      </li>
                      <li>
                        <span>{t("internal.nav.brBonds")}</span>
                        <strong>{formatNav(liveFund.totalBonds)}</strong>
                      </li>
                      <li>
                        <span>{t("internal.nav.brCash")}</span>
                        <strong>{formatNav(liveFund.totalCash)}</strong>
                      </li>
                      <li className="negative">
                        <span>{t("internal.nav.brLiabilities")}</span>
                        <strong>−{formatNav(liveFund.liabilities)}</strong>
                      </li>
                      <li className="total">
                        <span>{t("internal.nav.brNet")}</span>
                        <strong>{formatNav(liveFund.netAssets)}</strong>
                      </li>
                      <li className="subtle">
                        <span>{t("internal.nav.brUnits")}</span>
                        <strong>{liveFund.totalUnits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </li>
                      <li className="total">
                        <span>{t("internal.nav.brPerUnit")}</span>
                        <strong>
                          {liveFund.navPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MNT
                        </strong>
                      </li>
                    </ul>
                      );
                    })()}
                  </section>

                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.nav.trendTitle")}</h2>
                      <p className="fm-card-sub">{t("internal.nav.trendSub")}</p>
                    </header>
                    <div className="fm-chart-wrap">
                      <NavChart data={navHistoryData} />
                    </div>
                  </section>
                </>
              ) : null}

              {activeFundTab === "portfolio" ? (
                <>
                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.portfolio.fxTitle")}</h2>
                    </header>
                    <div className="fm-fx-grid">
                      {Object.entries(fundInputs.fxRates)
                        .filter(([cur]) => cur !== "MNT")
                        .map(([cur, rate]) => (
                        <article key={cur} className="fm-fx-card">
                          <p className="fm-fx-currency">{cur}</p>
                          <strong className="fm-fx-rate">
                            {rate.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </strong>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.portfolio.cashTitle")}</h2>
                    </header>
                    <div className="fm-table-wrap">
                      <table className="fm-table">
                        <thead>
                          <tr>
                            <th>{t("internal.portfolio.colName")}</th>
                            <th>{t("internal.portfolio.colCurrency")}</th>
                            <th style={{ textAlign: "right" }}>{t("internal.portfolio.colAmount")}</th>
                            <th style={{ textAlign: "right" }}>{t("internal.portfolio.colMntValue")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fundInputs.cash
                            .filter((c) => c.label !== "Total Cash Value")
                            .map((c) => {
                              const negative = (c.mntValue ?? 0) < 0;
                              return (
                                <tr key={c.label}>
                                  <td>{c.label}</td>
                                  <td>{c.currency}</td>
                                  <td style={{ textAlign: "right" }}>
                                    {(c.amount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                                  </td>
                                  <td
                                    style={{ textAlign: "right" }}
                                    className={negative ? "cell-down" : undefined}
                                  >
                                    {(c.mntValue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} MNT
                                  </td>
                                </tr>
                              );
                            })}
                          <tr className="fm-row-total">
                            <td colSpan={3}>{t("internal.nav.brCash")}</td>
                            <td style={{ textAlign: "right" }}>
                              {fundCalc.totalCash.toLocaleString("en-US", { maximumFractionDigits: 2 })} MNT
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {(() => {
                    const todayDate = new Date().toISOString().slice(0, 10);
                    const userBondRows = addedBonds.map((b) => {
                      const initial = new Date(b.purchaseDate).getTime();
                      const days = (new Date(todayDate).getTime() - initial) / 86_400_000;
                      const accrued = b.value * b.yield * (Math.max(0, days) / 365);
                      const total = b.value + accrued + b.purchaseInterest;
                      return {
                        ticker: b.ticker,
                        name: b.name,
                        qty: b.qty,
                        costBasis: b.value,
                        yield: b.yield,
                        initialDate: b.purchaseDate,
                        calcDate: todayDate,
                        interestAmount: accrued,
                        totalValue: total,
                        custom: true
                      };
                    });
                    const userBondsTotal = userBondRows.reduce((s, b) => s + b.totalValue, 0);
                    const liveTotalBonds = fundCalc.totalBonds + userBondsTotal;
                    const liveNetAssets = fundCalc.netAssets + userBondsTotal;
                    return (
                      <section className="fm-card">
                        <header className="fm-card-head">
                          <h2>{t("internal.portfolio.bondsTitle")}</h2>
                        </header>
                        <div className="fm-table-wrap">
                          <table className="fm-table">
                            <thead>
                              <tr>
                                <th>{t("internal.portfolio.colTicker")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colQty")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colCost")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colYield")}</th>
                                <th>{t("internal.portfolio.colStart")}</th>
                                <th>{t("internal.portfolio.colCalc")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colAccrued")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colTotalValue")}</th>
                                <th style={{ textAlign: "right" }}>{t("internal.portfolio.colAllocation")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fundInputs.bonds.map((b) => {
                                const allocation = liveNetAssets > 0 ? (b.totalValue ?? 0) / liveNetAssets : 0;
                                return (
                                  <tr key={b.ticker}>
                                    <td>{b.ticker}</td>
                                    <td style={{ textAlign: "right" }}>
                                      {(b.qty ?? 0).toLocaleString("en-US")}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      {(b.costBasis ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      {((b.yield ?? 0) * 100).toFixed(2)}%
                                    </td>
                                    <td>{b.initialDate ?? "—"}</td>
                                    <td>{b.calcDate ?? "—"}</td>
                                    <td style={{ textAlign: "right" }}>
                                      {(b.interestAmount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <strong>
                                        {(b.totalValue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                      </strong>
                                    </td>
                                    <td style={{ textAlign: "right" }}>{(allocation * 100).toFixed(2)}%</td>
                                  </tr>
                                );
                              })}
                              {userBondRows.map((b, i) => {
                                const allocation = liveNetAssets > 0 ? b.totalValue / liveNetAssets : 0;
                                return (
                                  <tr key={`added-${i}-${b.ticker}`} className="fm-row-added">
                                    <td>
                                      <strong>{b.ticker}</strong>
                                      <br />
                                      <span className="fm-row-added-name">{b.name}</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>{b.qty.toLocaleString("en-US")}</td>
                                    <td style={{ textAlign: "right" }}>
                                      {b.costBasis.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: "right" }}>{(b.yield * 100).toFixed(2)}%</td>
                                    <td>{b.initialDate}</td>
                                    <td>{b.calcDate}</td>
                                    <td style={{ textAlign: "right" }}>
                                      {b.interestAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <strong>{b.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
                                    </td>
                                    <td style={{ textAlign: "right" }}>{(allocation * 100).toFixed(2)}%</td>
                                  </tr>
                                );
                              })}
                              <tr className="fm-row-total">
                                <td colSpan={7}>{t("internal.nav.brBonds")}</td>
                                <td style={{ textAlign: "right" }}>
                                  {liveTotalBonds.toLocaleString("en-US", { maximumFractionDigits: 0 })} MNT
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {((liveTotalBonds / liveNetAssets) * 100).toFixed(2)}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })()}

                  {(() => {
                    const stocks = fundInputs.equities.filter((e) => e.type !== "Option");
                    const options = fundInputs.equities.filter((e) => e.type === "Option");
                    const currencyOrder = ["USD", "AUD", "EUR", "CAD", "HKD", "MNT"];
                    const stocksByCurrency = new Map<string, typeof stocks>();
                    for (const s of stocks) {
                      const cur = s.currency || "MNT";
                      const list = stocksByCurrency.get(cur) ?? [];
                      list.push(s);
                      stocksByCurrency.set(cur, list);
                    }
                    const orderedStockCurrencies = [
                      ...currencyOrder.filter((c) => stocksByCurrency.has(c)),
                      ...[...stocksByCurrency.keys()].filter((c) => !currencyOrder.includes(c))
                    ];

                    const renderEquityRow = (e: typeof stocks[number]) => {
                      const pnl = e.unrealizedPnL ?? 0;
                      const pnlPct = e.unrealizedPnLPct ?? 0;
                      const positive = pnl >= 0;
                      return (
                        <tr key={e.ticker}>
                          <td>
                            <strong>{e.ticker}</strong>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {(e.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {(e.avgPrice ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {(e.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {(e.mcap ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <strong>
                              {(e.mcapMnt ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </strong>
                          </td>
                          <td
                            style={{ textAlign: "right" }}
                            className={positive ? "cell-up" : "cell-down"}
                          >
                            {positive ? "+" : ""}
                            {pnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                            <br />
                            <span style={{ fontSize: "0.74rem", opacity: 0.85 }}>
                              ({positive ? "+" : ""}
                              {(pnlPct * 100).toFixed(2)}%)
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button type="button" className="fm-row-edit-btn" aria-label={t("internal.portfolio.edit")}>
                              {t("internal.portfolio.edit")}
                            </button>
                          </td>
                        </tr>
                      );
                    };

                    return (
                      <>
                        <section className="fm-card">
                          <header className="fm-card-head">
                            <h2>{t("internal.portfolio.stocksTitle")}</h2>
                          </header>
                          <div className="fm-trade-groups">
                            {orderedStockCurrencies.map((currency) => {
                              const list = stocksByCurrency.get(currency) ?? [];
                              const sorted = [...list].sort((a, b) => (b.mcapMnt ?? 0) - (a.mcapMnt ?? 0));
                              const groupTotalMnt = sorted.reduce((s, e) => s + (e.mcapMnt ?? 0), 0);
                              return (
                                <section className="fm-currency-group" key={currency}>
                                  <header className="fm-currency-header">
                                    <h3>{currency}</h3>
                                    <span>{sorted.length} {sorted.length === 1 ? "stock" : "stocks"}</span>
                                  </header>
                                  <div className="fm-table-wrap">
                                    <table className="fm-table">
                                      <thead>
                                        <tr>
                                          <th>{t("internal.portfolio.colTicker")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colQty")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colAvgPrice")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colPrice")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colMcap")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colMcapMnt")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.colPnL")}</th>
                                          <th style={{ textAlign: "right" }}>{t("internal.portfolio.edit")}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sorted.map(renderEquityRow)}
                                        <tr className="fm-row-total">
                                          <td colSpan={5}>{currency} subtotal</td>
                                          <td style={{ textAlign: "right" }}>
                                            {groupTotalMnt.toLocaleString("en-US", { maximumFractionDigits: 0 })} MNT
                                          </td>
                                          <td />
                                          <td />
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </section>
                              );
                            })}
                          </div>
                        </section>

                        {options.length ? (
                          <section className="fm-card">
                            <header className="fm-card-head">
                              <h2>{t("internal.portfolio.optionsTitle")}</h2>
                            </header>
                            <div className="fm-table-wrap">
                              <table className="fm-table">
                                <thead>
                                  <tr>
                                    <th>{t("internal.portfolio.colTicker")}</th>
                                    <th>{t("internal.portfolio.colCurrency")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colQty")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colAvgPrice")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colPrice")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colMcap")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colMcapMnt")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.colPnL")}</th>
                                    <th style={{ textAlign: "right" }}>{t("internal.portfolio.edit")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...options]
                                    .sort((a, b) => (b.mcapMnt ?? 0) - (a.mcapMnt ?? 0))
                                    .map((e) => {
                                      const pnl = e.unrealizedPnL ?? 0;
                                      const pnlPct = e.unrealizedPnLPct ?? 0;
                                      const positive = pnl >= 0;
                                      return (
                                        <tr key={e.ticker}>
                                          <td>
                                            <strong>{e.ticker}</strong>
                                          </td>
                                          <td>{e.currency}</td>
                                          <td style={{ textAlign: "right" }}>
                                            {(e.qty ?? 0).toLocaleString("en-US")}
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            {(e.avgPrice ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            {(e.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            {(e.mcap ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            <strong>
                                              {(e.mcapMnt ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                            </strong>
                                          </td>
                                          <td
                                            style={{ textAlign: "right" }}
                                            className={positive ? "cell-up" : "cell-down"}
                                          >
                                            {positive ? "+" : ""}
                                            {pnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                                            <br />
                                            <span style={{ fontSize: "0.74rem", opacity: 0.85 }}>
                                              ({positive ? "+" : ""}
                                              {(pnlPct * 100).toFixed(2)}%)
                                            </span>
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            <button
                                              type="button"
                                              className="fm-row-edit-btn"
                                              aria-label={t("internal.portfolio.edit")}
                                            >
                                              {t("internal.portfolio.edit")}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  {(() => {
                                    const optionsTotalMnt = options.reduce(
                                      (s, e) => s + (e.mcapMnt ?? 0),
                                      0
                                    );
                                    return (
                                      <tr className="fm-row-total">
                                        <td colSpan={6}>{t("internal.portfolio.optionsTitle")} subtotal</td>
                                        <td style={{ textAlign: "right" }}>
                                          {optionsTotalMnt.toLocaleString("en-US", { maximumFractionDigits: 0 })} MNT
                                        </td>
                                        <td />
                                        <td />
                                      </tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        ) : null}
                      </>
                    );
                  })()}
                </>
              ) : null}

              {activeFundTab === "trades" ? (
                <div className="fm-trades-layout">
                  <div className="fm-trade-actions">
                    <input
                      ref={tradeFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onImportTrades(file);
                        if (tradeFileInputRef.current) tradeFileInputRef.current.value = "";
                      }}
                    />
                    {importStatus ? (
                      <span className="fm-import-status">{importStatus}</span>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => setStockAddChoiceOpen(true)}
                    >
                      + {t("internal.trades.stockAdd")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => setBondFormOpen(true)}
                    >
                      + {t("internal.portfolio.bondAdd")}
                    </button>
                  </div>
                  {tradeEntryOpen ? (
                    <div
                      className="modal"
                      onClick={(event) =>
                        event.target === event.currentTarget && setTradeEntryOpen(false)
                      }
                    >
                      <div className="modal-card fm-trade-modal">
                        <h3>{t("internal.trades.entryTitle")}</h3>
                        <form onSubmit={onSubmitTradeConfirmation}>
                          <div className="fm-field-grid">
                                  <label className="fm-field">
                                    <span>Security type</span>
                                    <select
                                      value={tradeForm.securityType}
                                      onChange={(event) => {
                                        const next = event.target.value;
                                        setTradeForm((current) => ({
                                          ...current,
                                          securityType: next,
                                          portfolioClass: next === "Option" ? "Option" : "Equity"
                                        }));
                                      }}
                                    >
                                      <option value="Stock">Stock</option>
                                      <option value="Option">Option</option>
                                    </select>
                                  </label>

                                  <label className="fm-field">
                                    <span>TYPE</span>
                                    <select
                                      value={tradeForm.type}
                                      onChange={(event) => setTradeForm((current) => ({ ...current, type: event.target.value }))}
                                    >
                                      <option value="BUY">BUY</option>
                                      <option value="SELL">SELL</option>
                                    </select>
                                  </label>

                                  <label className="fm-field">
                                    <span>Currency</span>
                                    <select
                                      value={tradeForm.currency}
                                      onChange={(event) => setTradeForm((current) => ({ ...current, currency: event.target.value }))}
                                    >
                                      {Object.keys(fundInputs.fxRates).map((cur) => (
                                        <option key={cur} value={cur}>{cur}</option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="fm-field">
                                    <span>Date - trade</span>
                                    <input
                                      type="date"
                                      value={tradeForm.tradeDate}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, tradeDate: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Date - settle</span>
                                    <input type="date" value={currentSettleDate} readOnly />
                                  </label>


                                  <label className="fm-field">
                                    <span>Security name</span>
                                    <input
                                      value={tradeForm.securityName}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, securityName: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Ticker</span>
                                    <input
                                      value={tradeForm.ticker}
                                      onChange={(event) => setTradeForm((current) => ({ ...current, ticker: event.target.value }))}
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Inst. Type</span>
                                    <input
                                      value={tradeForm.instrumentType}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, instrumentType: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>


                                  <label className="fm-field">
                                    <span>Quantity</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={tradeForm.quantity}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, quantity: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Unit price</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={tradeForm.unitPrice}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, unitPrice: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Fee perc.</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.000001"
                                      value={tradeForm.feePerc}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, feePerc: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Fixed fee</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={tradeForm.fixedFee}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, fixedFee: event.target.value }))
                                      }
                                      required
                                    />
                                  </label>

                                  <label className="fm-field">
                                    <span>Exchange rate</span>
                                    <input
                                      value={tradeForm.exchangeRate}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, exchangeRate: event.target.value }))
                                      }
                                    />
                                  </label>


                          </div>

                          <div className="fm-card-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setTradeEntryOpen(false)}
                            >
                              {t("internal.trades.preview.cancel")}
                            </button>
                            <button className="btn btn-accent" type="submit">
                              {t("internal.trades.submit")}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : null}

                          <div className="fm-segment">
                            <button
                              type="button"
                              className={`fm-segment-btn ${tradesSegment === "active" ? "active" : ""}`}
                              onClick={() => setTradesSegment("active")}
                            >
                              {t("internal.trades.segActive")}
                              <span className="fm-segment-count">
                                {openPositionGroups.reduce((s, g) => s + g.tickers.length, 0)}
                              </span>
                            </button>
                            <button
                              type="button"
                              className={`fm-segment-btn ${tradesSegment === "inactive" ? "active" : ""}`}
                              onClick={() => setTradesSegment("inactive")}
                            >
                              {t("internal.trades.segInactive")}
                              <span className="fm-segment-count">{closedPositions.length}</span>
                            </button>
                          </div>

                          {tradesSegment === "inactive" ? (
                            <div className="fm-stats fm-stats-pnl">
                              {closedPnLByCurrency.map(({ currency, pnl, count }) => {
                                const positive = pnl >= 0;
                                return (
                                  <article className="fm-stat-card" key={currency}>
                                    <p>
                                      {currency}{" "}
                                      <span className="fm-stat-sub">
                                        · {count} {count === 1 ? "stock" : "stocks"}
                                      </span>
                                    </p>
                                    <strong className={positive ? "cell-up" : "cell-down"}>
                                      {positive ? "+" : ""}
                                      {pnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                                      <span className="fm-stat-cur">{currency}</span>
                                    </strong>
                                  </article>
                                );
                              })}
                            </div>
                          ) : null}

                          <section className="fm-card">
                            {tradesSegment === "active" ? (
                              openPositionGroups.length ? (
                              <div className="fm-trade-groups">
                                {openPositionGroups.map(({ currency, tickers }) => (
                                  <section className="fm-currency-group" key={currency}>
                                    <header className="fm-currency-header">
                                      <h3>{currency}</h3>
                                      <span>{tickers.length} {tickers.length === 1 ? "stock" : "stocks"}</span>
                                    </header>
                                    <div className="fm-ticker-list">
                                      {tickers.map(({ ticker, trades, netQty, securityName }) => {
                                        const key = `${currency}:${ticker}`;
                                        const open = expandedTickers.has(key);
                                        const splitInfo = tickerSplitMap.get(`${currency}|${ticker}`);
                                        const hasSplit =
                                          splitInfo != null &&
                                          Math.abs(splitInfo.total - splitInfo.afterSplit) > 0.001;
                                        const displayShares = hasSplit ? splitInfo!.afterSplit : netQty;
                                        return (
                                          <div key={ticker} className={`fm-ticker-card ${open ? "open" : ""}`}>
                                            <div className="fm-ticker-row">
                                              <button
                                                type="button"
                                                className="fm-ticker-toggle"
                                                onClick={() => toggleTicker(key)}
                                                aria-expanded={open}
                                              >
                                                <span className="fm-ticker-arrow" aria-hidden="true">
                                                  ▸
                                                </span>
                                                <span className="fm-ticker-symbol">{ticker}</span>
                                                <span className="fm-ticker-name">{securityName}</span>
                                                <span className="fm-ticker-net">
                                                  {displayShares.toLocaleString("en-US", {
                                                    maximumFractionDigits: 4
                                                  })}{" "}
                                                  shares
                                                  {hasSplit ? (
                                                    <span className="fm-ticker-split">
                                                      {" "}
                                                      (was {splitInfo!.total.toLocaleString("en-US")} pre-split)
                                                    </span>
                                                  ) : null}
                                                </span>
                                                <span className="fm-ticker-count">
                                                  {trades.length} {trades.length === 1 ? "trade" : "trades"}
                                                </span>
                                              </button>
                                              <button
                                                type="button"
                                                className="fm-ticker-split-btn"
                                                onClick={() => {
                                                  setSplitTicker({ currency, ticker });
                                                  setSplitForm({ newShares: "", oldShares: "" });
                                                }}
                                                title={t("internal.trades.splitModal.title")}
                                              >
                                                ⇄ {t("internal.trades.splitBtn")}
                                              </button>
                                            </div>
                                            {open ? (
                                              <div className="fm-ticker-detail">
                                                <div className="fm-table-wrap">
                                                  <table className="fm-table fm-trade-detail-table">
                                                    <thead>
                                                      <tr>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Shares</th>
                                                        <th>@ Price</th>
                                                        <th>SEC value</th>
                                                        <th>Total fees</th>
                                                        <th>Total</th>
                                                        <th>FX</th>
                                                        <th>Total USD</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {trades.map((tr) => (
                                                        <tr key={tr.id}>
                                                          <td>{tr.tradeDate}</td>
                                                          <td>
                                                            <span className={`trade-type ${tr.type.toLowerCase()}`}>
                                                              {tr.type}
                                                            </span>
                                                          </td>
                                                          <td>{fmt2(tr.quantity)}</td>
                                                          <td>{fmt2(tr.unitPrice)}</td>
                                                          <td>{fmt2(tr.secTotal)}</td>
                                                          <td>{fmt2(tr.totalFee)}</td>
                                                          <td>{fmt2(tr.total)}</td>
                                                          <td>{fmt2Str(tr.exchangeRate)}</td>
                                                          <td>{fmt2Str(tr.totalUsd)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </section>
                                ))}
                              </div>
                            ) : (
                              <p className="fm-empty">{t("internal.trades.empty")}</p>
                            )
                            ) : closedPositionGroups.length ? (
                              <div className="fm-trade-groups">
                                {closedPositionGroups.map(({ currency, tickers }) => (
                                  <section className="fm-currency-group" key={currency}>
                                    <header className="fm-currency-header">
                                      <h3>{currency}</h3>
                                      <span>
                                        {tickers.length} {tickers.length === 1 ? "stock" : "stocks"}
                                      </span>
                                    </header>
                                    <div className="fm-ticker-list">
                                      {tickers.map((pos) => {
                                        const key = `closed:${currency}:${pos.ticker}`;
                                        const open = expandedTickers.has(key);
                                        const positive = pos.realizedPnL >= 0;
                                        return (
                                          <div key={pos.ticker} className={`fm-ticker-card ${open ? "open" : ""}`}>
                                            <button
                                              type="button"
                                              className="fm-ticker-toggle fm-ticker-toggle-pnl"
                                              onClick={() => toggleTicker(key)}
                                              aria-expanded={open}
                                            >
                                              <span className="fm-ticker-arrow" aria-hidden="true">▸</span>
                                              <span className="fm-ticker-symbol">{pos.ticker}</span>
                                              <span className="fm-ticker-name">{pos.securityName}</span>
                                              <span className="fm-ticker-count">
                                                {pos.buyQty.toLocaleString("en-US")} shares
                                              </span>
                                              <span className={positive ? "fm-ticker-pnl up" : "fm-ticker-pnl down"}>
                                                {positive ? "+" : ""}
                                                {pos.realizedPnL.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                                                {pos.currency}
                                              </span>
                                              <span className={positive ? "fm-ticker-pnl-pct up" : "fm-ticker-pnl-pct down"}>
                                                {positive ? "+" : ""}
                                                {(pos.realizedPnLPct * 100).toFixed(2)}%
                                              </span>
                                            </button>
                                            {open ? (
                                              <div className="fm-ticker-detail">
                                                <div className="fm-position-summary">
                                                  <div>
                                                    <p>Total cost</p>
                                                    <strong>
                                                      {pos.totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                                                      {pos.currency}
                                                    </strong>
                                                  </div>
                                                  <div>
                                                    <p>Total proceeds</p>
                                                    <strong>
                                                      {pos.totalProceeds.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                                                      {pos.currency}
                                                    </strong>
                                                  </div>
                                                  <div>
                                                    <p>Realized P&amp;L</p>
                                                    <strong className={positive ? "cell-up" : "cell-down"}>
                                                      {positive ? "+" : ""}
                                                      {pos.realizedPnL.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                                                      {pos.currency}
                                                    </strong>
                                                  </div>
                                                </div>
                                                <div className="fm-table-wrap">
                                                  <table className="fm-table fm-trade-detail-table">
                                                    <thead>
                                                      <tr>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Shares</th>
                                                        <th>@ Price</th>
                                                        <th>SEC value</th>
                                                        <th>Total fees</th>
                                                        <th>Total</th>
                                                        <th>FX</th>
                                                        <th>Total USD</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {pos.trades.map((tr) => (
                                                        <tr key={tr.id}>
                                                          <td>{tr.tradeDate}</td>
                                                          <td>
                                                            <span className={`trade-type ${tr.type.toLowerCase()}`}>
                                                              {tr.type}
                                                            </span>
                                                          </td>
                                                          <td>{fmt2(tr.quantity)}</td>
                                                          <td>{fmt2(tr.unitPrice)}</td>
                                                          <td>{fmt2(tr.secTotal)}</td>
                                                          <td>{fmt2(tr.totalFee)}</td>
                                                          <td>{fmt2(tr.total)}</td>
                                                          <td>{fmt2Str(tr.exchangeRate)}</td>
                                                          <td>{fmt2Str(tr.totalUsd)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </section>
                                ))}
                              </div>
                            ) : (
                              <p className="fm-empty">No closed positions yet.</p>
                            )}
                          </section>
                        </div>
                      ) : null}

              {activeFundTab === "bank" ? (
                <>
                  {(() => {
                    const allBanks = fundBanks as BankAccount[];
                    const LEGACY_ACCOUNT = "8863";
                    const activeBank =
                      allBanks.find((b) => b.accountNumber === activeBankAccount) ?? allBanks[0];
                    const typeOptions: Array<{ value: string; label: string }> = Array.from(
                      { length: 13 },
                      (_, i) => ({ value: String(i), label: t(`internal.bank.type.${i}`) })
                    );
                    return (
                      <>
                        <div className="fm-bank-toggle">
                          <label className="fm-field fm-bank-select-field">
                            <span>{t("internal.bank.account")}</span>
                            <select
                              value={activeBank?.accountNumber ?? ""}
                              onChange={(event) => setActiveBankAccount(event.target.value)}
                            >
                              {allBanks.map((bank) => {
                                const isLegacy = bank.accountNumber === LEGACY_ACCOUNT;
                                return (
                                  <option key={bank.accountNumber} value={bank.accountNumber}>
                                    {bank.alias} · {bank.accountNumber} · {bank.currency}
                                    {isLegacy ? ` (${t("internal.bank.legacyBadge")})` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          {activeBank?.accountNumber === LEGACY_ACCOUNT ? (
                            <span className="fm-bank-legacy-badge fm-bank-legacy-badge-inline">
                              {t("internal.bank.legacyBadge")}
                            </span>
                          ) : null}
                        </div>

                        {activeBank ? (() => {
                          const bank = activeBank;
                          const txns = [...bank.transactions].sort((a, b) =>
                            a.date < b.date ? 1 : -1
                          );
                          return (
                            <section className="fm-card" key={bank.accountNumber}>
                              <header className="fm-card-head fm-bank-head">
                                <div>
                                  <h2>
                                    {bank.alias}
                                    <span className="fm-bank-account-num"> · {bank.accountNumber}</span>
                                  </h2>
                                  <p className="fm-card-sub">
                                    {t("internal.bank.balance")}:{" "}
                                    <strong>
                                      {(bank.currentBalance ?? 0).toLocaleString("en-US", {
                                        maximumFractionDigits: 2
                                      })}{" "}
                                      {bank.currency}
                                    </strong>
                                    {bank.asOf ? (
                                      <>
                                        {" "}
                                        · {t("internal.bank.asOf")} {bank.asOf.slice(0, 10)}
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                                <div className="fm-bank-head-actions">
                                  {bankImportStatus ? (
                                    <span className="fm-import-status">{bankImportStatus}</span>
                                  ) : null}
                                  <input
                                    ref={bankFileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    style={{ display: "none" }}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (file) onBankExcelFile(file);
                                      if (bankFileInputRef.current) bankFileInputRef.current.value = "";
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-accent"
                                    onClick={() => bankFileInputRef.current?.click()}
                                  >
                                    + {t("internal.bank.uploadExcel")}
                                  </button>
                                </div>
                              </header>

                              {(() => {
                                const totalsByCode: Record<string, { plus: number; minus: number }> = {};
                                for (let i = 0; i < 13; i++) totalsByCode[String(i)] = { plus: 0, minus: 0 };
                                txns.slice(0, 25).forEach((tx, idx) => {
                                  const txKey = `${bank.accountNumber}-${idx}-${tx.date}`;
                                  const code = bankTxnTypes[txKey];
                                  if (!code || !(code in totalsByCode)) return;
                                  totalsByCode[code].plus += tx.credit ?? 0;
                                  totalsByCode[code].minus += tx.debit ?? 0;
                                });
                                const totalPlus = Object.values(totalsByCode).reduce(
                                  (s, v) => s + v.plus,
                                  0
                                );
                                const totalMinus = Object.values(totalsByCode).reduce(
                                  (s, v) => s + v.minus,
                                  0
                                );
                                const balance = bank.currentBalance ?? 0;
                                const fmt = (n: number) =>
                                  n.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  });
                                return (
                                  <div className="fm-bank-summary">
                                    <h3 className="fm-bank-summary-title">
                                      {t("internal.bank.summary.title")}
                                    </h3>
                                    <div className="fm-table-wrap">
                                      <table className="fm-table fm-bank-summary-table">
                                        <thead>
                                          <tr>
                                            <th style={{ textAlign: "center" }}>
                                              {t("internal.bank.summary.colCode")}
                                            </th>
                                            <th>{t("internal.bank.summary.colLabel")}</th>
                                            <th style={{ textAlign: "right" }}>
                                              {t("internal.bank.summary.colPlus")}
                                            </th>
                                            <th style={{ textAlign: "right" }}>
                                              {t("internal.bank.summary.colMinus")}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Array.from({ length: 13 }, (_, code) => {
                                            const v = totalsByCode[String(code)];
                                            return (
                                              <tr key={code}>
                                                <td style={{ textAlign: "center" }}>{code}</td>
                                                <td className="cell-text">
                                                  {t(`internal.bank.type.${code}`)}
                                                </td>
                                                <td style={{ textAlign: "right" }} className="cell-up">
                                                  {fmt(v.plus)}
                                                </td>
                                                <td style={{ textAlign: "right" }} className="cell-down">
                                                  {fmt(v.minus)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="fm-bank-summary-total">
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              <strong>{t("internal.bank.summary.total")}</strong>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                              <strong>{fmt(totalPlus)}</strong>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                              <strong>{fmt(totalMinus)}</strong>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              {t("internal.bank.summary.balance")}
                                            </td>
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              <strong>
                                                {fmt(balance)} {bank.currency}
                                              </strong>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              {t("internal.bank.summary.pending")}
                                            </td>
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              <input
                                                className="fm-bank-pending-input"
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={bankPending[bank.accountNumber] ?? ""}
                                                onChange={(event) =>
                                                  setBankPending((current) => ({
                                                    ...current,
                                                    [bank.accountNumber]: event.target.value
                                                  }))
                                                }
                                              />
                                              <span className="fm-bank-pending-suffix">
                                                {bank.currency}
                                              </span>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="fm-table-wrap">
                                <table className="fm-table">
                                  <thead>
                                    <tr>
                                      <th>{t("internal.bank.colDate")}</th>
                                      <th>{t("internal.bank.colDescription")}</th>
                                      <th style={{ textAlign: "right" }}>{t("internal.bank.colDebit")}</th>
                                      <th style={{ textAlign: "right" }}>{t("internal.bank.colCredit")}</th>
                                      <th style={{ textAlign: "right" }}>{t("internal.bank.colEnd")}</th>
                                      <th>{t("internal.bank.colCounterpart")}</th>
                                      <th>{t("internal.bank.colType")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txns.slice(0, 25).map((tx, idx) => {
                                      const txKey = `${bank.accountNumber}-${idx}-${tx.date}`;
                                      return (
                                        <tr key={txKey}>
                                          <td>{(tx.date ?? "").slice(0, 10)}</td>
                                          <td className="cell-text">{tx.description ?? "—"}</td>
                                          <td style={{ textAlign: "right" }} className="cell-down">
                                            {tx.debit
                                              ? tx.debit.toLocaleString("en-US", { maximumFractionDigits: 2 })
                                              : ""}
                                          </td>
                                          <td style={{ textAlign: "right" }} className="cell-up">
                                            {tx.credit
                                              ? tx.credit.toLocaleString("en-US", { maximumFractionDigits: 2 })
                                              : ""}
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                            {(tx.endingBalance ?? 0).toLocaleString("en-US", {
                                              maximumFractionDigits: 2
                                            })}
                                          </td>
                                          <td>{tx.counterpartAccount ?? "—"}</td>
                                          <td>
                                            <select
                                              className="fm-bank-type-select"
                                              value={bankTxnTypes[txKey] ?? ""}
                                              onChange={(event) =>
                                                setBankTxnTypes((current) => ({
                                                  ...current,
                                                  [txKey]: event.target.value
                                                }))
                                              }
                                            >
                                              <option value="">{t("internal.bank.typePlaceholder")}</option>
                                              {typeOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                  {opt.label}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {bank.transactionCount > 25 ? (
                                <p className="fm-card-sub" style={{ marginTop: "0.55rem" }}>
                                  Showing 25 of {bank.transactionCount} transactions.
                                </p>
                              ) : null}
                            </section>
                          );
                        })() : null}
                      </>
                    );
                  })()}
                </>
              ) : null}

              {activeFundTab === "new_trades" ? (
                <div className="fm-grid">
                  <form className="fm-form fm-card" onSubmit={onSubmitProposal}>
                    <header className="fm-card-head">
                      <h2>{t("internal.form.title")}</h2>
                    </header>

                    <label className="fm-field">
                      <span>{t("internal.form.asset")}</span>
                      <input
                        value={proposalForm.asset}
                        onChange={(event) => setProposalForm((current) => ({ ...current, asset: event.target.value }))}
                        placeholder={lang === "mn" ? "Жишээ: MSE: APU" : "Example: MSE: APU"}
                        required
                      />
                    </label>

                    <label className="fm-field">
                      <span>{t("internal.form.action")}</span>
                      <select
                        value={proposalForm.action}
                        onChange={(event) =>
                          setProposalForm((current) => ({ ...current, action: event.target.value as ProposalAction }))
                        }
                      >
                        <option value="add">{t("internal.form.actionAdd")}</option>
                        <option value="reduce">{t("internal.form.actionReduce")}</option>
                      </select>
                    </label>

                    <label className="fm-field">
                      <span>{t("internal.form.amount")}</span>
                      <input
                        type="number"
                        min="1"
                        value={proposalForm.amount}
                        onChange={(event) => setProposalForm((current) => ({ ...current, amount: event.target.value }))}
                        required
                      />
                    </label>

                    <label className="fm-field">
                      <span>{t("internal.form.reason")}</span>
                      <textarea
                        rows={3}
                        value={proposalForm.reason}
                        onChange={(event) => setProposalForm((current) => ({ ...current, reason: event.target.value }))}
                        required
                      />
                    </label>

                    <button className="btn btn-accent fm-submit" type="submit">
                      {t("internal.form.submit")}
                    </button>
                  </form>

                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.table.title")}</h2>
                    </header>
                    {proposals.length ? (
                      <div className="fm-table-wrap">
                        <table className="fm-table">
                          <thead>
                            <tr>
                              <th>{t("internal.table.asset")}</th>
                              <th>{t("internal.table.action")}</th>
                              <th>{t("internal.table.amount")}</th>
                              <th>{t("internal.table.status")}</th>
                              <th>{t("internal.table.date")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proposals.slice(0, 8).map((proposal) => (
                              <tr key={proposal.id}>
                                <td>{proposal.asset}</td>
                                <td>{actionLabel(proposal.action)}</td>
                                <td>{proposal.amount.toLocaleString("en-US")} MNT</td>
                                <td>
                                  <span className={`status-pill status-${proposal.status}`}>
                                    {statusLabel(proposal.status)}
                                  </span>
                                </td>
                                <td>{proposal.createdAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="fm-empty">{t("internal.empty")}</p>
                    )}
                  </section>
                </div>
              ) : null}

              {activeFundTab === "users" ? (
                <>
                  <div className="fm-segment">
                    <button
                      type="button"
                      className={`fm-segment-btn ${usersSegment === "investors" ? "active" : ""}`}
                      onClick={() => setUsersSegment("investors")}
                    >
                      {t("internal.users.segInvestors")}
                      <span className="fm-segment-count">
                        {new Set(
                          (fundInvestorSubscriptions as InvestorSubscription[]).map((s) =>
                            (s.registerNumber ?? "").toString()
                          )
                        ).size}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`fm-segment-btn ${usersSegment === "workers" ? "active" : ""}`}
                      onClick={() => setUsersSegment("workers")}
                    >
                      {t("internal.users.segWorkers")}
                      <span className="fm-segment-count">{fundManagersDirectory.length}</span>
                    </button>
                  </div>

                  {usersSegment === "workers" ? (
                    <>
                      <div className="fm-stats">
                        <article className="fm-stat-card">
                          <p>{t("internal.users.totalLabel")}</p>
                          <strong>{fundManagersDirectory.length}</strong>
                        </article>
                        <article className="fm-stat-card">
                          <p>{t("internal.users.activeLabel")}</p>
                          <strong>{activeUsers}</strong>
                        </article>
                        <article className="fm-stat-card">
                          <p>{t("internal.users.invitedLabel")}</p>
                          <strong>{invitedUsers}</strong>
                        </article>
                      </div>

                      <section className="fm-card">
                        <header className="fm-card-head">
                          <h2>{t("internal.users.title")}</h2>
                          <button className="btn btn-accent fm-card-action" type="button">
                            {t("internal.users.invite")}
                          </button>
                        </header>
                        <div className="fm-table-wrap">
                          <table className="fm-table fm-users-table">
                            <thead>
                              <tr>
                                <th>{t("internal.users.colName")}</th>
                                <th>{t("internal.users.colEmail")}</th>
                                <th>{t("internal.users.colTitle")}</th>
                                <th>{t("internal.users.colStatus")}</th>
                                <th>{t("internal.users.colLogin")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fundManagersDirectory.map((user) => (
                                <tr key={user.id}>
                                  <td>
                                    <div className="fm-user-cell">
                                      <span className="fm-user-avatar">{initials(user.name)}</span>
                                      <span>{user.name}</span>
                                    </div>
                                  </td>
                                  <td>{user.email}</td>
                                  <td>{user.title}</td>
                                  <td>
                                    <span className={`status-pill status-${user.status === "active" ? "approved" : "pending"}`}>
                                      {user.status === "active"
                                        ? t("internal.users.statusActive")
                                        : t("internal.users.statusInvited")}
                                    </span>
                                  </td>
                                  <td>{user.lastLogin}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  ) : (
                    (() => {
                      const subs = fundInvestorSubscriptions as InvestorSubscription[];
                      const grouped = new Map<string, InvestorSubscription[]>();
                      for (const s of subs) {
                        const key = (s.registerNumber ?? `_${s.no ?? Math.random()}`).toString();
                        const list = grouped.get(key) ?? [];
                        list.push(s);
                        grouped.set(key, list);
                      }
                      const investors = [...grouped.entries()]
                        .map(([reg, records]) => {
                          const sorted = [...records].sort((a, b) =>
                            (a.transferDate ?? "") < (b.transferDate ?? "") ? -1 : 1
                          );
                          const first = sorted[0];
                          const fullName = [first.lastName, first.firstName].filter(Boolean).join(" ");
                          const totalPurchased = sorted.reduce(
                            (sum, r) => sum + (r.unitsPurchased ?? 0),
                            0
                          );
                          const totalReturned = sorted.reduce(
                            (sum, r) => sum + (r.unitsReturned ?? 0),
                            0
                          );
                          const totalActive = sorted.reduce(
                            (sum, r) => sum + (r.unitsActive ?? 0),
                            0
                          );
                          const totalTransferred = sorted.reduce(
                            (sum, r) => sum + (r.transferAmount ?? 0),
                            0
                          );
                          return {
                            key: reg,
                            fullName: fullName || "—",
                            register: first.registerNumber ?? "—",
                            phone: first.phone ?? "—",
                            email: first.email ?? "—",
                            totalPurchased,
                            totalReturned,
                            totalActive,
                            totalTransferred,
                            subscriptions: sorted
                          };
                        })
                        .sort((a, b) => b.totalActive - a.totalActive);

                      const totalActiveUnits = investors.reduce((s, i) => s + i.totalActive, 0);
                      const totalReturnedUnits = investors.reduce((s, i) => s + i.totalReturned, 0);

                      return (
                        <>
                          <div className="fm-stats">
                            <article className="fm-stat-card primary">
                              <p>{t("internal.users.totalInvestorsLabel")}</p>
                              <strong>{investors.length}</strong>
                            </article>
                            <article className="fm-stat-card">
                              <p>{t("internal.users.totalActiveUnitsLabel")}</p>
                              <strong>{totalActiveUnits.toLocaleString("en-US")}</strong>
                            </article>
                            <article className="fm-stat-card">
                              <p>{t("internal.users.totalReturnedUnitsLabel")}</p>
                              <strong>{totalReturnedUnits.toLocaleString("en-US")}</strong>
                            </article>
                          </div>

                          <section className="fm-card">
                            <header className="fm-card-head">
                              <h2>{t("internal.users.investorsTitle")}</h2>
                              <p className="fm-card-sub">
                                {investors.length} {t("internal.users.segInvestors")}
                              </p>
                            </header>
                            <div className="fm-ticker-list">
                              {investors.map((inv) => {
                                const key = `inv:${inv.key}`;
                                const open = expandedTickers.has(key);
                                const hasReturned = inv.totalReturned > 0;
                                return (
                                  <div key={inv.key} className={`fm-ticker-card ${open ? "open" : ""}`}>
                                    <button
                                      type="button"
                                      className="fm-ticker-toggle fm-investor-toggle"
                                      onClick={() => toggleTicker(key)}
                                      aria-expanded={open}
                                    >
                                      <span className="fm-ticker-arrow" aria-hidden="true">▸</span>
                                      <span className="fm-user-cell">
                                        <span className="fm-user-avatar">{initials(inv.fullName)}</span>
                                        <span>{inv.fullName}</span>
                                      </span>
                                      <span className="fm-investor-meta">{inv.register}</span>
                                      <span className="fm-ticker-net">
                                        {inv.totalActive.toLocaleString("en-US")} {t("internal.users.colActive")}
                                      </span>
                                      {hasReturned ? (
                                        <span className="fm-investor-returned">
                                          −{inv.totalReturned.toLocaleString("en-US")} {t("internal.users.colReturned")}
                                        </span>
                                      ) : null}
                                      <span className="fm-ticker-count">
                                        {inv.subscriptions.length} {inv.subscriptions.length === 1
                                          ? t("internal.users.subsOne")
                                          : t("internal.users.subsMany")}
                                      </span>
                                    </button>
                                    {open ? (
                                      <div className="fm-ticker-detail">
                                        <div className="fm-investor-contact">
                                          <span>
                                            <strong>{t("internal.users.colPhone")}:</strong> {inv.phone}
                                          </span>
                                          <span>
                                            <strong>{t("internal.users.colEmail")}:</strong> {inv.email}
                                          </span>
                                        </div>
                                        <div className="fm-table-wrap">
                                          <table className="fm-table">
                                            <thead>
                                              <tr>
                                                <th>{t("internal.users.colTransferDate")}</th>
                                                <th>{t("internal.users.colType")}</th>
                                                <th style={{ textAlign: "right" }}>{t("internal.users.colUnits")}</th>
                                                <th style={{ textAlign: "right" }}>{t("internal.users.colUnitValue")}</th>
                                                <th style={{ textAlign: "right" }}>{t("internal.users.colTransferAmount")}</th>
                                                <th style={{ textAlign: "right" }}>{t("internal.users.colActive")}</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(() => {
                                                const rows: ReactElement[] = [];
                                                let balance = 0;
                                                inv.subscriptions.forEach((s, i) => {
                                                  const buyUnits = s.unitsPurchased ?? 0;
                                                  if (buyUnits > 0) {
                                                    balance += buyUnits;
                                                    rows.push(
                                                      <tr key={`${inv.key}-${i}-buy`}>
                                                        <td>{s.transferDate ?? "—"}</td>
                                                        <td>
                                                          <span className="trade-type buy">BUY</span>
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                          {buyUnits.toLocaleString("en-US")}
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                          {(s.unitValue ?? 0).toLocaleString("en-US", {
                                                            maximumFractionDigits: 2
                                                          })}{" "}
                                                          MNT
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                          {(s.transferAmount ?? 0).toLocaleString("en-US", {
                                                            maximumFractionDigits: 0
                                                          })}
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                          <strong>{balance.toLocaleString("en-US")}</strong>
                                                        </td>
                                                      </tr>
                                                    );
                                                  }
                                                  const sellUnits = s.unitsReturned ?? 0;
                                                  if (sellUnits > 0) {
                                                    balance -= sellUnits;
                                                    rows.push(
                                                      <tr key={`${inv.key}-${i}-sell`}>
                                                        <td>—</td>
                                                        <td>
                                                          <span className="trade-type sell">SELL</span>
                                                        </td>
                                                        <td style={{ textAlign: "right" }} className="cell-down">
                                                          −{sellUnits.toLocaleString("en-US")}
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>—</td>
                                                        <td style={{ textAlign: "right" }}>—</td>
                                                        <td style={{ textAlign: "right" }}>
                                                          <strong>{balance.toLocaleString("en-US")}</strong>
                                                        </td>
                                                      </tr>
                                                    );
                                                  }
                                                });
                                                return rows;
                                              })()}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </>
                      );
                    })()
                  )}
                </>
              ) : null}

              {activeFundTab === "settings" ? (
                <div className="fm-settings-grid">
                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.settings.profileTitle")}</h2>
                      <p className="fm-card-sub">{t("internal.settings.profileDesc")}</p>
                    </header>
                    <div className="fm-field-grid">
                      <label className="fm-field">
                        <span>{t("internal.settings.fullName")}</span>
                        <input defaultValue={currentUser.name} />
                      </label>
                      <label className="fm-field">
                        <span>{t("internal.settings.email")}</span>
                        <input defaultValue={currentUser.email} type="email" />
                      </label>
                      <label className="fm-field">
                        <span>{t("internal.settings.language")}</span>
                        <select value={lang} onChange={() => onToggleLang()}>
                          <option value="mn">Монгол</option>
                          <option value="en">English</option>
                        </select>
                      </label>
                      <label className="fm-field">
                        <span>{t("internal.users.colTitle")}</span>
                        <input defaultValue={currentUser.title} readOnly />
                      </label>
                    </div>
                    <div className="fm-card-actions">
                      <button className="btn btn-accent" type="button">
                        {t("internal.settings.save")}
                      </button>
                    </div>
                  </section>

                  <section className="fm-card">
                    <header className="fm-card-head">
                      <h2>{t("internal.settings.passwordTitle")}</h2>
                      <p className="fm-card-sub">{t("internal.settings.passwordDesc")}</p>
                    </header>
                    <div className="fm-field-grid">
                      <label className="fm-field fm-field-full">
                        <span>{t("internal.settings.currentPassword")}</span>
                        <input type="password" placeholder="••••••••" />
                      </label>
                      <label className="fm-field">
                        <span>{t("internal.settings.newPassword")}</span>
                        <input type="password" placeholder="••••••••" />
                      </label>
                      <label className="fm-field">
                        <span>{t("internal.settings.confirmPassword")}</span>
                        <input type="password" placeholder="••••••••" />
                      </label>
                    </div>
                    <div className="fm-card-actions">
                      <button className="btn btn-accent" type="button">
                        {t("internal.settings.updatePassword")}
                      </button>
                    </div>
                  </section>

                  <section className="fm-card fm-card-wide">
                    <header className="fm-card-head">
                      <h2>{t("internal.settings.dataSourceTitle")}</h2>
                      <p className="fm-card-sub">{t("internal.settings.dataSourceDesc")}</p>
                    </header>
                    <dl className="fm-meta-list">
                      <div>
                        <dt>{t("internal.settings.provider")}</dt>
                        <dd>Mongolian Stock Exchange — Public Market Data API</dd>
                      </div>
                      <div>
                        <dt>{t("internal.settings.endpoint")}</dt>
                        <dd><code>https://api.mse.mn/v1/market</code></dd>
                      </div>
                      <div>
                        <dt>{t("internal.settings.apiKey")}</dt>
                        <dd><code>msex_•••••••••••••••3f9a</code></dd>
                      </div>
                      <div>
                        <dt>{t("internal.settings.refresh")}</dt>
                        <dd>15 min</dd>
                      </div>
                      <div>
                        <dt>{t("internal.settings.statusLabel")}</dt>
                        <dd>
                          <span className="status-pill status-approved">
                            <span className="status-dot" />
                            {t("internal.settings.statusOk")}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              ) : null}

                </>
              )}
            </main>
          </div>

          {splitTicker ? (
            <div
              className="modal"
              onClick={(event) => event.target === event.currentTarget && setSplitTicker(null)}
            >
              <div className="modal-card fm-split-modal">
                <h3>{t("internal.trades.splitModal.title")}</h3>
                <p className="fm-card-sub">
                  <strong>{splitTicker.ticker}</strong> · {splitTicker.currency}
                </p>
                <form onSubmit={applySplit}>
                  <div className="fm-split-fields">
                    <label className="fm-field">
                      <span>{t("internal.trades.splitModal.new")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={splitForm.newShares}
                        onChange={(e) => setSplitForm((p) => ({ ...p, newShares: e.target.value }))}
                        required
                      />
                    </label>
                    <span className="fm-split-colon">:</span>
                    <label className="fm-field">
                      <span>{t("internal.trades.splitModal.old")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={splitForm.oldShares}
                        onChange={(e) => setSplitForm((p) => ({ ...p, oldShares: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <div className="fm-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setSplitTicker(null)}
                    >
                      {t("internal.trades.preview.cancel")}
                    </button>
                    <button type="submit" className="btn btn-accent">
                      {t("internal.trades.splitModal.apply")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {stockAddChoiceOpen ? (
            <div
              className="modal"
              onClick={(event) => event.target === event.currentTarget && setStockAddChoiceOpen(false)}
            >
              <div className="modal-card fm-choice-modal">
                <h3>{t("internal.trades.addChoiceTitle")}</h3>
                <div className="fm-choice-grid">
                  <button
                    type="button"
                    className="fm-choice-btn"
                    onClick={() => {
                      setStockAddChoiceOpen(false);
                      setTradeEntryOpen(true);
                    }}
                  >
                    <strong>{t("internal.trades.manualEntry")}</strong>
                  </button>
                  <button
                    type="button"
                    className="fm-choice-btn"
                    onClick={() => {
                      setStockAddChoiceOpen(false);
                      tradeFileInputRef.current?.click();
                    }}
                  >
                    <strong>{t("internal.trades.excelImport")}</strong>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost full"
                  onClick={() => setStockAddChoiceOpen(false)}
                >
                  {t("internal.trades.preview.cancel")}
                </button>
              </div>
            </div>
          ) : null}

          {excelPreview ? (
            <div
              className="modal"
              onClick={(event) => event.target === event.currentTarget && setExcelPreview(null)}
            >
              <div className="modal-card fm-preview-modal">
                <h3>{t("internal.trades.preview.title")}</h3>
                <p className="fm-card-sub">
                  <strong>{excelPreview.fileName}</strong> · {excelPreview.rows.length}{" "}
                  {t("internal.trades.preview.found")}
                </p>

                {excelPreview.error ? (
                  <div className="fm-preview-warning">⚠ {excelPreview.error}</div>
                ) : null}

                {excelPreview.missing.length > 0 ? (
                  <div className="fm-preview-warning">
                    <strong>{t("internal.trades.preview.missing")}:</strong>{" "}
                    {excelPreview.missing.join(", ")}
                  </div>
                ) : (
                  <div className="fm-preview-ok">✓ {t("internal.trades.preview.allFound")}</div>
                )}

                <div className="fm-preview-columns">
                  {REQUIRED_TRADE_COLUMNS.map((col) => {
                    const found = excelPreview.detected.includes(col);
                    return (
                      <span key={col} className={`fm-preview-col ${found ? "found" : "missing"}`}>
                        {found ? "✓" : "✗"} {col}
                      </span>
                    );
                  })}
                </div>

                {excelPreview.rows.length > 0 ? (
                  <>
                    <p className="fm-card-sub" style={{ marginTop: "0.85rem" }}>
                      {t("internal.trades.preview.sample")}
                    </p>
                    <div className="fm-table-wrap">
                      <table className="fm-table fm-preview-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Ticker</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelPreview.rows.slice(0, 5).map((r) => (
                            <tr key={r.id}>
                              <td>{r.tradeDate}</td>
                              <td>
                                <span className={`trade-type ${r.type.toLowerCase()}`}>{r.type}</span>
                              </td>
                              <td>
                                <strong>{r.ticker}</strong>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {r.quantity.toLocaleString("en-US")}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {r.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {r.total.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}

                <div className="fm-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setExcelPreview(null)}
                  >
                    {t("internal.trades.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent"
                    disabled={excelPreview.rows.length === 0}
                    onClick={confirmExcelImport}
                  >
                    {t("internal.trades.preview.confirm")} ({excelPreview.rows.length})
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {bondFormOpen ? (
            <div className="modal" onClick={(event) => event.target === event.currentTarget && setBondFormOpen(false)}>
              <div className="modal-card fm-bond-modal">
                <h3>{t("internal.portfolio.bondModal.title")}</h3>
                <form onSubmit={onSubmitBond}>
                  <div className="fm-field-grid">
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.ticker")}</span>
                      <input
                        value={bondForm.ticker}
                        onChange={(e) => setBondForm((p) => ({ ...p, ticker: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.name")}</span>
                      <input
                        value={bondForm.name}
                        onChange={(e) => setBondForm((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.yield")}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bondForm.yield}
                        onChange={(e) => setBondForm((p) => ({ ...p, yield: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.qty")}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={bondForm.qty}
                        onChange={(e) => setBondForm((p) => ({ ...p, qty: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.value")}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={bondForm.value}
                        onChange={(e) => setBondForm((p) => ({ ...p, value: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.purchaseInterest")}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={bondForm.purchaseInterest}
                        onChange={(e) => setBondForm((p) => ({ ...p, purchaseInterest: e.target.value }))}
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.purchaseDate")}</span>
                      <input
                        type="date"
                        value={bondForm.purchaseDate}
                        onChange={(e) => setBondForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.paymentDate")}</span>
                      <input
                        type="date"
                        value={bondForm.paymentDate}
                        onChange={(e) => setBondForm((p) => ({ ...p, paymentDate: e.target.value }))}
                      />
                    </label>
                    <label className="fm-field">
                      <span>{t("internal.portfolio.bondModal.maturityDate")}</span>
                      <input
                        type="date"
                        value={bondForm.maturityDate}
                        onChange={(e) => setBondForm((p) => ({ ...p, maturityDate: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="fm-card-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setBondFormOpen(false)}>
                      {t("internal.portfolio.bondModal.cancel")}
                    </button>
                    <button type="submit" className="btn btn-accent">
                      {t("internal.portfolio.bondModal.submit")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="app">
        <header className="site-header">
          <div className="container header-wrap">
            <a className="brand" href={`/?lang=${lang}`}>
              <img src="/assets/logo.png" alt="UB Asset Management logo" />
              <div>
                <p className="brand-name">Улаанбаатар Ассет Менежмент ХХК</p>
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
          <section className="section section-soft internal-section">
            <div className="container internal-wrap internal-portal">
              <article className="internal-card internal-portal-card">
                <p className="internal-label">{t("internal.selected")}</p>
                <h1>{selectedRoleLabel}</h1>
                <section className="board-placeholder">
                  <h2>{t("internal.boardTitle")}</h2>
                  <p>{t("internal.boardDesc")}</p>
                </section>
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
          <a
            className="brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              setPage("home");
            }}
          >
            <img src="/assets/logo.png" alt="UB Asset Management logo" />
          </a>

          <nav className="main-nav">
            <button
              type="button"
              className={`main-nav-link${page === "about" ? " active" : ""}`}
              onClick={() => setPage("about")}
            >
              {t("nav.about")}
            </button>
            <button
              type="button"
              className={`main-nav-link${page === "funds" ? " active" : ""}`}
              onClick={() => setPage("funds")}
            >
              {t("nav.funds")}
            </button>
            <button
              type="button"
              className={`main-nav-link${page === "reports" ? " active" : ""}`}
              onClick={() => setPage("reports")}
            >
              {t("nav.financials")}
            </button>
          </nav>

          <div className="header-actions">
            <button className="btn btn-ghost" type="button" onClick={onToggleLang}>
              {lang === "mn" ? "EN" : "MN"}
            </button>
            {!PUBLIC_ONLY ? (
              <button className="btn btn-accent" type="button" onClick={() => setLoginOpen(true)}>
                {t("auth.login")}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="market-strip" aria-label="Market indexes">
        <div className="market-track">
          {[0, 1].map((group) => (
            <div className="market-group" key={`market-${group}`}>
              {tickerItems.map((item) => (
                <article className="market-item" key={`${group}-${item.label}`}>
                  <span className="market-name">{item.label}</span>
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

      <main className={page === "home" ? undefined : "page-bg"}>
        {page === "home" ? (
          <>
            <section className="hero" id="hero">
              <div className="hero-overlay" />
              <div className="container hero-content">
                <h1>
                  Улаанбаатар
                  <br />
                  Ассет Менежмент ХХК
                </h1>
                <p>{t("hero.body")}</p>
              </div>
            </section>

            <section className="section home-value">
              <div className="container">
                <div className="value-top">
                  <FeaturedGlobe lang={lang} />
                  <div className="value-text">
                    <h2 className="value-title">{t("value.title")}</h2>
                    <p className="value-intro">{t("value.intro")}</p>
                    <p className="asset-label">{t("value.assets")}</p>
                    <ul className="asset-chips">
                      <li>{t("asset.global")}</li>
                      <li>{t("asset.domestic")}</li>
                      <li>{t("asset.bonds")}</li>
                      <li>{t("asset.realestate")}</li>
                    </ul>
                  </div>
                </div>

                <div className="value-cards">
                  <article className="value-card">
                    <span className="value-icon" aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18" />
                        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
                      </svg>
                    </span>
                    <h3 className="value-card-title">{t("value.c1.t")}</h3>
                    <p className="value-card-text">{t("value.c1.d")}</p>
                  </article>

                  <article className="value-card">
                    <span className="value-icon" aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <h3 className="value-card-title">{t("value.c2.t")}</h3>
                    <p className="value-card-text">{t("value.c2.d")}</p>
                  </article>

                  <article className="value-card">
                    <span className="value-icon" aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 17 9 11l4 4 8-8" />
                        <path d="M21 3v6h-6" />
                      </svg>
                    </span>
                    <h3 className="value-card-title">{t("value.c3.t")}</h3>
                    <p className="value-card-text">{t("value.c3.d")}</p>
                  </article>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {page === "about" ? (
          <>
        <section className="section" id="about">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">{t("about.title")}</h2>
            </div>
            <div className="about-carousel">
              <div className="about-viewport" ref={aboutViewportRef}>
                <div
                  className="about-track"
                  ref={aboutTrackRef}
                  style={{
                    transform: `translateX(${aboutTrackX}px)`,
                    transition: aboutAnimate ? undefined : "none"
                  }}
                  onTransitionEnd={(event) => {
                    if (event.target !== aboutTrackRef.current || event.propertyName !== "transform") {
                      return;
                    }
                    if (aboutPos < aboutCount || aboutPos >= aboutCount * 2) {
                      setAboutAnimate(false);
                      setAboutPos(aboutCount + aboutActive);
                    }
                  }}
                >
                  {aboutLoopCards.map((card, index) => (
                    <article
                      key={`${card.title}-${index}`}
                      className={`about-card${index === aboutPos ? " is-active" : ""}`}
                      style={{ width: aboutCardPx ? `${aboutCardPx}px` : undefined }}
                      onClick={() => setAboutPos(index)}
                    >
                      <h2>{card.title}</h2>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="about-dots">
                {aboutCards.map((card, index) => (
                  <button
                    key={`dot-${card.title}-${index}`}
                    type="button"
                    className={`about-dot${index === aboutActive ? " active" : ""}`}
                    onClick={() => setAboutPos(aboutCount + index)}
                    aria-label={card.title}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="timeline">
          <div className="container">
            <div className="ht-head">
              <h2 className="section-title">{t("timeline.title")}</h2>
            </div>

            <div className="ht-rail">
              <button
                className="ht-arrow"
                type="button"
                aria-label="Previous"
                onClick={() => goMilestone(activeMilestone - 1)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <div className="ht-line">
                {combinedTimeline.map((item, index) => (
                  <button
                    key={`ht-node-${item.year}-${index}`}
                    type="button"
                    className={`ht-node${index === activeMilestone ? " active" : ""}`}
                    onClick={() => setActiveMilestone(index)}
                  >
                    <span className="ht-dot" />
                    <span className="ht-year">{item.year}</span>
                  </button>
                ))}
              </div>
              <button
                className="ht-arrow"
                type="button"
                aria-label="Next"
                onClick={() => goMilestone(activeMilestone + 1)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="ht-panel" key={activeMilestone}>
              <span className="ht-panel-year">{activeEntry.year}</span>
              <p className="ht-panel-text">{activeEntry.text}</p>
            </div>
          </div>
        </section>

        <section className="section" id="team">
          <div className="container">
            <h2 className="section-title">{t("team.title")}</h2>
            <div className="team-grid">
              {teamMembers.map((person, index) => (
                <article className="member-card" key={`${person.name}-${index}`}>
                  <MemberAvatar name={person.name} photo={person.photo} />
                  <p className="member-name">{person.name}</p>
                  <p className="member-role">{person.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
          </>
        ) : null}

        {page === "funds" ? (
          <section className="section" id="funds">
            <div className="container">
              <div className="fund-picker" ref={fundPickerRef}>
                <button
                  type="button"
                  className="fund-select"
                  aria-haspopup="listbox"
                  aria-expanded={fundMenuOpen}
                  onClick={() => setFundMenuOpen((open) => !open)}
                >
                  <span>{lang === "mn" ? FUNDS[fundIdx].nameMn : FUNDS[fundIdx].nameEn}</span>
                  <svg
                    className={`fund-chevron${fundMenuOpen ? " open" : ""}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {fundMenuOpen ? (
                  <ul className="fund-menu" role="listbox">
                    {FUNDS.map((f, i) => (
                      <li key={f.id} role="option" aria-selected={i === fundIdx}>
                        <button
                          type="button"
                          className={`fund-menu-item${i === fundIdx ? " active" : ""}`}
                          onClick={() => {
                            setFundIdx(i);
                            setFundMenuOpen(false);
                          }}
                        >
                          {lang === "mn" ? f.nameMn : f.nameEn}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="fund-overview">
                <article className="fund-overview-card">
                  <h3 className="fund-name">
                    {lang === "mn" ? FUNDS[fundIdx].nameMn : FUNDS[fundIdx].nameEn}
                  </h3>
                  {FUNDS[fundIdx].tagMn ? (
                    <p className="fund-tag">
                      {lang === "mn" ? FUNDS[fundIdx].tagMn : FUNDS[fundIdx].tagEn}
                    </p>
                  ) : null}

                  {FUNDS[fundIdx].comingSoon ? (
                    <p className="fund-coming-soon">
                      {lang === "mn" ? "Тун удахгүй..." : "Coming soon..."}
                    </p>
                  ) : null}

                  {(FUNDS[fundIdx].sections ?? []).map((s, si) => (
                    <div className="fund-section" key={si}>
                      <h4 className="fund-section-title">
                        {lang === "mn" ? s.headingMn : s.headingEn}
                      </h4>
                      {(lang === "mn" ? s.bodyMn : s.bodyEn).map((para, pi) => (
                        <p className="fund-section-text" key={pi}>
                          {para}
                        </p>
                      ))}
                    </div>
                  ))}
                </article>
              </div>

              {FUNDS[fundIdx].committee ? (
                <div className="fund-committee">
                  <h3 className="fund-committee-title">{t("funds.committee")}</h3>
                  <div className="committee-grid">
                    {FUNDS[fundIdx].committee!.map((m, i) => (
                      <article className="member-card" key={i}>
                        <MemberAvatar name={lang === "mn" ? m.nameMn : m.nameEn} photo={m.photo} />
                        <p className="member-name">{lang === "mn" ? m.nameMn : m.nameEn}</p>
                        <p className="member-role">{lang === "mn" ? m.roleMn : m.roleEn}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {page === "reports" ? (
        <section className="section" id="financials">
          <div className="container">
            <div className="report-search">
              <svg className="report-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                className="report-search-input"
                value={reportQuery}
                onChange={(event) => setReportQuery(event.target.value)}
                placeholder={lang === "mn" ? "Хайх" : "Search"}
                aria-label={lang === "mn" ? "Хайх" : "Search"}
              />
            </div>
            <div className="reports-grid">
              {displayReportGroups.map((group, groupIndex) => (
                <div className="report-group" key={`report-group-${groupIndex}`}>
                  <h3 className="report-group-title">{group.title}</h3>
                  {group.items.length === 0 ? (
                    <p className="report-empty">
                      {lang === "mn" ? "Одоогоор баримт байхгүй." : "No documents yet."}
                    </p>
                  ) : null}
                  <ul className="report-list">
                    {group.items.map((item, itemIndex) => (
                      <li key={`report-${groupIndex}-${itemIndex}`}>
                        <div className="report-item">
                          <span className="report-file" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3v5h5" />
                              <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                            </svg>
                          </span>
                          <span className="report-name">{item.name}</span>
                          <div className="report-actions">
                            <button
                              type="button"
                              className="report-action"
                              title={lang === "mn" ? "Урьдчилан үзэх" : "Preview"}
                              aria-label={lang === "mn" ? "Урьдчилан үзэх" : "Preview"}
                              onClick={() => setPreviewDoc(item)}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <a
                              className="report-action"
                              href={item.href}
                              download
                              title={lang === "mn" ? "Татах" : "Download"}
                              aria-label={lang === "mn" ? "Татах" : "Download"}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 4v11" />
                                <path d="M7 11l5 5 5-5" />
                                <path d="M5 20h14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
        ) : null}

      </main>

      <footer className="site-footer" id="site-footer">
        <div className="container footer-wrap">
          <div className="footer-brand">
            <span className="footer-logo">
              <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
            </span>
            <span className="footer-brand-name">
              {liveContact ? (lang === "mn" ? liveContact.company_mn : liveContact.company_en) : t("contact.company")}
            </span>
          </div>

          <a className="footer-contact" href={`tel:${(liveContact?.phone || "+976-7011-2606").replace(/[^+\d]/g, "")}`}>
            <span className="footer-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <span>{liveContact?.phone || "+976-7011-2606"}</span>
          </a>

          <a className="footer-contact" href={`mailto:${liveContact?.email || "info@ubam.mn"}`}>
            <span className="footer-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
            </span>
            <span>{liveContact?.email || "info@ubam.mn"}</span>
          </a>

          <div className="footer-contact">
            <span className="footer-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span>
              {liveContact ? (lang === "mn" ? liveContact.address_mn : liveContact.address_en) : t("contact.address")}
            </span>
          </div>
        </div>
        <div className="footer-copy">
          <div className="container">{t("footer.copy")}</div>
        </div>
      </footer>

      {previewDoc ? (
        <div
          className="modal"
          onClick={(event) => event.target === event.currentTarget && setPreviewDoc(null)}
        >
          <div className="preview-card">
            <div className="preview-head">
              <span className="preview-title">{previewDoc.name}</span>
              <div className="preview-head-actions">
                <a className="btn btn-ghost" href={previewDoc.href} download>
                  {lang === "mn" ? "Татах" : "Download"}
                </a>
                <button className="preview-close" type="button" onClick={() => setPreviewDoc(null)} aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
            <iframe className="preview-frame" src={previewDoc.href} title={previewDoc.name} />
          </div>
        </div>
      ) : null}

      {loginOpen ? (
        <div className="modal" onClick={(event) => event.target === event.currentTarget && closeLogin()}>
          <div className="modal-card login-card">
            {pendingRole ? (
              <>
                <div className="login-head">
                  <span className="login-lock" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" />
                      <path d="M6 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
                      <path d="M15 9h3a1 1 0 0 1 1 1v11" />
                      <path d="M9 8h2" />
                      <path d="M9 12h2" />
                      <path d="M9 16h2" />
                    </svg>
                  </span>
                  <p className="login-eyebrow">{lang === "mn" ? "Сан сонгох" : "Select fund"}</p>
                </div>
                <div className="role-list">
                  {funds.map((fund) => (
                    <button
                      key={fund.id}
                      className="role-option"
                      type="button"
                      onClick={() => toInternal(pendingRole, fund.id)}
                    >
                      <span className="role-option-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18" />
                          <path d="M6 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
                          <path d="M15 9h3a1 1 0 0 1 1 1v11" />
                          <path d="M9 8h2" />
                          <path d="M9 12h2" />
                          <path d="M9 16h2" />
                        </svg>
                      </span>
                      <span className="role-option-text">
                        <span className="role-option-title">{fund.name}</span>
                      </span>
                      <span className="role-option-arrow" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
                <button className="login-cancel" type="button" onClick={() => setPendingRole(null)}>
                  {lang === "mn" ? "Буцах" : "Back"}
                </button>
              </>
            ) : (
              <>
                <div className="login-head">
                  <span className="login-lock" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <p className="login-eyebrow">{t("internal.brand")}</p>
                </div>
                <div className="role-list">
                  {([
                    {
                      role: "board_member" as Role,
                      title: t("role.board"),
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="8" r="3.2" />
                          <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                          <circle cx="17.5" cy="7.5" r="2.4" />
                          <path d="M16 13a5 5 0 0 1 5 5" />
                        </svg>
                      )
                    },
                    {
                      role: "fund_manager" as Role,
                      title: t("role.fund"),
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20V4" />
                          <path d="M4 20h16" />
                          <rect x="7" y="12" width="3" height="5" />
                          <rect x="13" y="8" width="3" height="9" />
                        </svg>
                      )
                    },
                    {
                      role: "general_admin" as Role,
                      title: t("role.admin"),
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      )
                    }
                  ]).map((opt) => (
                    <button
                      key={opt.role}
                      className="role-option"
                      type="button"
                      onClick={() => chooseRole(opt.role)}
                    >
                      <span className="role-option-icon">{opt.icon}</span>
                      <span className="role-option-text">
                        <span className="role-option-title">{opt.title}</span>
                      </span>
                      <span className="role-option-arrow" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
                <button className="login-cancel" type="button" onClick={closeLogin}>
                  {t("login.cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

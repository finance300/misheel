import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { fundCalc, fundInputs } from "./data/fund-calc";
import fundTrades from "./data/fund-trades.json";
import fundBanks from "./data/fund-banks.json";
import fundInvestorSubscriptions from "./data/fund-investor-subscriptions.json";
import fundTradeSummary from "./data/fund-trade-summary.json";

type Lang = "mn" | "en";
type Role = "board_member" | "fund_manager";
type FundManagerTab =
  | "nav"
  | "portfolio"
  | "trades"
  | "bank"
  | "new_trades"
  | "users"
  | "settings";

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
    "internal.portfolio.bondModal.title": "Шинэ бонд бүртгэх",
    "internal.portfolio.bondModal.ticker": "Тикер",
    "internal.portfolio.bondModal.name": "Нэр",
    "internal.portfolio.bondModal.yield": "Жилийн хүү (%)",
    "internal.portfolio.bondModal.qty": "Тоо ширхэг",
    "internal.portfolio.bondModal.value": "Үнэлгээ (MNT)",
    "internal.portfolio.bondModal.purchaseInterest": "Худалдан авсан үед төлсөн хүү (MNT)",
    "internal.portfolio.bondModal.purchaseDate": "Худалдан авсан огноо",
    "internal.portfolio.bondModal.paymentDate": "Хүү төлөх огноо",
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
  const initialInternal = useMemo(() => isInternalPath(), []);
  const initialRole = useMemo(() => readRoleFromQuery(), []);
  const initialLang = useMemo(
    () => readLangFromQuery() ?? ((localStorage.getItem("lang") as Lang | null) ?? "mn"),
    []
  );

  const [lang, setLang] = useState<Lang>(initialLang === "en" ? "en" : "mn");
  const [role] = useState<Role>(initialRole);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeFundTab, setActiveFundTab] = useState<FundManagerTab>("nav");
  const [tradeEntryOpen, setTradeEntryOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [tradeConfirmations, setTradeConfirmations] = useState<TradeConfirmation[]>(initialTradeConfirmations);
  const [navApproval, setNavApproval] = useState<NavApproval | null>(null);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [usersSegment, setUsersSegment] = useState<"workers" | "investors">("workers");
  const [tradesSegment, setTradesSegment] = useState<"active" | "inactive">("active");
  const [bondFormOpen, setBondFormOpen] = useState(false);
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
  const fundManagerTabs: Array<{ id: FundManagerTab; label: string; icon: ReactElement }> = [
    { id: "nav", label: t("internal.fmTabs.nav"), icon: tabIcon("nav") },
    { id: "portfolio", label: t("internal.fmTabs.portfolio"), icon: tabIcon("portfolio") },
    { id: "trades", label: t("internal.fmTabs.trades"), icon: tabIcon("trades") },
    { id: "bank", label: t("internal.fmTabs.bank"), icon: tabIcon("bank") },
    { id: "new_trades", label: t("internal.fmTabs.newTrades"), icon: tabIcon("new_trades") },
    { id: "users", label: t("internal.fmTabs.users"), icon: tabIcon("users") },
    { id: "settings", label: t("internal.fmTabs.settings"), icon: tabIcon("settings") }
  ];
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
  };

  if (initialInternal) {
    const selectedRoleLabel = role === "fund_manager" ? t("role.fund") : t("role.board");

    if (role === "fund_manager") {
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
              <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
              <div>
                <p className="fm-sidebar-brand-name">Улаанбаатар Ассет Менежмент ҮЦК ХХК</p>
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
              <div className="fm-sidebar-user">
                <div className="fm-sidebar-avatar">{initials(currentUser.name)}</div>
                <div className="fm-sidebar-user-meta">
                  <p className="fm-sidebar-user-name">{currentUser.name}</p>
                  <p className="fm-sidebar-user-email">{currentUser.email}</p>
                </div>
              </div>
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
                <span className="fm-topbar-role-label">{t("role.fund")}</span>
              </div>
            </header>

            <main className="fm-content">
              {activeFundTab === "nav" ? (
                <>
                  <div className="fm-nav-row">
                    <section className={`fm-nav-banner ${isTodayApproved ? "is-approved" : ""}`}>
                      <div className="fm-nav-banner-info">
                        <p className="fm-nav-banner-label">{t("internal.nav.todayLabel")}</p>
                        <p className="fm-nav-banner-date">{latestNav.date}</p>
                        <p className="fm-nav-banner-value">
                          {fundCalc.navPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MNT
                        </p>
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
                      const stocksTotalMnt = fundInputs.equities
                        .filter((e) => e.type !== "Option")
                        .reduce((s, e) => s + (e.mcapMnt ?? 0), 0);
                      const optionsTotalMnt = fundInputs.equities
                        .filter((e) => e.type === "Option")
                        .reduce((s, e) => s + (e.mcapMnt ?? 0), 0);
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
                        <strong>{formatNav(fundCalc.totalBonds)}</strong>
                      </li>
                      <li>
                        <span>{t("internal.nav.brCash")}</span>
                        <strong>{formatNav(fundCalc.totalCash)}</strong>
                      </li>
                      <li className="negative">
                        <span>{t("internal.nav.brLiabilities")}</span>
                        <strong>−{formatNav(fundCalc.liabilities)}</strong>
                      </li>
                      <li className="total">
                        <span>{t("internal.nav.brNet")}</span>
                        <strong>{formatNav(fundCalc.netAssets)}</strong>
                      </li>
                      <li className="subtle">
                        <span>{t("internal.nav.brUnits")}</span>
                        <strong>{fundCalc.totalUnits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </li>
                      <li className="total">
                        <span>{t("internal.nav.brPerUnit")}</span>
                        <strong>
                          {fundCalc.navPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MNT
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
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => setTradeEntryOpen((current) => !current)}
                    >
                      {tradeEntryOpen ? "−" : "+"} {t("internal.trades.stockAdd")}
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
                  <form className="fm-form fm-card" onSubmit={onSubmitTradeConfirmation}>
                            {tradeEntryOpen ? (
                              <>
                                <div className="fm-field-grid">
                                  <label className="fm-field">
                                    <span>Security type</span>
                                    <input
                                      value={tradeForm.securityType}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, securityType: event.target.value }))
                                      }
                                      required
                                    />
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
                                    <input
                                      value={tradeForm.currency}
                                      onChange={(event) => setTradeForm((current) => ({ ...current, currency: event.target.value }))}
                                      required
                                    />
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
                                    <span>Settlement lag (days)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={tradeForm.settlementLag}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, settlementLag: event.target.value }))
                                      }
                                      required
                                    />
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
                                    <span>Portfolio class</span>
                                    <input
                                      value={tradeForm.portfolioClass}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, portfolioClass: event.target.value }))
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

                                  <label className="fm-field">
                                    <span>Stock split</span>
                                    <input
                                      value={tradeForm.stockSplit}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, stockSplit: event.target.value }))
                                      }
                                    />
                                  </label>

                                  <label className="fm-field fm-field-full">
                                    <span>Description</span>
                                    <textarea
                                      rows={2}
                                      value={tradeForm.description}
                                      onChange={(event) =>
                                        setTradeForm((current) => ({ ...current, description: event.target.value }))
                                      }
                                    />
                                  </label>
                                </div>

                                <button className="btn btn-accent fm-submit" type="submit">
                                  {t("internal.trades.submit")}
                                </button>
                              </>
                            ) : null}
                          </form>
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
                    const banks = fundBanks as BankAccount[];
                    const fxRates = fundInputs.fxRates as Record<string, number>;
                    const totalMnt = banks.reduce(
                      (sum, b) => sum + (b.currentBalance ?? 0) * (fxRates[b.currency] ?? 1),
                      0
                    );
                    return (
                      <>
                        <div className="fm-stats">
                          <article className="fm-stat-card primary">
                            <p>{t("internal.bank.totalBalance")}</p>
                            <strong>
                              {totalMnt.toLocaleString("en-US", { maximumFractionDigits: 0 })} MNT
                            </strong>
                          </article>
                          {banks.map((bank) => (
                            <article className="fm-stat-card" key={bank.accountNumber}>
                              <p>
                                {bank.alias} · {bank.accountNumber}
                              </p>
                              <strong>
                                {(bank.currentBalance ?? 0).toLocaleString("en-US", {
                                  maximumFractionDigits: 2
                                })}{" "}
                                {bank.currency}
                              </strong>
                            </article>
                          ))}
                        </div>

                        {banks.map((bank) => {
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
                                <span className="fm-topbar-tag">{bank.currency}</span>
                              </header>
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
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txns.slice(0, 25).map((tx, idx) => (
                                      <tr key={`${bank.accountNumber}-${idx}-${tx.date}`}>
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
                                      </tr>
                                    ))}
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
                        })}
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
                      className={`fm-segment-btn ${usersSegment === "workers" ? "active" : ""}`}
                      onClick={() => setUsersSegment("workers")}
                    >
                      {t("internal.users.segWorkers")}
                      <span className="fm-segment-count">{fundManagersDirectory.length}</span>
                    </button>
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
            </main>
          </div>

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
              <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
              <div>
                <p className="brand-name">Улаанбаатар Ассет Менежмент ҮЦК ХХК</p>
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
          <a className="brand" href="#home">
            <img src="/assets/ubam-logo.png" alt="UB Asset Management logo" />
            <div>
              <p className="brand-name">Улаанбаатар Ассет Менежмент ҮЦК ХХК</p>
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
              {aboutCards.map((card, index) => (
                <article key={`${card.title}-${index}`} className="about-card">
                    <h2>{card.title}</h2>
                    <p>{card.body}</p>
                </article>
              ))}
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

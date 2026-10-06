"use client";
import { useEdition } from "./edition-provider";
import { LanguageSwitcher } from "./language-switcher";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  Eye,
  Grid2X2,
  Home,
  Menu,
  Pause,
  Play,
  Radio,
  Search,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import type {
  ApexArticle,
  ApexShort,
  Category,
  NewsCategory,
  BroadcastProgramme,
} from "@/lib/types";
import { ArticleCard } from "./article-card";
import { Brand } from "./brand";
import { Hero } from "./hero";
import { BroadcastPanel } from "./broadcast-panel";
import { SectionHeading } from "./section-heading";
import { InformationLinks } from "./information-links";

type Props = {
  articles: ApexArticle[];
  categories: NewsCategory[];
  shorts: ApexShort[];
  broadcastProgramme: BroadcastProgramme;
};
type ModalContent = {
  title: string;
  body: string;
  image?: string;
  videoUrl?: string;
  kind?: "live" | "short" | "info";
};

export function Newsroom({
  articles,
  categories,
  shorts,
  broadcastProgramme,
}: Props) {
  const { locale, t, categoryLabel } = useEdition();
  const liveEdition =
    articles.length >= 3 &&
    articles.every((article) => article.contentOrigin === "localized");
  const [filter, setFilter] = useState<Category | "All">("All");
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tickerPaused, setTickerPaused] = useState(false);
  const [modal, setModal] = useState<ModalContent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const shortsRail = useRef<HTMLDivElement>(null);
  const rankedHeroes = articles
    .filter((a) => a.editorial?.heroRank !== undefined)
    .sort((a, b) => a.editorial!.heroRank! - b.editorial!.heroRank!);
  const heroSlides = (rankedHeroes.length ? rankedHeroes : articles).slice(
    0,
    3,
  );
  const heroIds = new Set(heroSlides.map((article) => article.id));
  const topStories = articles
    .filter((article) => !heroIds.has(article.id))
    .slice(0, 4);
  const specialArticle =
    articles.find((a) => a.editorial?.special) ?? articles[0];
  const trendingArticles = articles
    .filter((a) => a.editorial?.trendingRank !== undefined)
    .sort((a, b) => a.editorial!.trendingRank! - b.editorial!.trendingRank!)
    .slice(0, 4);
  const latest =
    filter === "All"
      ? [...articles].sort(
          (a, b) =>
            (a.editorial?.latestRank ?? 99) - (b.editorial?.latestRank ?? 99),
        )
      : articles.filter((a) => a.category === filter);
  const results = articles.filter((a) =>
    `${a.title} ${categoryLabel(a.category)} ${a.category} ${a.excerpt} ${a.tags?.join(" ") ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 65);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("reveal-ready");
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (searchOpen) {
      searchDialog.current?.showModal();
      searchDialog.current?.querySelector("input")?.focus();
    } else searchDialog.current?.close();
  }, [searchOpen]);
  useEffect(() => {
    if (modal || searchOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [modal, searchOpen]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  const openLive = () =>
    setModal({
      kind: "live",
      title: "Apex Live",
      body: t(
        "Aapka newsroom, har waqt. Yeh broadcast player ka preview hai. Live stream abhi connect nahi ki gayi hai. Studio ki tasveer AI-generated concept hai. Stream judne ke baad yahan live news aur programme details dikhenge.",
      ),
      image: "/images/studio-concept.webp",
    });
  const openInfo = (title: string, body: string) =>
    setModal({ title, body, kind: "info" });
  const chooseCategory = (category: Category | "All") => {
    setFilter(category);
    setExpanded(false);
    setMenu(false);
    document.getElementById("latest")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (!heroSlides.length)
    return (
      <main className="shell not-found">
        <Brand />
        <h1>{t("Newsroom taiyaar ho raha hai.")}</h1>
        <p>{t("Nayi kahaniyan jald yahan milengi.")}</p>
      </main>
    );

  return (
    <>
      <a className="skip-link" href="#main">
        {" "}
        {t("Seedha khabron par jaayein")}{" "}
      </a>
      <div className="utility">
        <div className="shell utility-inner">
          <span>
            <span className="utility-dot" />{" "}
            {liveEdition ? t("APEX NEWS INDIA · LIVE") : t("WEDNESDAY, 16 SEPTEMBER 2026")}{" "}
            <span className="utility-location">
              {" "}
              {liveEdition ? t("/ EDITORIALLY REVIEWED") : t("/ NEW DELHI")}
            </span>
          </span>
          <div>
            <span className="preview-label">
              {" "}
              {liveEdition
                ? t("LIVE EDITION · VERIFIED NEWS")
                : t("DESIGN PREVIEW · SAMPLE CONTENT")}{" "}
            </span>
            <button
              onClick={() =>
                openInfo(
                  t("The Apex Brief"),
                  t(
                    "Din ki zaroori khabrein, ek jagah. Newsletter ki taiyaari chal rahi hai; abhi email subscription shuru nahi hui hai.",
                  ),
                )
              }
            >
              {" "}
              {t("Newsletter")} <ArrowUpRight size={11} />
            </button>
            <a href="#footer">{t("About Apex")}</a>
          </div>
        </div>
      </div>
      <header className={`header ${compact ? "compact" : ""}`}>
        <div className="shell brandrow">
          <Brand />
          <div className="header-manifesto">
            {" "}
            {t("Bharat ki awaaz.")} <br />
            <b>{t("Aapke andaaz mein.")}</b>
          </div>
          <button
            className="search-trigger"
            aria-label={t("Search stories")}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={17} />
            <span>{t("Kya dhoondh rahe hain?")}</span>
            <span className="search-key">↵</span>
          </button>
          <button className="live-button" onClick={openLive}>
            <span className="live-dot" /> {t("LIVE TV")}{" "}
            <ArrowUpRight size={16} />
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label={menu ? t("Close menu") : t("Open menu")}
            aria-expanded={menu}
            aria-controls="mega-menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <div className="shell edition-switch-row">
          <LanguageSwitcher />
        </div>
        <div className="nav-wrap">
          <nav className="shell main-nav" aria-label={t("Main navigation")}>
            <a href="#main" className="nav-home">
              {" "}
              {t("Home")}{" "}
            </a>
            {categories.slice(0, 5).map((cat) => (
              <button key={cat.label} onClick={() => chooseCategory(cat.name)}>
                {cat.label}
              </button>
            ))}
            <button onClick={() => chooseCategory("Entertainment")}>
              {" "}
              {t("Entertainment")}{" "}
            </button>
            <button onClick={() => chooseCategory("Technology")}>
              {" "}
              {t("Technology")}{" "}
            </button>
            <button onClick={() => chooseCategory("North East")}>
              {" "}
              {t("North East")}{" "}
            </button>
            <a href="#shorts">{t("Videos")}</a>
            <button
              className="more-menu"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="mega-menu"
            >
              {" "}
              {t("More")} <ChevronDown size={13} />
            </button>
            <a className="nav-special" href="#special">
              <Zap size={13} /> {t("SPECIAL COVERAGE")}{" "}
            </a>
          </nav>
        </div>
        {menu && (
          <div id="mega-menu" className="mega-menu shell">
            <div>
              <span className="eyebrow">{t("EXPLORE APEX")}</span>
              <h2>
                {" "}
                {t("Har nazariye se.")} <br /> {t("Har khabar tak.")}{" "}
              </h2>
              <button
                className="text-link"
                onClick={() => {
                  setMenu(false);
                  setSearchOpen(true);
                }}
              >
                {" "}
                {t("Search stories")} <Search size={16} />
              </button>
            </div>
            <div className="mega-categories">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => chooseCategory(cat.name)}
                >
                  <span>
                    {cat.label}
                    <small>{cat.subtitle}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <button
              className="icon-button menu-close"
              aria-label={t("Close navigation")}
              onClick={() => setMenu(false)}
            >
              <X size={19} />
            </button>
          </div>
        )}
      </header>
      <div className="ticker">
        <div className="shell ticker-inner">
          <span className="ticker-label">
            <Zap size={15} fill="currentColor" /> {t("BREAKING")}{" "}
            <span>{t("NEWS")}</span>
          </span>
          <div className={`ticker-window ${tickerPaused ? "paused" : ""}`}>
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div
                  className="ticker-items"
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {articles.slice(1, 4).map((article) => (
                    <Link
                      tabIndex={copy === 1 ? -1 : undefined}
                      key={article.id}
                      href={article.alternatePaths[locale]}
                    >
                      <span />
                      {article.title}
                      <ArrowUpRight size={12} />
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button
            className="ticker-pause"
            aria-label={
              tickerPaused
                ? t("Resume breaking ticker")
                : t("Pause breaking ticker")
            }
            onClick={() => setTickerPaused(!tickerPaused)}
          >
            {tickerPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>
        </div>
      </div>
      <main id="main" className="shell">
        <div className="edition-line">
          <span>
            <i /> {t("THE APEX EDIT")}{" "}
          </span>
          <span>{t("Khabar ke aage. Sach ke kareeb.")}</span>
          <span className="edition-number">
            {liveEdition ? t("LIVE NEWSROOM") : t("EDITION 001 / 16.09.26")}
          </span>
        </div>
        <section className="lead-grid" aria-label={t("Lead stories")}>
          <Hero slides={heroSlides} />
          <aside className="top-stories">
            <div className="rail-heading">
              <h2>
                {" "}
                {t("Top stories")}
                <span>.</span>
              </h2>
              <span>{t("THE NEWSROOM EDIT")}</span>
            </div>
            <div className="top-story-list">
              {topStories.map((article, i) => (
                <Link
                  className="top-story"
                  key={article.id}
                  href={article.alternatePaths[locale]}
                >
                  <span className="story-number">0{i + 1}</span>
                  <div>
                    <span className="eyebrow">
                      {categoryLabel(article.category)}
                    </span>
                    <h3>{article.title}</h3>
                    <span className="meta">
                      <Clock3 size={10} /> {article.readMinutes} {t("MIN READ")}{" "}
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                  <div className="top-story-image">
                    <Image
                      src={article.featuredImage}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 88px, 100px"
                    />
                  </div>
                </Link>
              ))}
            </div>
            <button
              className="rail-footer"
              onClick={() => chooseCategory("All")}
            >
              {" "}
              {t("Saari khabrein dekhein")} <ArrowRight size={16} />
            </button>
          </aside>
        </section>
        <BroadcastPanel onOpen={openLive} programme={broadcastProgramme} />
        <section id="latest" className="section reveal">
          <SectionHeading
            kicker={t("THE STORIES THAT MATTER")}
            title={t("Latest news")}
          >
            <button
              className="text-link"
              onClick={() => {
                setFilter("All");
                setExpanded(!expanded);
              }}
            >
              {expanded ? t("Show less") : t("All stories")}{" "}
              <ArrowUpRight size={16} />
            </button>
          </SectionHeading>
          <div className="filter-row" aria-label={t("Filter news by category")}>
            {(["All", ...categories.map((c) => c.name)] as const).map((cat) => (
              <button
                aria-pressed={filter === cat}
                className={filter === cat ? "selected" : ""}
                key={cat}
                onClick={() => {
                  setFilter(cat);
                  setExpanded(false);
                }}
              >
                {cat === "All" ? t("For you") : categoryLabel(cat)}
              </button>
            ))}
          </div>
          <div
            className={`latest-grid ${latest.length === 1 ? "single-result" : ""}`}
            aria-live="polite"
          >
            {latest.slice(0, expanded ? latest.length : 5).map((article, i) => (
              <ArticleCard
                article={article}
                featured={i === 0}
                key={article.id}
              />
            ))}
          </div>
          {filter !== "All" && (
            <p className="filter-caption">
              {latest.length} {t("sample stories in")} {categoryLabel(filter)}{" "}
              <button onClick={() => setFilter("All")}>
                {" "}
                {t("Clear filter")} <X size={12} />
              </button>
            </p>
          )}
        </section>
        <section id="categories" className="section category-section reveal">
          <SectionHeading
            kicker={t("FOLLOW YOUR CURIOSITY")}
            title={t("A world of perspectives")}
          >
            <span className="section-note">
              {t("Har dilchaspi ki apni duniya.")}
            </span>
          </SectionHeading>
          <div className="category-grid">
            {categories.slice(0, 6).map((cat, i) => (
              <button
                className="category-tile"
                key={cat.label}
                onClick={() => chooseCategory(cat.name)}
              >
                <Image
                  src={cat.image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 42vw, 18vw"
                />
                <span className="category-index">0{i + 1}</span>
                <div>
                  <span>{cat.subtitle}</span>
                  <h3>{cat.label}</h3>
                </div>
                <ArrowUpRight className="category-arrow" size={19} />
              </button>
            ))}
          </div>
        </section>
        <section id="shorts" className="section shorts-section reveal">
          <SectionHeading
            kicker={t("LESS SCROLL. MORE STORY.")}
            title={t("Apex Shorts")}
          >
            <div className="shorts-controls">
              <span className="section-note">
                {t("Badi khabar. Ek minute mein.")}
              </span>
              <button
                className="icon-button"
                aria-label={t("Previous shorts")}
                onClick={() =>
                  shortsRail.current?.scrollBy({
                    left: -300,
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "auto"
                      : "smooth",
                  })
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={t("Next shorts")}
                onClick={() =>
                  shortsRail.current?.scrollBy({
                    left: 300,
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "auto"
                      : "smooth",
                  })
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </SectionHeading>
          <div className="shorts-rail" ref={shortsRail}>
            {shorts.map((short) => (
              <button
                key={short.id}
                className="short-card"
                onClick={() =>
                  setModal({
                    kind: "short",
                    title: short.title,
                    body: `${short.description} ${t("Yeh Short ka editorial preview hai. Video jald aayega.")}`,
                    image: short.image,
                    videoUrl: short.videoUrl,
                  })
                }
              >
                <Image
                  src={short.image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 62vw, 20vw"
                  style={{ objectPosition: short.imagePosition }}
                />
                <span className="short-top">
                  <span className="short-brand">
                    {" "}
                    {t("A")}
                    <span>/</span>
                  </span>
                  <span className="short-duration">{short.duration}</span>
                </span>
                <span className="short-play">
                  <Play size={21} fill="currentColor" />
                </span>
                <span className="short-progress" aria-hidden="true" />
                <span className="short-copy">
                  <span className="eyebrow">
                    {categoryLabel(short.category)}
                  </span>
                  <strong>{short.title}</strong>
                  <span className="short-meta">
                    <Eye size={13} />{" "}
                    {short.views === undefined
                      ? t("VIDEO PREVIEW")
                      : `${new Intl.NumberFormat("en", { notation: "compact" }).format(short.views)} ${short.sampleViews ? t("DEMO VIEWS") : t("VIEWS")}`}{" "}
                    <ArrowUpRight size={15} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="deep-dive section reveal">
          <div id="special" className="special-coverage">
            <Image
              src="/images/india.jpg"
              alt={t("Taj Mahal ka nazara")}
              fill
              sizes="(max-width: 1000px) 100vw, 65vw"
            />
            <div className="special-shade" />
            <span className="special-coordinate">
              {" "}
              {t("THE REPUBLIC / THE ROAD AHEAD")}{" "}
            </span>
            <div className="special-top">
              <span className="badge outline">
                {t("APEX SPECIAL COVERAGE")}
              </span>
              <span>{t("THE LONG VIEW / 01")}</span>
            </div>
            <div className="special-copy">
              <div className="eyebrow">{t("A NATION IN THE MAKING")}</div>
              <h2>
                {" "}
                {t("INDIA")}
                <span>2047</span>
                <i>.</i>
              </h2>
              <p>
                {" "}
                {t("Ek desh. Ek sapna.")} <br />{" "}
                {t("Anant sambhavnayein.")}{" "}
              </p>
              <span className="special-deck">
                {" "}
                {t(
                  "Policy. People. Progress. Bharat ke agle adhyay ki poori tasveer.",
                )}{" "}
              </span>
              <Link
                href={specialArticle.alternatePaths[locale]}
                className="white-button"
              >
                {" "}
                {t("Explore the big picture")} <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="special-tags">
              <button onClick={() => chooseCategory("Politics")}>
                <span>
                  <small>{t("01 / THE MANDATE")}</small>
                  {t("Elections")}{" "}
                </span>{" "}
                <ArrowUpRight size={15} />
              </button>
              <button onClick={() => chooseCategory("Business")}>
                <span>
                  <small>{t("02 / THE MOMENTUM")}</small>
                  {t("The economy")}{" "}
                </span>{" "}
                <ArrowUpRight size={15} />
              </button>
              <button onClick={() => chooseCategory("Technology")}>
                <span>
                  <small>{t("03 / THE POSSIBILITY")}</small>
                  {t("Future of India")}{" "}
                </span>{" "}
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
          <aside className="trending">
            <SectionHeading
              kicker={t("IN THE CONVERSATION")}
              title={t("Trending now")}
            />
            <div>
              {trendingArticles.map((article, i) => (
                <Link
                  href={article.alternatePaths[locale]}
                  key={article.id}
                  className="trending-story"
                >
                  <span>0{i + 1}</span>
                  <div>
                    <span className="eyebrow">
                      {categoryLabel(article.category)}
                    </span>
                    <h3>{article.title}</h3>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
            <span className="trend-caption">
              <Zap size={12} /> {t("CURATED BY THE APEX NEWS DESK")}{" "}
            </span>
          </aside>
        </section>
        <section className="app-promo reveal">
          <div className="app-monogram">
            <Image
              src="/apex-logo.png"
              alt={t("Apex app icon")}
              width={80}
              height={80}
            />
            <span className="app-notification">
              <Bell size={13} fill="currentColor" />
            </span>
          </div>
          <div>
            <span className="eyebrow">{t("YOUR WORLD. IN YOUR POCKET.")}</span>
            <h2>{t("Khabar saath rakhiye.")}</h2>
            <p>
              {t(
                "Breaking alerts, live coverage aur aapki pasand ki khabrein.",
              )}
            </p>
          </div>
          <div className="app-actions">
            <button
              onClick={() =>
                openInfo(
                  t("Apex app — coming soon"),
                  t(
                    "Apex ka mobile app taiyaar ho raha hai. App Store aur Google Play ke download links launch ke baad yahan milenge. Tab tak mobile browser mein poora Apex experience dekhiye.",
                  ),
                )
              }
            >
              <Smartphone size={21} />
              <span>
                <small>{t("COMING SOON ON")}</small>
                {t("iOS & Android")}{" "}
              </span>
              <ArrowUpRight size={16} />
            </button>
            <span>{t("No noise. Just news that matters.")}</span>
          </div>
        </section>
      </main>
      <footer id="footer" className="footer">
        <div className="shell">
          <div className="footer-network-heading">
            <span className="eyebrow">
              <Radio size={13} /> {t("THE APEX NEWSROOM NETWORK")}{" "}
            </span>
            <span>{t("ONE NEWSROOM. EVERY PERSPECTIVE.")}</span>
          </div>
          <div
            className="footer-network"
            aria-label={t("Apex network formats")}
          >
            <a href="#latest">
              <span>{t("01 / READ")}</span>
              <strong>{t("The daily briefing")}</strong>
              <ArrowUpRight size={21} />
            </a>
            <button onClick={openLive}>
              <span>{t("02 / WATCH")}</span>
              <strong>
                {" "}
                {t("Apex Live")} <i className="live-dot" />
              </strong>
              <ArrowUpRight size={21} />
            </button>
            <a href="#shorts">
              <span>{t("03 / DISCOVER")}</span>
              <strong>{t("Stories in a minute")}</strong>
              <ArrowUpRight size={21} />
            </a>
            <a href="#special">
              <span>{t("04 / UNDERSTAND")}</span>
              <strong>{t("The bigger picture")}</strong>
              <ArrowUpRight size={21} />
            </a>
          </div>
          <div className="footer-top">
            <div>
              <Brand />
              <p>
                {" "}
                {t("Bharat ki har badi khabar.")} <br />{" "}
                {t("Seedhi, saaf aur aapke andaaz mein.")}{" "}
              </p>
              <span className="footer-edition">
                <span /> {t("A NEW PERSPECTIVE. THE SAME COMMITMENT.")}{" "}
              </span>
            </div>
            <div className="footer-links">
              <h3>{t("THE NEWSROOM")}</h3>
              {(["India", "Politics", "World", "Business"] as Category[]).map(
                (cat) => (
                  <button key={cat} onClick={() => chooseCategory(cat)}>
                    {categoryLabel(cat)}
                  </button>
                ),
              )}
            </div>
            <div className="footer-links">
              <h3>{t("WATCH & EXPLORE")}</h3>
              <button onClick={openLive}>
                {" "}
                {t("Apex Live")} <span className="live-dot" />
              </button>
              <a href="#shorts">{t("Apex Shorts")}</a>
              <a href="#special">{t("Special Coverage")}</a>
              <a href="#categories">{t("All Categories")}</a>
            </div>
            <div className="footer-brief">
              <span className="eyebrow">{t("THE APEX BRIEF")}</span>
              <h3>{t("Stay a story ahead.")}</h3>
              <p>{t("Din ki zaroori khabrein. Seedha aap tak.")}</p>
              <button
                className="text-link"
                onClick={() =>
                  openInfo(
                    t("The Apex Brief"),
                    t(
                      "Hamari daily newsletter jald aa rahi hai. Yeh subscription preview hai; abhi email addresses collect nahi kiye ja rahe hain.",
                    ),
                  )
                }
              >
                {" "}
                {t("Newsletter · Coming soon")} <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>{t("© 2026 Apex News India. All rights reserved.")}</span>
            <div>
              <InformationLinks locale={locale} />
              <button
                onClick={() =>
                  openInfo(
                    t("Editorial approach"),
                    t(
                      "Is prototype mein sample headlines aur prateekatmak photographs hain. Verified stories, source attribution aur corrections workflow publishing integration ke saath jode jaayenge.",
                    ),
                  )
                }
              >
                {" "}
                {t("Editorial policy")}{" "}
              </button>
              <a href="#main">{t("Back to top ↑")}</a>
            </div>
          </div>
          <p className="demo-disclosure">
            {" "}
            {t(
              "Independent frontend preview. Stories and broadcast states are illustrative. Photography is representative.",
            )}{" "}
          </p>
        </div>
      </footer>
      <nav className="mobile-bottom" aria-label={t("Mobile navigation")}>
        <a href="#main">
          <Home size={19} />
          <span>{t("Home")}</span>
        </a>
        <button onClick={() => setSearchOpen(true)}>
          <Search size={19} />
          <span>{t("Search")}</span>
        </button>
        <button className="mobile-live" onClick={openLive}>
          <span>
            <Play size={20} fill="currentColor" />
          </span>
          <b>{t("Live TV")}</b>
        </button>
        <a href="#shorts">
          <CirclePlay size={19} />
          <span>{t("Shorts")}</span>
        </a>
        <a href="#categories">
          <Grid2X2 size={19} />
          <span>{t("Explore")}</span>
        </a>
      </nav>
      <dialog
        ref={dialog}
        className={`content-dialog ${modal?.kind === "short" ? "short-dialog" : ""}`}
        onClose={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        aria-labelledby="modal-title"
      >
        <button
          className="dialog-close icon-button"
          aria-label={t("Close preview")}
          onClick={() => setModal(null)}
        >
          <X size={21} />
        </button>
        {modal?.videoUrl ? (
          <video
            className="modal-video"
            controls
            playsInline
            poster={modal.image}
            src={modal.videoUrl}
          >
            <track kind="captions" />{" "}
            {t("Your browser does not support video playback.")}{" "}
          </video>
        ) : (
          modal?.image && (
            <div className="modal-image">
              <Image
                src={modal.image}
                alt={t("Editorial preview")}
                fill
                sizes="(max-width: 700px) 95vw, 640px"
              />
              <span className="modal-preview">
                <Radio size={19} />{" "}
                {modal.kind === "live"
                  ? t("STREAM NOT CONNECTED")
                  : t("VIDEO COMING SOON")}
              </span>
            </div>
          )
        )}
        <div className="modal-body">
          <span className="eyebrow">{t("APEX / PREVIEW")}</span>
          <h2 id="modal-title">{modal?.title}</h2>
          <p>{modal?.body}</p>
          <button className="primary-button" onClick={() => setModal(null)}>
            {" "}
            {t("Samajh gaye")} <Check size={17} />
          </button>
        </div>
      </dialog>
      <dialog
        ref={searchDialog}
        className="search-dialog"
        onClose={() => setSearchOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSearchOpen(false);
        }}
        aria-labelledby="search-title"
      >
        <div className="search-dialog-header">
          <h2 id="search-title">
            {" "}
            {t("Khabar dhoondhiye")}
            <span>.</span>
          </h2>
          <button
            className="icon-button"
            aria-label={t("Close search")}
            onClick={() => setSearchOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <label className="search-input">
          <Search size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("India, cricket, AI…")}
            aria-label={t("Search stories")}
          />
          {query && (
            <button
              className="icon-button"
              aria-label={t("Clear search")}
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <p className="search-count" aria-live="polite">
          {query
            ? `${results.length} ${t("stories found")}`
            : t("EXPLORE THE NEWSROOM")}
        </p>
        <div className="search-results">
          {results.length ? (
            results.map((article) => (
              <Link
                onClick={() => setSearchOpen(false)}
                key={article.id}
                href={article.alternatePaths[locale]}
              >
                <div>
                  <span className="eyebrow">
                    {categoryLabel(article.category)}
                  </span>
                  <h3>{article.title}</h3>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            ))
          ) : (
            <div className="search-empty">
              <Search size={28} />
              <h3>{t("Yeh khabar abhi nahi mili.")}</h3>
              <p>{t("Doosra keyword ya category try kijiye.")}</p>
              <button className="text-link" onClick={() => setQuery("")}>
                {" "}
                {t("Saari stories dekhein")} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

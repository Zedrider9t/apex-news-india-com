"use client";
import { useEdition } from "./edition-provider";
import { EditorialImage as Image } from "./editorial-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pause,
  Play,
} from "lucide-react";
import type { ApexArticle } from "@/lib/types";
export function Hero({ slides: heroSlides }: { slides: ApexArticle[] }) {
  const { locale, t, categoryLabel } = useEdition();
  const [activeHero, setActiveHero] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);
  const hero = heroSlides[activeHero] ?? heroSlides[0];
  if (!hero) return null;
  return (
    <div
      ref={heroRef}
      className={`hero ${motionPaused || !visible ? "motion-paused" : ""}`}
    >
      <div className="hero-visual" key={hero.id}>
        <Image
          src={hero.featuredImage}
          alt={hero.imageAlt}
          fill
          sizes="(max-width: 1000px) 100vw, 70vw"
          preload={activeHero === 0}
        />
        <div className="hero-shade" />
        <div className="hero-light" />
      </div>
      <div className="hero-topline">
        <span className="badge">{t("THE BIG STORY")}</span>
        <span className="hero-edition">
          <i /> {t("APEX / IN FOCUS")}{" "}
        </span>
      </div>
      <div className="hero-copy" key={`copy-${hero.id}`}>
        <div className="hero-category">
          <span /> {categoryLabel(hero.category).toUpperCase()}{" "}
          <span className="hero-category-rule" /> {t("THE NEXT CHAPTER")}{" "}
        </div>
        <h1>{hero.title}</h1>
        <p>{hero.excerpt}</p>
        <div className="hero-actions">
          <Link className="primary-button" href={hero.alternatePaths[locale]}>
            {" "}
            {t("Poori kahani")} <ArrowUpRight size={18} />
          </Link>
          <span>
            <Clock3 size={13} /> {hero.readMinutes} {t("MIN READ")} <i />{" "}
            {t("APEX NEWS DESK")}{" "}
          </span>
        </div>
      </div>
      <div className="hero-bottom">
        <div className="slide-index">
          <b>{String(activeHero + 1).padStart(2, "0")}</b>
          <span>/ {String(heroSlides.length).padStart(2, "0")}</span>
          <div className="slide-dots">
            {heroSlides.map((slide, i) => (
              <button
                key={slide.id}
                aria-label={`${t("Show story")} ${i + 1}: ${slide.title}`}
                aria-pressed={i === activeHero}
                onClick={() => setActiveHero(i)}
                className={i === activeHero ? "active" : ""}
              />
            ))}
          </div>
        </div>
        <div className="carousel-buttons">
          <button
            className="hero-motion-toggle"
            aria-label={
              motionPaused ? t("Resume hero motion") : t("Pause hero motion")
            }
            aria-pressed={motionPaused}
            onClick={() => setMotionPaused(!motionPaused)}
          >
            {motionPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            aria-label={t("Previous headline")}
            onClick={() =>
              setActiveHero(
                (activeHero - 1 + heroSlides.length) % heroSlides.length,
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label={t("Next headline")}
            onClick={() => setActiveHero((activeHero + 1) % heroSlides.length)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

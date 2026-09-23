"use client";
import { useEdition } from "./edition-provider";
import Image from "next/image";
import { ArrowUpRight, Play, Radio, Volume2, Clock3 } from "lucide-react";
import type { BroadcastProgramme } from "@/lib/types";
export function BroadcastPanel({
  onOpen,
  programme,
}: {
  onOpen: () => void;
  programme: BroadcastProgramme;
}) {
  const { t } = useEdition();
  return (
    <section id="live" className="broadcast-section reveal">
      <div className="broadcast-identity">
        <span>
          <Radio size={13} /> {t("APEX BROADCAST")}{" "}
        </span>
        <span>{t("THE NEWSROOM / NEW DELHI")}</span>
        <span className="signal-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <button
        className="broadcast-screen"
        onClick={onOpen}
        aria-label={t("Open Apex Live broadcast preview")}
      >
        <Image
          src="/images/studio-concept.webp"
          alt={t("AI-generated broadcast studio concept")}
          fill
          sizes="(max-width: 700px) 100vw, 50vw"
        />
        <div className="broadcast-grid" />
        <span className="broadcast-live">
          <span className="live-dot" /> {t("LIVE")}{" "}
          <small>{programme.isPreview ? t("PREVIEW") : ""}</small>
        </span>
        <span className="broadcast-quality">{t("HD / 16:9")}</span>
        <div className="broadcast-title">
          <span>{t("THE NATION.")}</span>
          <strong>
            {" "}
            {t("IN FOCUS")}
            <span>.</span>
          </strong>
          <small>{t("FROM THE APEX NEWSROOM")}</small>
        </div>
        <span className="broadcast-play">
          <Play size={26} fill="currentColor" />
        </span>
        <span className="broadcast-lower">
          <b>{t("APEX")}</b> {t("HAR KHABAR. HAR NAZAR.")} <Volume2 size={14} />
        </span>
      </button>
      <div className="broadcast-info">
        <div className="eyebrow">{t("YOUR FRONT ROW TO THE NEWS")}</div>
        <h2>
          {" "}
          {t("Watch")} <span>{t("Apex Live.")}</span>
        </h2>
        <p>
          {" "}
          {t("Desh ki har badi khabar, seedha newsroom se.")} <br />{" "}
          {t("Ground reports. Seedhe sawaal. Saaf nazariya.")}{" "}
        </p>
        <div className="show-info">
          <span className="show-label">
            <span className="live-dot" />{" "}
            {programme.isPreview
              ? t("FEATURED SHOW / SAMPLE RUNDOWN")
              : t("ON AIR NOW")}
          </span>
          <h3>{programme.title}</h3>
          <p>
            {programme.description}{" "}
            <span>
              {t("with")} {programme.anchor}
            </span>
          </p>
          <div className="show-time">
            <Clock3 size={12} /> {programme.slot}
          </div>
        </div>
        <div className="broadcast-actions">
          <button className="primary-button" onClick={onOpen}>
            <Play size={13} fill="currentColor" /> {t("Open broadcast")}{" "}
            <ArrowUpRight size={17} />
          </button>
          <span>
            {" "}
            {t("Studio concept")} <br /> {t("Stream coming soon")}{" "}
          </span>
        </div>
      </div>
      <div className="broadcast-schedule">
        <span className="schedule-label">{t("UP NEXT")}</span>
        <strong>{programme.nextTitle}</strong>
        <span>{programme.nextSlot}</span>
        <span className="schedule-rule" />
        <small>
          {programme.isPreview
            ? t("ILLUSTRATIVE PROGRAMME SCHEDULE")
            : t("ALL TIMES IN IST")}
        </small>
      </div>
    </section>
  );
}

"use client";
import { useEdition } from "./edition-provider";
import { ArrowUpRight, Play, Radio, Clock3, Maximize2 } from "lucide-react";
import type { BroadcastProgramme } from "@/lib/types";
import { LivePlayer } from "./live-player";
import { APEX_LIVE_HLS_URL } from "@/lib/live";
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
      <div className="broadcast-screen broadcast-live-player">
        <LivePlayer src={APEX_LIVE_HLS_URL} />
        <span className="broadcast-live">
          <span className="live-dot" /> {t("LIVE")}
        </span>
        <span className="broadcast-quality">{t("HD / 16:9")}</span>
        <button
          type="button"
          className="broadcast-expand"
          onClick={onOpen}
          aria-label={t("Open Apex Live broadcast preview")}
        >
          <Maximize2 size={17} />
        </button>
      </div>
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
            {t("Studio concept")} <br /> {t("Live stream")}{" "}
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

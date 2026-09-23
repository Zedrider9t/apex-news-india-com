"use client";
import { useEdition } from "./edition-provider";
import Image from "next/image";
import Link from "next/link";
export function Brand() {
  const { locale, t } = useEdition();
  return (
    <Link
      href={`/${locale}`}
      className="brand"
      aria-label={t("Apex News India home")}
    >
      <Image src="/apex-logo.png" alt="" width={52} height={52} />
      <span>
        <strong>
          {" "}
          {t("APEX NEWS INDIA")}
          <span className="brand-period">.</span>
        </strong>
        <small>
          {locale === "en" ? "ENGLISH EDITION" : "ROMAN HINDI EDITION"} <i />{" "}
          {t("INDEPENDENT PERSPECTIVE")}{" "}
        </small>
      </span>
    </Link>
  );
}

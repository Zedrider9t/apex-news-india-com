import { Brand } from "./brand";
import { InformationLinks } from "./information-links";
import type { Locale } from "@/lib/types";
import { informationUi } from "@/lib/information-content";

export function InformationFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="footer information-footer">
      <div className="shell">
        <div className="information-footer-top">
          <div>
            <Brand />
            <p>
              {locale === "en"
                ? "Clear news. A wider perspective."
                : "Saaf khabrein. Naya nazariya."}
            </p>
          </div>
          <div>
            <span className="eyebrow">{informationUi[locale].explore}</span>
            <InformationLinks locale={locale} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>{informationUi[locale].copyright}</span>
          <span>
            APEX NEWS INDIA ·{" "}
            {locale === "en" ? "ENGLISH EDITION" : "ROMAN HINDI EDITION"}
          </span>
        </div>
      </div>
    </footer>
  );
}

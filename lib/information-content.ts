import type { Locale, Localized } from "./types";

export const informationSlugs = [
  "privacy-policy",
  "terms",
  "contact",
  "about",
  "support",
] as const;
export type InformationSlug = (typeof informationSlugs)[number];

export function isInformationSlug(value: string): value is InformationSlug {
  return informationSlugs.includes(value as InformationSlug);
}

export function informationPath(locale: Locale, slug: InformationSlug) {
  return `/${locale}/${slug}`;
}

export function informationAlternates(
  slug: InformationSlug,
): Localized<string> {
  return {
    en: informationPath("en", slug),
    roman: informationPath("roman", slug),
  };
}

export type ContactPurpose =
  "general" | "editorial" | "corrections" | "privacy" | "support";
export const contactPurposeOrder: ContactPurpose[] = [
  "general",
  "editorial",
  "corrections",
  "privacy",
  "support",
];
export type VerifiedContactChannel = {
  purpose: ContactPurpose;
  label: string;
  href: `mailto:${string}` | `tel:${string}` | `https://${string}`;
};
// Publish a channel only after the newsroom confirms it. No public contact method
// was present in the project when these pages were authored.
export const verifiedContactChannels: VerifiedContactChannel[] = [];

export interface InformationSection {
  heading: string;
  paragraphs: string[];
}
export interface InformationPageCopy {
  label: string;
  title: string;
  description: string;
  deck: string;
  sections: InformationSection[];
  effectiveDate?: string;
}

export const informationUi: Localized<{
  home: string;
  back: string;
  explore: string;
  effectiveDate: string;
  contactMissing: string;
  contactLabel: string;
  supportCta: string;
  copyright: string;
}> = {
  en: {
    home: "Home",
    back: "Back to newsroom",
    explore: "Explore Apex",
    effectiveDate: "Effective date",
    contactMissing:
      "A verified public contact channel has not yet been published. This page will display only newsroom-approved contact details when they become available.",
    contactLabel: "Verified contact channel",
    supportCta: "Contact support",
    copyright: "© 2026 Apex News India. All rights reserved.",
  },
  roman: {
    home: "Home",
    back: "Newsroom par wapas",
    explore: "Apex ko jaanein",
    effectiveDate: "Laagu hone ki tareekh",
    contactMissing:
      "Abhi tak koi tasdeeq-shuda public contact channel publish nahin hua hai. Jaise hi newsroom ki manzoori milegi, yahan sirf wahi contact details dikhengi.",
    contactLabel: "Tasdeeq-shuda contact channel",
    supportCta: "Support se sampark karein",
    copyright: "© 2026 Apex News India. Sabhi adhikaar surakshit.",
  },
};

export const informationContent: Localized<
  Record<InformationSlug, InformationPageCopy>
> = {
  en: {
    "privacy-policy": {
      label: "PRIVACY / APEX NEWS INDIA",
      title: "Privacy Policy",
      description:
        "How Apex News India handles information across its website and mobile app, including local storage, notifications and third-party media.",
      deck: "This policy explains the information involved when you use the Apex News India website and mobile application, and the choices available to you.",
      effectiveDate: "23 September 2026",
      sections: [
        {
          heading: "Scope and information we process",
          paragraphs: [
            "Apex News India provides news through its website and mobile app. To deliver pages, stories and media, our services and their infrastructure may process basic technical and network information, such as an IP address, browser or device details, request times and connection diagnostics. This information can be needed to operate, secure and troubleshoot the service.",
            "If you choose to contact us, we may process the information you provide, such as your name, contact details, the article or issue you identify and your message, so that we can respond. Please avoid sending sensitive information unless it is necessary for your request.",
          ],
        },
        {
          heading: "Information the current app does not request",
          paragraphs: [
            "The current app does not require account registration, collect payment information or require location permission. It does not currently use a production advertising SDK or a user analytics system unless one is separately configured in a future release. This does not mean that no technical information is processed to provide the service.",
          ],
        },
        {
          heading: "Local storage and edition choice",
          paragraphs: [
            "The mobile app stores bookmarks, English or Roman Hindi preference, and notification preferences locally on your device. The website remembers your edition choice using a first-party preference cookie. You can change your edition in the site or app; clearing browser or app data, or removing the app, may remove locally stored choices and bookmarks.",
          ],
        },
        {
          heading: "Notifications",
          paragraphs: [
            "The app may ask for notification permission only when you choose to enable notifications. You can change notification preferences in the app and manage permission in your device settings. If notifications are enabled, platform notification services may process technical information needed for delivery. Disabling permission stops those device notifications.",
          ],
        },
        {
          heading: "Third-party services and external links",
          paragraphs: [
            "News content is loaded from Apex News India services. Some pages or app views may display embedded media from providers such as YouTube. Opening or playing third-party media may allow that provider to receive technical information and apply its own privacy terms. Links to other websites and services are governed by their own policies.",
            "The app also relies on Expo, Apple and Google infrastructure for app functionality and distribution. Their processing is subject to their applicable terms and privacy policies. We do not control those independent services.",
          ],
        },
        {
          heading: "Security and retention",
          paragraphs: [
            "We use reasonable safeguards appropriate to the service, but no internet service or storage method can be guaranteed completely secure. Device-held choices and bookmarks remain until you clear them, reset app data or remove the app, subject to your device's own backup behavior. Technical records and correspondence may be kept for as long as reasonably needed for service operation, security, responding to requests or legal obligations; a fixed retention period is not asserted here.",
          ],
        },
        {
          heading: "Children's privacy",
          paragraphs: [
            "The service is a general news product and is not designed specifically for children. If a parent or guardian believes a child has sent us personal information, they can use the Contact page to request a review.",
          ],
        },
        {
          heading: "Your choices and privacy requests",
          paragraphs: [
            "You can change language and notification settings, remove locally saved bookmarks and use device or browser controls to clear local data. Depending on applicable law, you may also request access, correction or deletion of personal information we hold, or raise a privacy concern. Please use the Contact page for privacy requests. We may need enough information to identify the relevant request and may retain information where law requires it.",
          ],
        },
        {
          heading: "Changes and contact",
          paragraphs: [
            "We may update this policy when the service changes, including if we introduce analytics, advertising, login, personalization or other features. Material changes will be reflected here with a revised effective date. For privacy questions or requests, visit the Contact page. We publish contact details there only after they are verified and approved.",
          ],
        },
      ],
    },
    terms: {
      label: "TERMS / APEX NEWS INDIA",
      title: "Terms & Conditions",
      description:
        "Terms for using the Apex News India website and mobile app, including news content, live video, third-party links and corrections.",
      deck: "These terms describe the conditions for using the Apex News India website and mobile application.",
      effectiveDate: "23 September 2026",
      sections: [
        {
          heading: "Using the service",
          paragraphs: [
            "By using the Apex News India website or app, you agree to use it lawfully and in line with these terms. If you do not agree, please stop using the service. News and other material are provided for general information and may change as events develop.",
          ],
        },
        {
          heading: "Availability",
          paragraphs: [
            "We aim to keep the service available, but do not promise uninterrupted, error-free or continuous access. We may change, suspend or remove features or content for editorial, technical, rights or operational reasons.",
          ],
        },
        {
          heading: "Editorial updates and corrections",
          paragraphs: [
            "Reports may be updated, corrected or withdrawn as new information is verified. Publication time and later revisions may differ. If you believe a story needs correction, use the Contact page and include the article link and the specific concern.",
          ],
        },
        {
          heading: "Intellectual property",
          paragraphs: [
            "The site's and app's original text, design, branding and other owned material are protected by applicable intellectual-property laws. Some images, video, quotes and third-party material belong to their respective rights holders or are used under permission or applicable law. You may read and share links for personal, lawful use; you may not republish or commercially exploit protected content without the appropriate rights.",
          ],
        },
        {
          heading: "Third-party links and media",
          paragraphs: [
            "Our services may link to or embed content from third parties, including video platforms. Those services have their own terms and policies. We are not responsible for their availability, content or practices.",
          ],
        },
        {
          heading: "Live and video services",
          paragraphs: [
            "Live TV, video and Shorts availability depends on source streams, distribution rights and network conditions. A stream or programme may occasionally be unavailable, delayed or changed without notice.",
          ],
        },
        {
          heading: "User conduct",
          paragraphs: [
            "Do not interfere with service security or operation; attempt unauthorized access; use automated access in a way that harms availability; or use the service to violate law or the rights of others. We may restrict abusive use where reasonably necessary.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "We work to provide useful, accurate news, but information can be incomplete or change quickly. To the extent permitted by applicable law, Apex News India is not liable for losses arising from interruption, errors, third-party services or reliance on content. Nothing here removes rights or remedies that cannot lawfully be excluded.",
          ],
        },
        {
          heading: "Changes and applicable law",
          paragraphs: [
            "We may update these terms as the service evolves and will post the revised text and effective date here. These terms are interpreted under applicable law, without limiting rights that cannot lawfully be excluded.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "For questions about these terms, editorial corrections or app support, use the Contact page. Only verified public contact details are published there.",
          ],
        },
      ],
    },
    contact: {
      label: "CONTACT / THE NEWSROOM",
      title: "Contact Apex",
      description:
        "Find the right route for general, editorial, corrections, privacy and app support enquiries at Apex News India.",
      deck: "Send the right question to the right team. Contact channels appear here once they have been verified by the newsroom.",
      sections: [
        {
          heading: "General enquiries",
          paragraphs: [
            "Questions about Apex News India, the website or the mobile app can be directed through a verified general contact channel when one is published.",
          ],
        },
        {
          heading: "Editorial enquiries",
          paragraphs: [
            "For coverage suggestions or editorial questions, include the subject, relevant location and any source material you are permitted to share.",
          ],
        },
        {
          heading: "Corrections",
          paragraphs: [
            "For a possible error, identify the article URL, the specific passage, why you believe it is incorrect and any supporting source. Reports may change as facts are verified.",
          ],
        },
        {
          heading: "Privacy requests",
          paragraphs: [
            "For access, correction, deletion or other privacy concerns, describe the request and the service involved. Do not send sensitive documents unless requested through a verified channel.",
          ],
        },
        {
          heading: "Technical and app support",
          paragraphs: [
            "For website or app problems, include your device, operating system, app or browser version if known, and a short description of the issue. The Support page has steps for common problems.",
          ],
        },
      ],
    },
    about: {
      label: "ABOUT / THE APEX PERSPECTIVE",
      title: "About Apex News India",
      description:
        "Meet Apex News India, a digital news platform with English and Roman Hindi editions across web, mobile and video.",
      deck: "A digital newsroom built to make important stories clear, accessible and worth understanding.",
      sections: [
        {
          heading: "The platform",
          paragraphs: [
            "Apex News India brings news and context to readers through its website and mobile app. The experience combines written reporting and updates with live and on-demand video formats where available.",
          ],
        },
        {
          heading: "What we cover",
          paragraphs: [
            "Our coverage spans India, politics, world affairs, business, sports, entertainment and technology, alongside regional and North East stories. We aim to make significant developments easier to follow without losing their context.",
          ],
        },
        {
          heading: "Two digital editions",
          paragraphs: [
            "Readers can choose English or Roman Hindi. Both editions share the same platform and visual language, with localized headlines, navigation and stories to support different reading preferences.",
          ],
        },
        {
          heading: "Across screens",
          paragraphs: [
            "The website, mobile app, Apex Live and short-form video are parts of the same digital news experience. Live and video availability can depend on source streams and distribution conditions.",
          ],
        },
        {
          heading: "Our approach",
          paragraphs: [
            "We value clear language, careful attribution and the ability to correct stories as new facts emerge. For an editorial enquiry or possible correction, visit the Contact page.",
          ],
        },
      ],
    },
    support: {
      label: "APP SUPPORT / APEX NEWS INDIA",
      title: "Apex News India app support",
      description:
        "Help with the Apex News India mobile app, including loading, images, live video, notifications, language choice and bookmarks.",
      deck: "Practical help for reading, watching and personalizing Apex News India on your phone.",
      sections: [
        {
          heading: "News not loading",
          paragraphs: [
            "Check your internet connection, switch between Wi-Fi and mobile data if available, then close and reopen the app. If one story still fails, try another story and note the affected article URL or title.",
          ],
        },
        {
          heading: "Images not loading",
          paragraphs: [
            "Images may take longer on a slow connection. Refresh the story or reopen the app after checking connectivity. If the text loads but images do not, note which story is affected.",
          ],
        },
        {
          heading: "Live stream unavailable",
          paragraphs: [
            "The Live TV stream may occasionally be unavailable because broadcast availability depends on the source stream. Wait a moment and try again. Other news content may remain available while a stream is offline.",
          ],
        },
        {
          heading: "Notifications",
          paragraphs: [
            "The app asks for notification permission only when you choose to enable it. Check both your in-app notification preference and your device's notification settings. If permission is off, turn it on in device settings if you wish to receive alerts.",
          ],
        },
        {
          heading: "Language selection",
          paragraphs: [
            "Choose English or Roman Hindi using the edition control in the app. The preference is stored locally on your device. If your choice resets, check whether app data was cleared or the app was reinstalled.",
          ],
        },
        {
          heading: "Bookmarks",
          paragraphs: [
            "Bookmarks are saved locally on your device. Clearing app data or removing the app may remove them. If a bookmark no longer opens, the original story may have changed or become unavailable.",
          ],
        },
        {
          heading: "Videos and Shorts",
          paragraphs: [
            "Check your connection and retry playback. Embedded or external video can also depend on the video provider's availability and your network settings.",
          ],
        },
        {
          heading: "Restarting and updating",
          paragraphs: [
            "Close the app fully and reopen it. Check your device's app store for an available Apex News India update. If the issue continues, restart your device and note the steps that reproduce it.",
          ],
        },
        {
          heading: "Contact support",
          paragraphs: [
            "App: Apex News India. For unresolved problems, use the Contact page and include your device, operating system, app version if known, and the issue you encountered. A support channel will be displayed only after it is verified and approved.",
          ],
        },
      ],
    },
  },
  roman: {
    "privacy-policy": {
      label: "PRIVACY / APEX NEWS INDIA",
      title: "Niji Jankari ki Niti",
      description:
        "Apex News India website aur mobile app par jankari kaise istemal hoti hai: local storage, notifications aur third-party media ki tafseel.",
      deck: "Yeh policy batati hai ki Apex News India ki website aur mobile app istemal karte waqt kaunsi jankari process ho sakti hai aur aapke paas kya vikalp hain.",
      effectiveDate: "23 September 2026",
      sections: [
        {
          heading: "Yeh policy aur process hone wali jankari",
          paragraphs: [
            "Apex News India website aur mobile app ke zariye khabrein deta hai. Pages, stories aur media pahunchane ke liye hamari services aur unka infrastructure IP address, browser ya device ki buniyadi jankari, request ka samay aur connection diagnostics jaisi technical/network jankari process kar sakta hai. Service chalane, surakshit rakhne aur dikkat suljhane ke liye yeh zaroori ho sakta hai.",
            "Agar aap humse sampark karte hain, to aapka diya hua naam, contact detail, sambandhit story ya dikkat aur sandesh jawab dene ke liye process kiya ja sakta hai. Zaroorat na ho to samvedansheel jankari na bhejein.",
          ],
        },
        {
          heading: "Abhi app kya nahin maangta",
          paragraphs: [
            "Maujooda app mein account banana zaroori nahin hai. Yeh payment information nahin leta aur location permission bhi zaroori nahin hai. Abhi production advertising SDK ya user analytics system istemal nahin hota, jab tak kisi aane wale release mein alag se configure na kiya jaaye. Iska matlab yeh nahin ki service dene ke liye koi technical jankari process hi nahin hoti.",
          ],
        },
        {
          heading: "Device par save hone wali cheezein",
          paragraphs: [
            "Mobile app bookmarks, English ya Roman Hindi ka chunaav aur notification preferences aapke device par locally save karta hai. Website aapki edition pasand yaad rakhne ke liye first-party preference cookie istemal karti hai. Aap edition badal sakte hain. Browser ya app ka data saaf karne, ya app hataane par local choices aur bookmarks mit sakte hain.",
          ],
        },
        {
          heading: "Notifications",
          paragraphs: [
            "App notification permission tabhi maang sakta hai jab aap notifications chalu karna chunein. App ki preference aur device settings se ise badal sakte hain. Notifications chalu hone par platform ki notification services delivery ke liye zaroori technical jankari process kar sakti hain. Device par permission band karne se woh notifications ruk jaati hain.",
          ],
        },
        {
          heading: "Third-party services aur bahari links",
          paragraphs: [
            "News content Apex News India services se aata hai. Kuch pages ya app views YouTube jaisi services ka media dikha sakte hain. Aise media ko kholne ya chalane par us provider ko technical jankari mil sakti hai aur uski apni privacy terms laagu hoti hain. Bahari websites ke links par unki apni policies laagu hoti hain.",
            "App ki functionality aur distribution ke liye Expo, Apple aur Google ka infrastructure bhi istemal hota hai. Unki processing unki sambandhit terms aur privacy policies ke mutabik hoti hai. In alag services par hamara niyantran nahin hai.",
          ],
        },
        {
          heading: "Suraksha aur data kitne samay tak rehta hai",
          paragraphs: [
            "Hum service ke hisaab se uchit suraksha upaay apnaate hain, lekin internet ya storage ka koi tareeqa poori suraksha ki guarantee nahin de sakta. Device par saved pasand aur bookmarks tab tak rehte hain jab tak aap unhe saaf na karein, app data reset na karein ya app na hata dein; device backup ka asar alag ho sakta hai. Technical records aur correspondence service chalaane, suraksha, requests ka jawab dene ya kanooni zarooraton ke liye jitne samay uchit hon utne samay rakhe ja sakte hain. Yahan koi nishchit retention period ka daawa nahin kiya gaya hai.",
          ],
        },
        {
          heading: "Bachchon ki privacy",
          paragraphs: [
            "Yeh aam news service hai aur khaas taur par bachchon ke liye nahin banayi gayi hai. Agar kisi parent ya guardian ko lage ki kisi bachche ne personal jankari bheji hai, to woh Contact page se review ki maang kar sakte hain.",
          ],
        },
        {
          heading: "Aapke vikalp aur privacy requests",
          paragraphs: [
            "Aap language aur notification settings badal sakte hain, local bookmarks hata sakte hain aur browser/device controls se local data saaf kar sakte hain. Laagu kanoon ke mutabik aap hamare paas maujood apni personal jankari dekhne, sudharne ya mitane ki request bhi kar sakte hain, ya privacy concern bata sakte hain. Iske liye Contact page istemal karein. Sambandhit request pehchaanne ke liye kuch jankari maangni pad sakti hai aur kanooni zaroorat par kuch data rakha ja sakta hai.",
          ],
        },
        {
          heading: "Policy mein badlaav aur sampark",
          paragraphs: [
            "Service badalne par hum yeh policy update kar sakte hain, khaaskar analytics, advertising, login, personalization ya naye features aane par. Bade badlaav yahan nayi effective date ke saath dikhaye jaayenge. Privacy sawaal ya request ke liye Contact page dekhein. Wahan sirf tasdeeq aur manzoori ke baad contact details publish hoti hain.",
          ],
        },
      ],
    },
    terms: {
      label: "TERMS / APEX NEWS INDIA",
      title: "Istemaal ki Shartein",
      description:
        "Apex News India website aur app ke istemal, content, live video, bahari links aur corrections ki shartein.",
      deck: "Yeh shartein Apex News India ki website aur mobile app istemal karne ke niyam batati hain.",
      effectiveDate: "23 September 2026",
      sections: [
        {
          heading: "Service ka istemal",
          paragraphs: [
            "Apex News India ki website ya app istemal karke aap kanoon aur in sharton ke mutabik istemal karne par sahmat hote hain. Agar aap sahmat nahin hain to service ka istemal band karein. Khabrein aur doosra content aam jankari ke liye hain; ghatnaon ke badalne par jankari bhi badal sakti hai.",
          ],
        },
        {
          heading: "Service ki uplabdhata",
          paragraphs: [
            "Hum service chalti rakhne ki koshish karte hain, lekin bina rukavat, bina galti ya hamesha uplabdh rehne ka vaada nahin karte. Editorial, technical, rights ya operational wajah se features ya content badal, ruk ya hat sakte hain.",
          ],
        },
        {
          heading: "Updates aur corrections",
          paragraphs: [
            "Nayi jankari verify hone par reports update, correct ya withdraw ki ja sakti hain. Publish hone aur baad ke revision ka samay alag ho sakta hai. Agar aapko kisi story mein galti lage, Contact page par article link, chintaa ka sahi hissa aur wajah batayein.",
          ],
        },
        {
          heading: "Boudhik sampada",
          paragraphs: [
            "Site aur app ka original text, design, branding aur hamare adhikaar wala doosra content laagu intellectual-property kanoon se surakshit hai. Kuch tasveerein, video, quotes aur third-party material unke apne rights holders ke hain ya ijazat/laagu kanoon ke tahat istemal hote hain. Aap vyaktigat aur kanooni istemal ke liye padh aur links share kar sakte hain; zaroori adhikaar ke bina protected content dobara publish ya commercial istemal na karein.",
          ],
        },
        {
          heading: "Bahari links aur media",
          paragraphs: [
            "Hamari service video platforms samet third-party content link ya embed kar sakti hai. Un services ki apni terms aur policies hain. Unki uplabdhata, content ya practices ke liye hum zimmedar nahin hain.",
          ],
        },
        {
          heading: "Live aur video",
          paragraphs: [
            "Live TV, videos aur Shorts ki uplabdhata source streams, distribution rights aur network conditions par nirbhar hai. Stream ya programme kabhi-kabhi bina pehle bataye unavailable, delayed ya badla hua ho sakta hai.",
          ],
        },
        {
          heading: "Istemal ke niyam",
          paragraphs: [
            "Service ki suraksha ya kaam mein dakhal na dein, bina ijazat access ki koshish na karein, aisa automated access na karein jo uplabdhata ko nuksan pahunchaye, aur kanoon ya doosron ke adhikaar na todein. Zaroorat par hum durupyog ko seemit kar sakte hain.",
          ],
        },
        {
          heading: "Zimmedari ki seema",
          paragraphs: [
            "Hum upyogi aur sahi khabrein dene ki koshish karte hain, lekin jankari adhoori ho sakti hai ya jaldi badal sakti hai. Laagu kanoon jitni anumati deta hai, us had tak rukavat, galti, third-party service ya content par nirbhar rehne se hue nuksan ke liye Apex News India zimmedar nahin hoga. Jo adhikaar ya upaay kanoonan hataye nahin ja sakte, woh barkarar rahenge.",
          ],
        },
        {
          heading: "Sharton mein badlaav aur kanoon",
          paragraphs: [
            "Service badalne par hum yeh shartein update kar sakte hain aur naya text aur effective date yahan denge. In sharton ko laagu kanoon ke mutabik samjha jaayega. Jo adhikaar kanoonan seemit nahin kiye ja sakte, woh barkarar rahenge.",
          ],
        },
        {
          heading: "Sampark",
          paragraphs: [
            "In sharton, editorial corrections ya app support par sawaal ke liye Contact page dekhein. Wahan sirf tasdeeq-shuda public contact details publish hoti hain.",
          ],
        },
      ],
    },
    contact: {
      label: "CONTACT / THE NEWSROOM",
      title: "Apex se sampark",
      description:
        "Apex News India se aam sawaal, editorial baat, correction, privacy request ya app support ke liye sampark ki jankari.",
      deck: "Sahi sawaal sahi team tak pahunchayein. Newsroom se tasdeeq hone ke baad contact channels yahan dikhaye jaayenge.",
      sections: [
        {
          heading: "Aam sawaal",
          paragraphs: [
            "Apex News India, website ya mobile app se jude aam sawaalon ke liye tasdeeq-shuda general contact channel publish hone par uska istemal karein.",
          ],
        },
        {
          heading: "Editorial sawaal",
          paragraphs: [
            "Coverage ka sujhaav ya editorial sawaal bhejte waqt vishay, sambandhit jagah aur aisa source material dein jise share karne ki aapko ijazat ho.",
          ],
        },
        {
          heading: "Corrections",
          paragraphs: [
            "Kisi mumkin galti ke liye article URL, sambandhit hissa, galti ki wajah aur sahayak source batayein. Facts verify hone par report badal sakti hai.",
          ],
        },
        {
          heading: "Privacy requests",
          paragraphs: [
            "Access, correction, deletion ya doosri privacy chintaa ke liye request aur sambandhit service batayein. Tasdeeq-shuda channel par maange bina samvedansheel documents na bhejein.",
          ],
        },
        {
          heading: "Technical aur app support",
          paragraphs: [
            "Website ya app ki dikkat ke liye device, operating system, app/browser version (agar pata ho) aur dikkat ka chhota vivaran dein. Aam pareshaniyon ke upaay Support page par hain.",
          ],
        },
      ],
    },
    about: {
      label: "ABOUT / THE APEX PERSPECTIVE",
      title: "Apex News India ke baare mein",
      description:
        "Apex News India ek digital news platform hai, jiske English aur Roman Hindi editions web, mobile aur video par hain.",
      deck: "Ek digital newsroom jo zaroori khabron ko saaf, aasaan aur samajhne layak andaaz mein pesh karta hai.",
      sections: [
        {
          heading: "Platform",
          paragraphs: [
            "Apex News India website aur mobile app ke zariye readers tak khabrein aur unka sandarbh pahunchata hai. Yeh experience likhi hui reports aur updates ko, jahan uplabdh ho, live aur on-demand video formats ke saath jodta hai.",
          ],
        },
        {
          heading: "Hamari coverage",
          paragraphs: [
            "Hum Bharat, rajneeti, duniya, karobar, khel, manoranjan aur technology ke saath regional aur North East stories cover karte hain. Maqsad hai bade developments ko unka sandarbh banaye rakhte hue samajhna aasaan banana.",
          ],
        },
        {
          heading: "Do digital editions",
          paragraphs: [
            "Readers English ya Roman Hindi chun sakte hain. Dono editions ek hi platform aur visual pehchaan share karte hain, lekin headlines, navigation aur stories padhne ki alag pasand ke hisaab se localize ki jaati hain.",
          ],
        },
        {
          heading: "Har screen par",
          paragraphs: [
            "Website, mobile app, Apex Live aur chhote video ek hi digital news experience ka hissa hain. Live aur video ki uplabdhata source streams aur distribution conditions par nirbhar ho sakti hai.",
          ],
        },
        {
          heading: "Hamari soch",
          paragraphs: [
            "Hum saaf bhasha, sahi attribution aur naye facts saamne aane par story sudharne ko mahatva dete hain. Editorial sawaal ya correction ke liye Contact page dekhein.",
          ],
        },
      ],
    },
    support: {
      label: "APP SUPPORT / APEX NEWS INDIA",
      title: "Apex News India app madad",
      description:
        "Apex News India app par news, images, live video, notifications, language aur bookmarks se judi madad.",
      deck: "Phone par Apex News India padhne, dekhne aur apni pasand set karne ke liye seedhi madad.",
      sections: [
        {
          heading: "News load nahin ho rahi",
          paragraphs: [
            "Internet connection check karein. Mumkin ho to Wi-Fi aur mobile data badal kar dekhein, phir app poori tarah band karke kholein. Agar sirf ek story nahin khulti, doosri story dekhein aur uska article URL ya title note karein.",
          ],
        },
        {
          heading: "Images nahin dikh rahi",
          paragraphs: [
            "Dheeme connection par tasveerein der se aa sakti hain. Connection check karke story refresh karein ya app dobara kholein. Text aaye lekin tasveer na aaye to sambandhit story note karein.",
          ],
        },
        {
          heading: "Live stream uplabdh nahin",
          paragraphs: [
            "Live TV stream kabhi-kabhi uplabdh nahin hoti kyunki broadcast source stream par nirbhar hai. Thodi der baad phir koshish karein. Stream band ho tab bhi doosri khabrein mil sakti hain.",
          ],
        },
        {
          heading: "Notifications",
          paragraphs: [
            "App notification permission tabhi maangta hai jab aap notifications chalu karna chunein. App ki notification preference aur device ki settings dono check karein. Alerts chahiye to device settings mein permission chalu karein.",
          ],
        },
        {
          heading: "Language chunna",
          paragraphs: [
            "App ke edition control se English ya Roman Hindi chunein. Pasand device par locally save hoti hai. Agar chunaav reset ho gaya ho, dekhein ki app data clear ya app reinstall to nahin hui.",
          ],
        },
        {
          heading: "Bookmarks",
          paragraphs: [
            "Bookmarks device par locally save hote hain. App data saaf karne ya app hataane se woh mit sakte hain. Bookmark na khule to mumkin hai original story badal gayi ho ya ab uplabdh na ho.",
          ],
        },
        {
          heading: "Videos aur Shorts",
          paragraphs: [
            "Connection check karke playback dobara chalayein. Embedded ya bahari video ki uplabdhata video provider aur aapki network settings par bhi nirbhar ho sakti hai.",
          ],
        },
        {
          heading: "App restart aur update",
          paragraphs: [
            "App ko poori tarah band karke dobara kholein. Device ke app store mein Apex News India ka update dekhein. Dikkat bani rahe to device restart karein aur samasya dobara kaise aati hai, yeh note karein.",
          ],
        },
        {
          heading: "Support se sampark",
          paragraphs: [
            "App: Apex News India. Dikkat na suljhe to Contact page dekhein aur device, operating system, app version (agar pata ho) aur samasya batayein. Support channel sirf tasdeeq aur manzoori ke baad dikhaya jaayega.",
          ],
        },
      ],
    },
  },
};

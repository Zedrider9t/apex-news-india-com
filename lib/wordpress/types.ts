/** Public REST response shapes observed on apexnewsindia.in, 2026-09-17.
 * Optional/unknown values are validated at the boundary; no edit-context assumptions. */
export interface WPRendered {
  rendered: string;
  protected?: boolean;
}
export interface WPError {
  code: string;
  message: string;
  data?: { status?: number };
}
export interface WPLink {
  href: string;
  embeddable?: boolean;
  taxonomy?: string;
  [key: string]: unknown;
}
export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  link?: string;
  description?: string;
  count?: number;
  parent?: number;
  meta?: unknown;
  [key: string]: unknown;
}
export interface WPAuthor {
  id: number;
  name: string;
  slug?: string;
  link?: string;
}
export interface WPImageSize {
  source_url: string;
  width: number;
  height: number;
  mime_type?: string;
  file?: string;
  filesize?: number;
}
export interface WPMedia {
  id: number;
  source_url: string;
  alt_text?: string;
  media_type?: string;
  mime_type?: string;
  title?: WPRendered;
  caption?: WPRendered;
  description?: WPRendered;
  post?: number;
  media_details?: {
    width?: number;
    height?: number;
    file?: string;
    filesize?: number;
    sizes?: Record<string, WPImageSize>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  format?: string;
  meta?: Record<string, unknown> | unknown[];
  sticky?: boolean;
  aioseo_head?: string;
  aioseo_head_json?: Record<string, unknown>;
  aioseo_meta_data?: Record<string, unknown>;
  aioseo_notices?: unknown[];
  aioseo_breadcrumb?: string;
  aioseo_breadcrumb_json?: unknown[];
  amp_enabled?: boolean;
  _links?: Record<string, WPLink[]>;
  _embedded?: {
    author?: Array<WPAuthor | WPError>;
    "wp:featuredmedia"?: Array<WPMedia | WPError>;
    "wp:term"?: WPTerm[][];
  };
  [key: string]: unknown;
}
export interface SourceTerm {
  id: number;
  name: string | null;
  slug: string | null;
  taxonomy: string;
  sourceUrl: string | null;
}
export interface SourceImage {
  id: number | null;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  sizes: Array<{ name: string; url: string; width: number; height: number }>;
}
export interface SourceStory {
  sharedStoryId: string;
  sourcePostId: number;
  sourceUrl: string;
  sourceSlug: string;
  sourceStatus: string;
  sourceLanguage: "hi";
  languageBasis: "publisher-config";
  titleHindi: string;
  rawContentHtml: string;
  rawExcerpt: string;
  contentText: string[];
  excerptText: string;
  publishedAt: string;
  modifiedAt: string;
  author: {
    sourceId: number | null;
    name: string | null;
    sourceUrl: string | null;
    available: boolean;
  };
  categories: SourceTerm[];
  tags: SourceTerm[];
  featuredImage: SourceImage | null;
  featuredMediaId: number | null;
  articleImages: Array<{ url: string; alt: string; srcset: string | null }>;
  embeds: Array<{ type: "iframe" | "video" | "audio" | "source"; url: string }>;
  galleries: Array<{ attachmentIds: number[] }>;
  embeddedMediaReferences: Record<string, unknown>;
  seo: Record<string, unknown>;
  customFields: Record<string, unknown>;
  originalMetadata: {
    dateLocal: string;
    modifiedLocal: string;
    format: string | null;
    meta: unknown;
    links: unknown;
  };
  warnings: string[];
}
export interface SharedStoryIdentity {
  sharedStoryId: string;
  sourcePostId: number;
  sourceRevision: string;
  modifiedAt: string;
  lastSyncedAt: string;
  syncStatus: "source-fetched";
  englishVersion: null;
  romanHindiVersion: null;
  // Null means not created, not an empty/published translation.
}
export type SourceFailure =
  | "disabled"
  | "network"
  | "timeout"
  | "rate-limited"
  | "http"
  | "malformed"
  | "empty"
  | "not-found";
export type SourceResult =
  | {
      ok: true;
      stories: SourceStory[];
      identities: SharedStoryIdentity[];
      fetchedAt: string;
      warnings: string[];
    }
  | { ok: false; reason: SourceFailure; message: string };

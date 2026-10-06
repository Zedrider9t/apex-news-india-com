import type { SourceStory } from "../wordpress/types";
export type TranslationLocale = "en" | "roman";
export type SourceState = "active" | "unpublished" | "deleted";
export type TranslationStatus =
  "pending" | "processing" | "generated" | "validation_failed" | "failed";
export type EditorialStatus =
  "auto_approved" | "needs_review" | "manually_approved" | "manually_corrected";
export type PublishStatus = "draft" | "ready" | "published" | "withdrawn";
export type ChangeKind =
  | "new"
  | "unchanged"
  | "metadata_only"
  | "content_changed"
  | "unpublished"
  | "deleted"
  | "restored";
export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  segmentId?: string;
  message: string;
  sourceEvidence: string;
  translationEvidence: string;
}
export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  checkedAt: string;
  validatorVersion: string;
}
export interface TextSegment {
  id: string;
  text: string;
  context: string;
  protectedLiterals?: Record<string, string>;
}
export interface TranslationRequest {
  locale: TranslationLocale;
  segments: TextSegment[];
  promptVersion: string;
}
export interface ProviderMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  responseId?: string;
  usage?: Record<string, number>;
}
export interface TranslationResponse {
  segments: Array<{ id: string; text: string }>;
  confidence: number;
  warnings: string[];
  metadata: ProviderMetadata;
}
export interface FactualVerificationRequest {
  locale: TranslationLocale;
  segments: Array<{ id: string; source: string; translation: string }>;
  promptVersion: string;
}
export interface FactualVerificationIssue {
  segmentId: string;
  type:
    | "number_association"
    | "date"
    | "name_entity"
    | "attribution"
    | "quote"
    | "omission"
    | "addition"
    | "meaning";
  message: string;
}
export interface FactualVerificationResponse {
  passed: boolean;
  confidence: number;
  issues: FactualVerificationIssue[];
  metadata: ProviderMetadata;
}
export interface TranslationProvider {
  readonly name: string;
  readonly model: string;
  translate(request: TranslationRequest): Promise<TranslationResponse>;
  verify(request: FactualVerificationRequest): Promise<FactualVerificationResponse>;
}
export interface SourceRevision {
  hash: string;
  textHash: string;
  contentHash: string;
  metadataHash: string;
  observedAt: string;
  changedFields: string[];
  changeKind: ChangeKind;
  story: Readonly<SourceStory>;
}
export interface LocalizedArticle {
  revisionId: string;
  sharedStoryId: string;
  sourcePostId: number;
  sourceUrl: string;
  sourceModifiedAt: string;
  sourceRevisionHash: string;
  locale: TranslationLocale;
  localizedSlug: string;
  localizedTitle: string;
  localizedExcerpt: string;
  localizedContent: string;
  localizedCategoryLabels: Array<{ id: number; label: string }>;
  localizedTagLabels: Array<{ id: number; label: string }>;
  seo: {
    pageTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
  translationVersion: number;
  translationMetadata: ProviderMetadata;
  generatedAt: string | null;
  lastSyncedAt: string;
  translationStatus: TranslationStatus;
  editorialStatus: EditorialStatus;
  correctionStatus: "none" | "source_changed" | "corrected";
  publishStatus: PublishStatus;
  sourceDeleted: boolean;
  sourceUnpublished: boolean;
  warnings: string[];
  validation: ValidationResult;
  changedFields: string[];
  basedOnRevisionId?: string;
  failure?: { code: string; message: string };
}
export interface ReviewEvent {
  revisionId: string;
  action: string;
  actor: string;
  note: string;
  at: string;
}
export interface StoryRecord {
  sharedStoryId: string;
  sourcePostId: number;
  state: SourceState;
  availability: "available" | "unconfirmed_missing" | "unavailable";
  currentSourceHash: string;
  sources: SourceRevision[];
  revisions: LocalizedArticle[];
  current: Partial<Record<TranslationLocale, string>>;
  lastSyncedAt: string;
  jobs: Partial<
    Record<
      TranslationLocale,
      {
        token: string;
        sourceHash: string;
        expiresAt: string;
        revisionId: string;
      }
    >
  >;
  events: ReviewEvent[];
}
export interface LocalizationDatabase {
  schemaVersion: 1;
  stories: Record<string, StoryRecord>;
}
export interface LocalizationRepository {
  read(id: number): Promise<StoryRecord | null>;
  list(): Promise<StoryRecord[]>;
  transact<T>(fn: (db: LocalizationDatabase) => T): Promise<T>;
}
export type SourceObservation =
  | { kind: "active"; story: SourceStory }
  | { kind: "unavailable" | "unconfirmed_missing" }
  | { kind: "deleted" | "unpublished"; evidence: string };

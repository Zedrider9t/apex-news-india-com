export type Category =
  | "India"
  | "Politics"
  | "World"
  | "Business"
  | "Sports"
  | "Entertainment"
  | "Technology"
  | "North East";
export interface ApexArticle {
  locale: Locale;
  alternatePaths: Localized<string>;
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  featuredImage: string;
  imageAlt: string;
  category: Category;
  tags?: string[];
  publishedAt: string;
  readMinutes: number;
  author: string;
  sourcePostId?: number;
  sourceUrl?: string;
  contentOrigin?: "mock" | "localized";
  editorial?: {
    heroRank?: number;
    latestRank?: number;
    trendingRank?: number;
    special?: boolean;
  };
}
export interface NewsCategory {
  label: string;
  name: Category;
  subtitle: string;
  image: string;
}
export interface ApexShort {
  id: string;
  title: string;
  image: string;
  duration: string;
  category: Category;
  description: string;
  videoUrl?: string;
  views?: number;
  sampleViews?: boolean;
  imagePosition?: string;
}

export interface BroadcastProgramme {
  title: string;
  description: string;
  anchor: string;
  slot: string;
  nextTitle: string;
  nextSlot: string;
  isPreview: boolean;
}

export type Locale = "en" | "roman";
export type Localized<T> = Record<Locale, T>;
export type ArticleCopy = Pick<
  ApexArticle,
  "slug" | "title" | "excerpt" | "content" | "imageAlt" | "author"
>;
export type ArticleMedia = Omit<
  ApexArticle,
  keyof ArticleCopy | "locale" | "alternatePaths"
>;
export type ShortCopy = Pick<ApexShort, "title" | "description">;
export type ShortMedia = Omit<ApexShort, keyof ShortCopy>;
export type CategoryMedia = Pick<NewsCategory, "name" | "image">;
export interface EditionCopy {
  articles: Record<number, ArticleCopy>;
  shorts: Record<string, ShortCopy>;
  categories: Record<Category, { label: string; subtitle: string }>;
  broadcastProgramme: BroadcastProgramme;
}
export interface EditionContent {
  locale: Locale;
  articles: ApexArticle[];
  categories: NewsCategory[];
  shorts: ApexShort[];
  broadcastProgramme: BroadcastProgramme;
}

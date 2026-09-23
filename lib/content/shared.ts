import type { ArticleMedia, ShortMedia, CategoryMedia } from "../types";
// Stable identities, ordering and media are shared by both editions.
export const articleMedia: ArticleMedia[] = [
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 1,
    editorial: {
      heroRank: 1,
      special: true,
    },
    category: "India",
    featuredImage: "/images/delhi.jpg",
    readMinutes: 6,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 2,
    category: "Politics",
    featuredImage: "/images/politics.jpg",
    readMinutes: 4,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 3,
    tags: ["sensex", "nifty", "stocks", "market"],
    editorial: {
      latestRank: 2,
      trendingRank: 3,
    },
    category: "Business",
    featuredImage: "/images/market.jpg",
    readMinutes: 3,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 4,
    tags: ["cricket", "team india", "match"],
    editorial: {
      trendingRank: 2,
    },
    category: "Sports",
    featuredImage: "/images/cricket.jpg",
    readMinutes: 4,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 5,
    tags: ["AI", "artificial intelligence", "tech"],
    editorial: {
      heroRank: 3,
      latestRank: 4,
      trendingRank: 1,
    },
    category: "Technology",
    featuredImage: "/images/technology.jpg",
    readMinutes: 5,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 6,
    editorial: {
      latestRank: 5,
    },
    category: "India",
    featuredImage: "/images/delhi.jpg",
    readMinutes: 3,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 7,
    editorial: {
      latestRank: 3,
    },
    category: "World",
    featuredImage: "/images/world.jpg",
    readMinutes: 5,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 8,
    editorial: {
      heroRank: 2,
      latestRank: 1,
      trendingRank: 4,
    },
    category: "North East",
    featuredImage: "/images/northeast.jpg",
    readMinutes: 7,
  },
  {
    publishedAt: "2026-09-16T08:30:00+05:30",
    id: 9,
    category: "Entertainment",
    featuredImage: "/images/cinema.jpg",
    readMinutes: 3,
  },
];
export const shortMedia: ShortMedia[] = [
  {
    id: "desh",
    views: 24800,
    sampleViews: true,
    imagePosition: "52% 45%",
    image: "/images/india.jpg",
    duration: "0:58",
    category: "India",
  },
  {
    id: "cricket",
    views: 18600,
    sampleViews: true,
    imagePosition: "68% 50%",
    image: "/images/cricket.jpg",
    duration: "0:42",
    category: "Sports",
  },
  {
    id: "ai",
    views: 32100,
    sampleViews: true,
    imagePosition: "52% 45%",
    image: "/images/technology.jpg",
    duration: "0:55",
    category: "Technology",
  },
  {
    id: "northeast",
    views: 15200,
    sampleViews: true,
    imagePosition: "35% 50%",
    image: "/images/northeast.jpg",
    duration: "0:48",
    category: "North East",
  },
  {
    id: "cinema",
    views: 9700,
    sampleViews: true,
    imagePosition: "35% 50%",
    image: "/images/cinema.jpg",
    duration: "0:36",
    category: "Entertainment",
  },
];
export const categoryMedia: CategoryMedia[] = [
  {
    name: "India",
    image: "/images/india.jpg",
  },
  {
    name: "Politics",
    image: "/images/politics.jpg",
  },
  {
    name: "World",
    image: "/images/world.jpg",
  },
  {
    name: "Business",
    image: "/images/market.jpg",
  },
  {
    name: "Sports",
    image: "/images/cricket.jpg",
  },
  {
    name: "North East",
    image: "/images/northeast.jpg",
  },
  {
    name: "Entertainment",
    image: "/images/cinema.jpg",
  },
  {
    name: "Technology",
    image: "/images/technology.jpg",
  },
];

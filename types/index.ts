export interface Book {
  book_id: number;
  name_am: string;
  name_en: string;
  short_name_am: string;
  short_name_en: string;
  testament: string;
}

// types.ts or top of App.tsx
export type RootStackParamList = {
  Home: undefined;
  Page: {
    bookId: number;
    bookName: string;
    chapterNumber: number;
  };
};

export interface Verse {
  verse_number: number;
  verse_text: string;
}

// constants/types.ts (or wherever your Book type lives)
export interface Book {
  book_id: number;
  name_am: string;
  name_en: string;
  short_name_am: string;
  short_name_en: string;
  testament: string;
  total_chapters: number; // <-- Add this
}

export type RootDrawerParamList = {
  Home: undefined; // No params expected
  BookReader: { bookId: number; bookName: string; chapterNumber: number }; // Params expected
};

export type ItemProps = {
  children: React.ReactNode;
  setImages: (img: string) => void;
};

export type RenderPageProps = {
  item: PageItem;
  index: number;
};

// types.ts
export interface PageCurlHandle {
  next: () => void;
  prev: () => void;
  jumpTo: (targetIndex: number) => void;
}

export const FONT_SIZE = 16;
export const LINE_HEIGHT = 24;

export interface RawVerseRow {
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  name_am: string;
}

export interface PageItem {
  text: string;
  chapterNumber: number;
  startVerse: number;
  endVerse: number;
  pageInChapter: number;
  totalChapterPages: number;
}

export interface PaginatedBookResult {
  allPages: PageItem[];
  chapterStartIndices: Record<number, number>;
  totalChapters: number;
}

export interface ParsedVerse {
  verseNum: number;
  text: string;
}
export interface SavedProgressRow {
  book_index: number;
  page_index: number;
}

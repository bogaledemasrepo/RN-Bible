export interface Book{
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
  children: React.ReactNode
  setImages: (img: any) => void
}

export type RenderPageProps = {
  item: any
  index: number
}


// types.ts
export interface PageCurlHandle {
  next: () => void;
  prev: () => void;
  jumpTo: (targetIndex: number) => void;
}
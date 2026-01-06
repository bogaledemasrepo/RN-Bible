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

export interface Book {
  id: number;
  name: string;
}
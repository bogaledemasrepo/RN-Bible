import React, { createContext, useContext, useState, ReactNode } from "react";

// Types for our navigation state
interface Selection {
  bookId: number;
  bookName: string;
  chapterNumber: number;
}

interface PagesContextType {
  selection: Selection;
  navigateTo: (bookId: number, bookName: string, chapter: number) => void;
  nextChapter:()=>void;
  prevChapter:()=>void,
}

const PagesContext = createContext<PagesContextType | undefined>(undefined);

export const PagesProvider = ({ children }: { children: ReactNode }) => {
  // Default to Ruth 1 (based on your data)
  const [selection, setSelection] = useState<Selection>({
    bookId: 8,
    bookName: "መጽሐፈ ሩት",
    chapterNumber: 1,
  });

  const navigateTo = (bookId: number, bookName: string, chapter: number) => {
    setSelection({ bookId, bookName, chapterNumber: chapter });
  };


  const nextChapter = () => {
    setSelection(prev => ({ ...prev, chapterNumber: prev.chapterNumber + 1 }));
  };

  const prevChapter = () => {
    setSelection(prev => ({
      ...prev,
      chapterNumber: Math.max(1, prev.chapterNumber - 1)
    }));
  };
  
  return (
    <PagesContext.Provider value={{ selection, navigateTo, nextChapter, prevChapter }}>
      {children}
    </PagesContext.Provider>
  );
};

export const usePages = () => {
  const context = useContext(PagesContext);
  if (!context) throw new Error("usePages must be used within PagesProvider");
  return context;
};
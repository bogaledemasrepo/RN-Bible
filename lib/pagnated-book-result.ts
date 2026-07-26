// lib/paginateText.ts

// Expanded PageItem interface
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
  chapterStartIndices: Record<number, number>; // chapterNum -> globalPageIndex
  totalChapters: number;
}

export function paginateBookText(
  chaptersData: Record<number, { verseNum: number; text: string }[]>,
  containerHeight: number,
  lineHeight = 28
): PaginatedBookResult {
  const allPages: PageItem[] = [];
  const chapterStartIndices: Record<number, number> = {};

  const availableHeight = containerHeight - 120;
  const maxLinesPerPage = Math.floor(availableHeight / lineHeight);

  const chapterNumbers = Object.keys(chaptersData)
    .map(Number)
    .sort((a, b) => a - b);

  let globalPageIndex = 0;

  for (const chapNum of chapterNumbers) {
    chapterStartIndices[chapNum] = globalPageIndex;

    const verses = chaptersData[chapNum];
    let currentPageVerses: { verseNum: number; text: string }[] = [];
    let currentLineCount = 0;
    
    const chapterPagesRaw: { text: string; startVerse: number; endVerse: number }[] = [];

    for (const verse of verses) {
      const verseFormatted = `${verse.verseNum}. ${verse.text.trim()}`;
      const estimatedLines = Math.ceil(verseFormatted.length / 42) + 1;

      if (currentLineCount + estimatedLines > maxLinesPerPage && currentPageVerses.length > 0) {
        // Save current page
        const pageText = currentPageVerses
          .map((v) => `${v.verseNum}. ${v.text.trim()}`)
          .join('\n\n');

        chapterPagesRaw.push({
          text: pageText,
          startVerse: currentPageVerses[0].verseNum,
          endVerse: currentPageVerses[currentPageVerses.length - 1].verseNum,
        });

        currentPageVerses = [verse];
        currentLineCount = estimatedLines;
      } else {
        currentPageVerses.push(verse);
        currentLineCount += estimatedLines;
      }
    }

    // Flush remaining verses in chapter
    if (currentPageVerses.length > 0) {
      const pageText = currentPageVerses
        .map((v) => `${v.verseNum}. ${v.text.trim()}`)
        .join('\n\n');

      chapterPagesRaw.push({
        text: pageText,
        startVerse: currentPageVerses[0].verseNum,
        endVerse: currentPageVerses[currentPageVerses.length - 1].verseNum,
      });
    }

    // Build final enriched PageItems
    const totalChapterPages = chapterPagesRaw.length;
    chapterPagesRaw.forEach((rawPage, idx) => {
      allPages.push({
        text: rawPage.text,
        chapterNumber: chapNum,
        startVerse: rawPage.startVerse,
        endVerse: rawPage.endVerse,
        pageInChapter: idx + 1,
        totalChapterPages,
      });
      globalPageIndex++;
    });
  }

  return {
    allPages,
    chapterStartIndices,
    totalChapters: chapterNumbers.length,
  };
}
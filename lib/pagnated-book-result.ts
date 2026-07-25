// lib/paginateText.ts

export interface PaginatedBookResult {
  allPages: string[];
  chapterStartIndices: Record<number, number>; // Maps chapterNumber -> globalPageIndex
  totalChapters: number;
}

export function paginateBookText(
  chaptersData: Record<number, string[]>, // { 1: ["1. In the beginning...", ...], 2: [...] }
  containerHeight: number,
  lineHeight = 28
): PaginatedBookResult {
  const allPages: string[] = [];
  const chapterStartIndices: Record<number, number> = {};

  const availableHeight = containerHeight - 100; // Account for header/footer padding
  const maxLinesPerPage = Math.floor(availableHeight / lineHeight);

  const chapterNumbers = Object.keys(chaptersData)
    .map(Number)
    .sort((a, b) => a - b);

  let globalPageIndex = 0;

  for (const chapNum of chapterNumbers) {
    // 1. Record where this chapter starts in global page index
    chapterStartIndices[chapNum] = globalPageIndex;
    
    const verses = chaptersData[chapNum];
    const paragraphs = verses.join('\n\n').split('\n\n');

    let currentPageLines: string[] = [];
    let currentLineCount = 0;

    for (const paragraph of paragraphs) {
      // Rough line count estimation (~42 chars/line on standard mobile screens)
      const estimatedLines = Math.ceil(paragraph.length / 42) + 1;

      if (currentLineCount + estimatedLines > maxLinesPerPage && currentPageLines.length > 0) {
        allPages.push(currentPageLines.join('\n\n'));
        globalPageIndex++;
        currentPageLines = [paragraph];
        currentLineCount = estimatedLines;
      } else {
        currentPageLines.push(paragraph);
        currentLineCount += estimatedLines;
      }
    }

    // 2. CRITICAL CHANGE: Force page break at chapter end.
    // Whatever is remaining in currentPageLines gets its own page, 
    // guaranteeing the NEXT chapter starts clean on globalPageIndex + 1.
    if (currentPageLines.length > 0) {
      allPages.push(currentPageLines.join('\n\n'));
      globalPageIndex++;
      currentPageLines = [];
      currentLineCount = 0;
    }
  }

  return {
    allPages,
    chapterStartIndices,
    totalChapters: chapterNumbers.length,
  };
}
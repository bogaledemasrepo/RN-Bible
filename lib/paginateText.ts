// ==========================================
// Constants & Layout Config

import { Dimensions } from 'react-native';

// ==========================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;
// Estimated characters per line for Fidel script at FONT_SIZE = 17
const CHARS_PER_LINE = Math.floor((SCREEN_WIDTH - 48) / (FONT_SIZE * 0.6));

// ==========================================
// Helper Functions
// ==========================================
export function paginateText(
  content: string,
  availableHeight: number
): string[] {
  // Account for header, footer & padding inside usable screen space
  const usableHeight = availableHeight - 120;
  const maxLinesPerPage = Math.floor(usableHeight / LINE_HEIGHT);

  const verses = content.split('\n').filter((line) => line.trim().length > 0);
  const paginatedPages: string[] = [];

  let currentChunk: string[] = [];
  let currentLineCount = 0;

  verses.forEach((verse) => {
    // Estimate lines taken by this verse when wrapping
    const estimatedLines = Math.max(
      1,
      Math.ceil(verse.length / CHARS_PER_LINE)
    );

    if (currentLineCount + estimatedLines > maxLinesPerPage) {
      paginatedPages.push(currentChunk.join('\n'));
      currentChunk = [verse];
      currentLineCount = estimatedLines;
    } else {
      currentChunk.push(verse);
      currentLineCount += estimatedLines;
    }
  });

  if (currentChunk.length > 0) {
    paginatedPages.push(currentChunk.join('\n\n'));
  }

  return paginatedPages;
}

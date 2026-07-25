import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { PageCurlHandle } from '../types';
import { books } from '../constants';
import PageCurl from '../components/page';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;

interface RawVerseRow {
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  name_am: string;
}

interface PageItem {
  text: string;
  chapterNumber: number;
  pageInChapter: number;
  totalChapterPages: number;
}

interface PaginatedBookResult {
  allPages: PageItem[];
  chapterStartIndices: Record<number, number>;
  totalChapters: number;
}

// ==========================================
// Helper: Paginate Full Book with Clean Chapter Breaks
// ==========================================
function paginateBookText(
  chaptersData: Record<number, string[]>,
  containerHeight: number,
  lineHeight = 28
): PaginatedBookResult {
  const allPages: PageItem[] = [];
  const chapterStartIndices: Record<number, number> = {};

  const availableHeight = containerHeight - 120; // Room for headers/footers
  const maxLinesPerPage = Math.floor(availableHeight / lineHeight);

  const chapterNumbers = Object.keys(chaptersData)
    .map(Number)
    .sort((a, b) => a - b);

  let globalPageIndex = 0;

  for (const chapNum of chapterNumbers) {
    chapterStartIndices[chapNum] = globalPageIndex;

    const verses = chaptersData[chapNum];
    const paragraphs = verses.join('\n\n').split('\n\n');

    let currentPageLines: string[] = [];
    let currentLineCount = 0;
    let pageInChapter = 1;

    const chapterTempPages: string[] = [];

    for (const paragraph of paragraphs) {
      // Line count estimate (~42 chars per line on mobile)
      const estimatedLines = Math.ceil(paragraph.length / 42) + 1;

      if (currentLineCount + estimatedLines > maxLinesPerPage && currentPageLines.length > 0) {
        chapterTempPages.push(currentPageLines.join('\n\n'));
        currentPageLines = [paragraph];
        currentLineCount = estimatedLines;
      } else {
        currentPageLines.push(paragraph);
        currentLineCount += estimatedLines;
      }
    }

    if (currentPageLines.length > 0) {
      chapterTempPages.push(currentPageLines.join('\n\n'));
    }

    // Map temp pages to final metadata-enriched PageItem objects
    const totalChapterPages = chapterTempPages.length;
    chapterTempPages.forEach((pageText, idx) => {
      allPages.push({
        text: pageText,
        chapterNumber: chapNum,
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

// ==========================================
// Main Reader Component
// ==========================================
export function AutoPaginatedReader() {
  const db = useSQLiteContext();
  const curlRef = useRef<PageCurlHandle>(null);

  const [bookIndex, setBookIndex] = useState<number>(0);
  const [paginatedBook, setPaginatedBook] = useState<PaginatedBookResult | null>(null);
  const [bookName, setBookName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const activeBookMeta = books[bookIndex] || books[0];

  // Fetch and Paginate Entire Book
  const loadAndPaginateBook = useCallback(
    async (targetBookId: number) => {
      setLoading(true);
      try {
        // AutoPaginatedReader.tsx - Memory Safe SQLite Fetch
        const rows = await db.getAllAsync<RawVerseRow>(
          `SELECT c.chapter_number, v.verse_number, v.verse_text, b.name_am
          FROM books b
          JOIN chapters c ON b.book_id = c.book_id
          JOIN verses v ON c.chapter_id = v.chapter_id
          WHERE b.book_id = ?
          ORDER BY c.chapter_number ASC, v.verse_number ASC;`,
          [targetBookId]
        );

        if (rows && rows.length > 0) {
          setBookName(rows[0].name_am || activeBookMeta.name_am);

          // Group by Chapter Number
          const chaptersData: Record<number, string[]> = {};
          for (const row of rows) {
            if (!chaptersData[row.chapter_number]) {
              chaptersData[row.chapter_number] = [];
            }
            chaptersData[row.chapter_number].push(
              `${row.verse_number}. ${row.verse_text.trim()}`
            );
          }

          // Paginate entire book with forced page breaks per chapter
          const result = paginateBookText(chaptersData, SCREEN_HEIGHT, LINE_HEIGHT);
          setPaginatedBook(result);
        }
      } catch (error) {
        console.error('Error paginating entire book:', error);
      } finally {
        setLoading(false);
      }
    },
    [db, activeBookMeta.name_am]
  );

  useEffect(() => {
    loadAndPaginateBook(activeBookMeta.book_id);
  }, [bookIndex]);

  // Book Boundary Handlers
  const handleReachEnd = useCallback(() => {
    if (bookIndex < books.length - 1) {
      setBookIndex((prev) => prev + 1);
    }
  }, [bookIndex]);

  const handleReachStart = useCallback(() => {
    if (bookIndex > 0) {
      setBookIndex((prev) => prev - 1);
    }
  }, [bookIndex]);

  if (loading || !paginatedBook) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b0000" />
        <Text style={styles.loadingText}>
          {activeBookMeta.name_am} በመጫን ላይ...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageCurl
        key={`book-${activeBookMeta.book_id}`}
        ref={curlRef}
        data={paginatedBook.allPages}
        initialIndex={0}
        onReachEnd={handleReachEnd}
        onReachStart={handleReachStart}
        gestureEnabled={true}
        renderPage={({ item, index }: { item: PageItem; index: number }) => (
          <View style={styles.pageCard}>
            <Text style={styles.chapterTitle}>
              {`${bookName} - ምዕራፍ ${item.chapterNumber}`}
            </Text>
            <Text style={styles.pageText}>{item.text}</Text>
            <Text style={styles.pageFooter}>
              ምዕራፍ {item.chapterNumber} | ገጽ {item.pageInChapter} / {item.totalChapterPages}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  pageCard: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1e293b',
  },
  pageText: {
    flex: 1,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#1e293b',
  },
  pageFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
});
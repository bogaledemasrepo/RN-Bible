import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageCurlHandle } from '../types';
import { books } from '../constants';
import PageCurl from '../components/page';
import { NavigationModal } from '../components/navigation-modal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 16;
const LINE_HEIGHT = 24;

interface RawVerseRow {
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

interface PaginatedBookResult {
  allPages: PageItem[];
  chapterStartIndices: Record<number, number>;
  totalChapters: number;
}

interface ParsedVerse {
  verseNum: number;
  text: string;
}

// ==========================================
// Helper: Paginate Full Book with Clean Chapter Breaks & Verse Bounds
// ==========================================
function paginateBookText(
  chaptersData: Record<number, ParsedVerse[]>,
  containerHeight: number,
  lineHeight = 28
): PaginatedBookResult {
  const allPages: PageItem[] = [];
  const chapterStartIndices: Record<number, number> = {};

  // Space reserved for headers & footers (paddingTop + paddingBottom + header offset)
  const availableHeight = containerHeight - 120;
  const maxLinesPerPage = Math.floor(availableHeight / lineHeight);

  const chapterNumbers = Object.keys(chaptersData)
    .map(Number)
    .sort((a, b) => a - b);

  let globalPageIndex = 0;

  for (const chapNum of chapterNumbers) {
    chapterStartIndices[chapNum] = globalPageIndex;

    const verses = chaptersData[chapNum];
    let currentPageVerses: ParsedVerse[] = [];
    let currentLineCount = 0;

    const chapterTempPages: { text: string; startVerse: number; endVerse: number }[] = [];

    for (const verse of verses) {
      const formattedVerse = `${verse.verseNum}. ${verse.text.trim()}`;
      // Estimate lines required based on character length (~42 chars per line)
      const estimatedLines = Math.ceil(formattedVerse.length / 42) + 1;

      if (currentLineCount + estimatedLines > maxLinesPerPage && currentPageVerses.length > 0) {
        // Push current page payload
        chapterTempPages.push({
          text: currentPageVerses.map((v) => `${v.verseNum}. ${v.text.trim()}`).join('\n'),
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

    // Flush any remaining verses for the chapter
    if (currentPageVerses.length > 0) {
      chapterTempPages.push({
        text: currentPageVerses.map((v) => `${v.verseNum}. ${v.text.trim()}`).join('\n\n'),
        startVerse: currentPageVerses[0].verseNum,
        endVerse: currentPageVerses[currentPageVerses.length - 1].verseNum,
      });
    }

    // Convert raw page buffers to metadata-enriched PageItem instances
    const totalChapterPages = chapterTempPages.length;
    chapterTempPages.forEach((page, idx) => {
      allPages.push({
        text: page.text,
        chapterNumber: chapNum,
        startVerse: page.startVerse,
        endVerse: page.endVerse,
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

  const [navModalVisible, setNavModalVisible] = useState<boolean>(false);
  const [pendingChapterJump, setPendingChapterJump] = useState<number | null>(null);

  const activeBookMeta = books[bookIndex] || books[0];

  // Fetch and Paginate Entire Book from SQLite
  const loadAndPaginateBook = useCallback(
    async (targetBookId: number) => {
      setLoading(true);
      try {
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

          // Group raw database records into structured chapter objects
          const chaptersData: Record<number, ParsedVerse[]> = {};
          for (const row of rows) {
            if (!chaptersData[row.chapter_number]) {
              chaptersData[row.chapter_number] = [];
            }
            chaptersData[row.chapter_number].push({
              verseNum: row.verse_number,
              text: row.verse_text,
            });
          }

          // Compute pagination layout with chapter page breaks
          const result = paginateBookText(chaptersData, SCREEN_HEIGHT, LINE_HEIGHT);
          setPaginatedBook(result);
        }
      } catch (error) {
        console.error('Error paginating book:', error);
      } finally {
        setLoading(false);
      }
    },
    [db, activeBookMeta.name_am]
  );

  // Load book whenever active book selection changes
  useEffect(() => {
    loadAndPaginateBook(activeBookMeta.book_id);
  }, [activeBookMeta.book_id, loadAndPaginateBook]);

  // Handle selection from NavigationModal
  const handleJumpToTarget = useCallback(
    (targetBookIndex: number, targetChapterNumber: number) => {
      if (targetBookIndex === bookIndex) {
        // Same book: Jump immediately to calculated index
        if (paginatedBook?.chapterStartIndices[targetChapterNumber] !== undefined) {
          const targetPageIndex = paginatedBook.chapterStartIndices[targetChapterNumber];
          curlRef.current?.jumpTo?.(targetPageIndex);
        }
      } else {
        // Different book: Queue target chapter jump and trigger book load
        setPendingChapterJump(targetChapterNumber);
        setBookIndex(targetBookIndex);
      }
    },
    [bookIndex, paginatedBook]
  );

  // Auto-jump after new book completes loading
  useEffect(() => {
    if (!loading && paginatedBook && pendingChapterJump !== null) {
      const targetPageIndex = paginatedBook.chapterStartIndices[pendingChapterJump] ?? 0;
      setTimeout(() => {
        curlRef.current?.jumpTo?.(targetPageIndex);
        setPendingChapterJump(null);
      }, 100);
    }
  }, [loading, paginatedBook, pendingChapterJump]);

  // Handle Reader Book Boundaries
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Interactive Navigation Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setNavModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitleText}>{`${bookName} ▾`}</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Modal Picker */}
      <NavigationModal
        visible={navModalVisible}
        onClose={() => setNavModalVisible(false)}
        onSelectTarget={handleJumpToTarget}
      />

      {/* Skia 3D Page Reader */}
      <PageCurl
        key={`book-${activeBookMeta.book_id}`}
        ref={curlRef}
        data={paginatedBook.allPages}
        initialIndex={0}
        onReachEnd={handleReachEnd}
        onReachStart={handleReachStart}
        gestureEnabled={true}
        renderPage={({ item }: { item: PageItem; index: number }) => (
          <View style={styles.pageCard}>
            <Text style={styles.chapterTitle}>
              {`${bookName} - ምዕራፍ ${item.chapterNumber}`}
            </Text>
            <Text style={styles.pageText}>{item.text}</Text>
            <Text style={styles.pageFooter}>
              ምዕራፍ {item.chapterNumber} ({item.startVerse > 0 ? `ቁጥር ${item.startVerse}-${item.endVerse}` : ''}) | ገጽ {item.pageInChapter} / {item.totalChapterPages}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
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
  headerBar: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  pageCard: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 44,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 24,
    paddingTop: 24,
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
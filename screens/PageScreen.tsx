import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import PageCurl from '../components/page';
import { PageCurlHandle } from '../types';
import { paginateText } from '../lib/paginateText';

// ==========================================
// Constants & Layout Config
// ==========================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;
// Estimated characters per line for Fidel script at FONT_SIZE = 17
const CHARS_PER_LINE = Math.floor((SCREEN_WIDTH - 48) / (FONT_SIZE * 0.6));

// ==========================================
// Main Component
// ==========================================
export function AutoPaginatedReader({ route }: any) {

  const db = useSQLiteContext();
  const curlRef = useRef<PageCurlHandle>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]);
  const { bookId, bookName, initialChapter = 1 } = route.params || {bookId: 1, bookName: "ኦሪት ዘፍጥረት", initialChapter: 1};
  const [chapter, setChapter] = useState<number>(initialChapter);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialPageIndex, setInitialPageIndex] = useState<number>(0);


  // 2. Fetch and paginate text whenever 'chapter' changes
  const loadChapter = useCallback(async (targetChapter: number, startAtEnd = false) => {
    setLoading(true);
    try {
      // Query the database for chapter content
      const result = await db.getAllAsync<{ verse_text: string }>(
          `SELECT v.verse_text
           FROM books b
           JOIN chapters c ON b.book_id = c.book_id
           JOIN verses v ON c.chapter_id = v.chapter_id
           WHERE b.book_id = ? AND c.chapter_number = ?
           ORDER BY v.verse_number ASC;`,
          [bookId, targetChapter]
        );

      if (result && result.length > 0) {
        // Paginate the raw Amharic text
        const calculatedPages = paginateText(result.map((r) => r.verse_text).join('\n'), SCREEN_HEIGHT - 72); // Adjust for padding and header/footer
        
        setPages(calculatedPages);
        setChapter(targetChapter);

        // If swiping back into a previous chapter, start on its final page
        setInitialPageIndex(startAtEnd ? calculatedPages.length - 1 : 0);
      }
    } catch (error) {
      console.error("Error loading chapter:", error);
    } finally {
      setLoading(false);
    }
  }, [db, bookId]);

  useEffect(() => {
    loadChapter(chapter);
  }, []);

  // 3. Callback Handlers
  const handleNextChapter = () => {
    console.log("Reached end of chapter. Loading next chapter...");
    loadChapter(chapter + 1, false); // Load next, start on page 0
  };

  const handlePrevChapter = () => {
    console.log("Reached start of chapter. Loading previous chapter...");
    if (chapter > 1) {
      loadChapter(chapter - 1, true); // Load prev, start on last page
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b0000" />
        <Text style={styles.loadingText}>ምዕራፍ {chapter} በመጫን ላይ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageCurl
        ref={curlRef}
        data={pages}
        onReachEnd={handleNextChapter}
        onReachStart={handlePrevChapter}
        gestureEnabled={true}
        chapterTitle={`${bookName || 'ኦሪት ዘፍጥረት'} - ምዕራፍ ${chapter}`}
        renderPage={({ item, index }) => (
          <View style={styles.pageCard} key={index}>
            <Text style={styles.chapterTitle}>{bookName}</Text>
            <Text style={styles.pageText}>{item}</Text>
            <Text style={styles.pageFooter}>
              ገጽ {index + 1} / {pages.length}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

// ==========================================
// Styles
// ==========================================
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
  hiddenMeasuringView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  measuringText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
  },
  pageCard: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
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
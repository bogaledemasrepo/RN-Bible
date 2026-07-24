import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import PageCurl from '../components/page';
import { PageCurlHandle } from '../types';
import { loadChapterContent } from '../lib/services';

// ==========================================
// Constants & Layout Config
// ==========================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;
// Estimated characters per line for Fidel script at FONT_SIZE = 17
const CHARS_PER_LINE = Math.floor((SCREEN_WIDTH - 48) / (FONT_SIZE * 0.6));

// ==========================================
// Helper Functions
// ==========================================
function paginateText(content: string, availableHeight: number): string[] {
  // Account for header, footer & padding inside usable screen space
  const usableHeight = availableHeight - 120;
  const maxLinesPerPage = Math.floor(usableHeight / LINE_HEIGHT);

  const verses = content.split('\n').filter((line) => line.trim().length > 0);
  const paginatedPages: string[] = [];

  let currentChunk: string[] = [];
  let currentLineCount = 0;

  verses.forEach((verse) => {
    // Estimate lines taken by this verse when wrapping
    const estimatedLines = Math.max(1, Math.ceil(verse.length / CHARS_PER_LINE));

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

// ==========================================
// Main Component
// ==========================================
export function AutoPaginatedReader({ route }: any) {
  const db = useSQLiteContext();
  const curlRef = useRef<PageCurlHandle>(null);
  

  const [chapterContent, setChapterContent] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(true);

  const {
    bookId = 1,
    chapterNumber = 2,
    bookName = 'መጽሐፍ ቅዱስ',
  } = route?.params || {};

  // 1. Fetch Chapter Content from SQLite
  useEffect(() => {
    setIsMeasuring(true);
    loadChapterContent(db, bookId, chapterNumber).then(res => setChapterContent(res || '')).catch((err) => {
      console.error('Failed to load chapter content:', err);
      setChapterContent('');
    }).finally(() => setIsMeasuring(false));
  }, [db, bookId, chapterNumber]);

  // 2. Measure Height and Paginate Content
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!chapterContent) return;

      const { height } = event.nativeEvent.layout;
      const paginatedPages = paginateText(chapterContent, height);

      setPages(paginatedPages);
      setIsMeasuring(false);
    },
    [chapterContent]
  );

  // Loading Screen while database or layout measurements execute
  if (isMeasuring || !chapterContent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>ገጾችን በማዘጋጀት ላይ...</Text>

        {/* Hidden View used exclusively for frame layout measurement */}
        <View style={styles.hiddenMeasuringView} onLayout={handleLayout}>
          <Text style={styles.measuringText} key={chapterContent}>
            {chapterContent}
          </Text>
        </View>
      </View>
    );
  }
  // console.log("Chapter content loaded. Total pages:", pages.length);
  // 3. Main Reader View
  return (
    <View style={styles.container}>
      <PageCurl
        ref={curlRef}
        data={pages}
        gestureEnabled={true}
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
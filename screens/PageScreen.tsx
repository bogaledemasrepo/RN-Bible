import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import PageCurl from '../components/page';
import { PageCurlHandle } from '../types';
import { useSQLiteContext } from 'expo-sqlite';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;
// Average characters per line for Fidel script at FONT_SIZE=17 on standard mobile screens
const CHARS_PER_LINE = Math.floor((SCREEN_WIDTH - 48) / (FONT_SIZE * 0.6));

export function AutoPaginatedReader({ route }: any) {
  const [pages, setPages] = useState<string[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(true);
  const curlRef = useRef<PageCurlHandle>(null);

  const db = useSQLiteContext();
  const [chapterContent, setChapterContent] = useState<string>('');

  const { bookId = 1, chapterNumber = 2, bookName = 'መጽሐፍ ቅዱስ' } = route?.params || {};

  // Fetch SQLite content dynamically
  useEffect(() => {
    async function loadData() {
      try {
        const result = await db.getAllAsync<{ verse_text: string }>(
          `SELECT v.verse_text
            FROM books b
            JOIN chapters c ON b.book_id = c.book_id
            JOIN verses v ON c.chapter_id = v.chapter_id
            WHERE b.book_id = ? 
              AND c.chapter_number = ?
            ORDER BY v.verse_number ASC;`,
          [bookId, chapterNumber]
        );
        if (result) {
          setChapterContent(result.map((row , index)=> `${index + 1}`+'. '+row.verse_text).join('\n'));
        }
      } catch (err) {
        console.error("Error reading database:", err);
      }
    }
    loadData();
  }, [chapterNumber]);

  // Accurate Auto-Paging Algorithm
  const handleLayout = (event: LayoutChangeEvent) => {
    if (!chapterContent) return;

    const { height } = event.nativeEvent.layout;

    // Space reserved for margins, padding & header title
    const usableHeight = height - 120;
    const maxLinesPerPage = Math.floor(usableHeight / LINE_HEIGHT);

    const verses = chapterContent.split('\n').filter(line => line.trim().length > 0);
    const paginatedPages: string[] = [];

    let currentChunk: string[] = [];
    let currentLineCount = 0;

    verses.forEach((verse) => {
      // Calculate how many lines this verse takes when wrapped on device screen
      const estimatedLines = Math.max(1, Math.ceil(verse.length / CHARS_PER_LINE));

      if (currentLineCount + estimatedLines > maxLinesPerPage) {
        // Push current page and start a new page
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
    setPages(paginatedPages);
    setIsMeasuring(false);
  };

  if (isMeasuring || !chapterContent) {
    return (
      <View style={styles.measuringContainer}>
        <Text
          key={chapterContent} // 👈 Forces text re-measurement when text updates
          onLayout={(e) => {
            const { height, width } = e.nativeEvent.layout;
            handleLayout(e);
          }}
        >
          {chapterContent}
        </Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  measuringContainer: {
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
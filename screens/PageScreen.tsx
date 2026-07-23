import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import PageCurl from '../components/page';
import { Book, PageCurlHandle } from '../types';
import { useSQLiteContext } from 'expo-sqlite';
// import PageCurl, { PageCurlHandle } from './PageCurl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Typography configuration
const FONT_SIZE = 17;
const LINE_HEIGHT = 28;

interface AutoPaginatedReaderProps {
  fullText: string;
  title?: string;
}
const title="መዝሙረ ዳዊት"
const LONG_BIBLE_TEXT = `12. እስራኤልም ሰምቶኝ ቢሆን፥ እግዚአብሔር እንዲህ ይላል፡
13. በጠላቶቻቸው ላይ እጄን በጣልኩ፥ ጠላቶቻቸውን ባዋረድኩ ነበር።
14. የእግዚአብሔር ጠላቶች ይዋሹታል፥ ጊዜያቸውም እስከ ዘላለም ይሆናል።
15. ከሰሜን ስንዴ ያበላቸዋል፥ ከድንጋይም ማር ያጠግባቸዋል።
16. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤
17. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር።
18. በመባቻ በቀን መለከትን ነፉ፥ በከበረ በዓላችን ቀን።
19. ለእስራኤል ሥርዓት ነውና፥ ለያዕቆብም አምላክ ፍርድ።
20. ከግብፅ ምድር በወጣ ጊዜ ለዮሴፍ ምስክር አደረገው፤
21. ያልተረዳሁትን ቋንቋ ሰማሁ፡- ጫንቃውን ከሸክም አራቅሁ፥ እጆቹም ከቅርጫት ወጡ።
22. በመከራ ጠራኸኝ አዳንሁህም፤ በዐውሎ ነፋስ መሸሸጊያ መለስሁልህ፤ በክርክር ውኃ ዘንድ ፈተንሁህ።
23. በጠላቶቻቸው ላይ እጄን በጣልኩ፥ ጠላቶቻቸውን ባዋረድኩ ነበር።
24. የእግዚአብሔር ጠላቶች ይዋሹታል፥ ጊዜያቸውም እስከ ዘላለም ይሆናል።
25. ከሰሜን ስንዴ ያበላቸዋል፥ ከድንጋይም ማር ያጠግባቸዋል።
26. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤
27. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር።
28. በመባቻ በቀን መለከትን ነፉ፥ በከበረ በዓላችን ቀን።
29. ለእስራኤል ሥርዓት ነውና፥ ለያዕቆብም አምላክ ፍርድ።
30. ከግብፅ ምድር በወጣ ጊዜ ለዮሴፍ ምስክር አደረገው፤
31. ያልተረዳሁትን ቋንቋ ሰማሁ፡- ጫንቃውን ከሸክም አራቅሁ፥ እጆቹም ከቅርጫት ወጡ።
32. በመከራ ጠራኸኝ አዳንሁህም፤ በዐውሎ ነፋስ መሸሸጊያ መለስሁልህ፤ በክርክር ውኃ ዘንድ ፈተንሁህ።
33. በጠላቶቻቸው ላይ እጄን በጣልኩ፥ ጠላቶቻቸውን ባዋረድኩ ነበር።
34. የእግዚአብሔር ጠላቶች ይዋሹታል፥ ጊዜያቸውም እስከ ዘላለም ይሆናል።
35. ከሰሜን ስንዴ ያበላቸዋል፥ ከድንጋይም ማር ያጠግባቸዋል።
36. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤
37. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር።
38. በመባቻ በቀን መለከትን ነፉ፥ በከበረ በዓላችን ቀን።
39. ለእስራኤል ሥርዓት ነውና፥ ለያዕቆብም አምላክ ፍርድ።
40. ከግብፅ ምድር በወጣ ጊዜ ለዮሴፍ ምስክር አደረገው፤
41. ያልተረዳሁትን ቋንቋ ሰማሁ፡- ጫንቃውን ከሸክም አራቅሁ፥ እጆቹም ከቅርጫት ወጡ።
42. በመከራ ጠራኸኝ አዳንሁህም፤ በዐውሎ ነፋስ መሸሸጊያ መለስሁልህ፤ በክርክር ውኃ ዘንድ ፈተንሁህ።`;

export function AutoPaginatedReader() {
  const [pages, setPages] = useState<string[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(true);
  const curlRef = useRef<PageCurlHandle>(null);

  const db = useSQLiteContext();
  const [books, setBooks] = useState<Book[]>([]);

  // Measure container height to calculate lines per page
  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    // Account for padding and header space
    const availableHeight = height - 100; 
    const linesPerPage = Math.floor(availableHeight / LINE_HEIGHT);

    // Split text by lines and group into pages
    const lines = LONG_BIBLE_TEXT.split('\n');
    const paginatedChunks: string[] = [];
    let currentChunk: string[] = [];

    lines.forEach((line, index) => {
      currentChunk.push(line);
      if (currentChunk.length >= linesPerPage) {
        paginatedChunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
    });

    if (currentChunk.length > 0) {
      paginatedChunks.push(currentChunk.join('\n'));
    }

    setPages(paginatedChunks);
    setIsMeasuring(false);
  };

  useEffect(() => {
    async function setup() {
      const result = await db.getAllAsync<Book>('SELECT * FROM books');
      setBooks(result);
    }
    setup();
  }, []);

  if (isMeasuring) {
    return (
      <View style={styles.measuringContainer} onLayout={handleLayout}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading pages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageCurl
        ref={curlRef}
        data={pages}
        gestureEnabled={true}
        renderPage={({ item, index }) =>(
          <View style={styles.pageCard} key={index}>
            {title && <Text style={styles.chapterTitle}>{title}</Text>}
            <Text style={styles.pageText}>{item}</Text>
            <Text style={styles.pageFooter}>
              {index + 1} / {pages.length}
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
    color: '#666',
  },
  pageCard: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C2C2C',
  },
  pageText: {
    flex: 1,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#1A1A1A',
  },
  pageFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
});
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { useSQLiteContext } from "expo-sqlite";
import { useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootDrawerParamList } from "../types";

const SWIPE_THRESHOLD = 80;
const PageScreen = () => {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootDrawerParamList, "BookReader">>();

  const { bookId, bookName, chapterNumber } = route.params || {
    bookId: 1,
    bookName: "ኦሪት ዘፍጥረት",
    chapterNumber: 1,
  };

  const [verses, setVerses] = useState<any[]>([]);
  const [preVerses, setPreVerses] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [nextVerses, setNextVerses] = useState<any[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [maxChapter, setMaxChapter] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    if (translationX > SWIPE_THRESHOLD && selectedChapter > 1) {
      navigateBack();
    } else if (translationX < -SWIPE_THRESHOLD) {
      navigateNext();
    }
  };
  const getMaxChapter = async (id: number) => {
    const result: any = await db.getFirstAsync(
      `SELECT MAX(chapter_number) as maxCh FROM chapters WHERE book_id = ?`,
      [id]
    );
    console.log(result);
    setMaxChapter(result?.maxCh || 1);
  };
  async function fetchVerses(id: number, chapterNum: number) {
    return await db.getAllAsync(
      `SELECT v.verse_number, v.verse_text 
           FROM verses v
           JOIN chapters c ON v.chapter_id = c.chapter_id
           WHERE c.book_id = ? AND c.chapter_number = ?
           ORDER BY v.verse_number ASC`,
      [id, chapterNum]
    );
  }
  const navigateNext = async () => {
    if (selectedChapter == maxChapter) return;
    setPreVerses(verses);
    setVerses(nextVerses);
    fetchVerses(bookId, selectedChapter + 1).then((verses) => {
      setSelectedChapter(selectedChapter + 1);
      setNextVerses(verses);
    });
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const navigateBack = async () => {
    if (selectedChapter == 1) return;
    setNextVerses(verses);
    setVerses(preVerses);
    fetchVerses(bookId, selectedChapter - 1).then((verses) => {
      setSelectedChapter(selectedChapter - 1);
      setPreVerses(verses);
    });
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  useEffect(() => {
    getMaxChapter(bookId);
    setSelectedChapter(chapterNumber);
    fetchVerses(bookId, selectedChapter).then((verses) => setVerses(verses));
    fetchVerses(bookId, selectedChapter + 1).then((verses) =>
      setNextVerses(verses)
    );
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [bookId]);
  const renderVerse = ({ item }: any) => (
    <View style={styles.verseContainer}>
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{item.verse_number}</Text>
        {"  "}
        {item.verse_text}
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler activeOffsetX={[-20, 20]} onEnded={onGestureEvent}>
        <SafeAreaView style={styles.container}>
          <Animated.FlatList
            ref={flatListRef}
            data={verses}
            keyExtractor={(item: any) => item.verse_number.toString()}
            renderItem={renderVerse}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.mainTitle}>{bookName}</Text>
                <Text style={styles.chapterSubtitle}>
                  ምዕራፍ {selectedChapter}
                </Text>
                <View style={styles.accentDots}>
                  <View style={styles.dot} />
                  <View style={[styles.dot, styles.dotLarge]} />
                  <View style={styles.dot} />
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    selectedChapter == 1 && styles.disabledBtn,
                  ]}
                  onPress={navigateBack}
                  disabled={selectedChapter <= 1}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={selectedChapter == 1 ? "#cbd5e1" : "#6366f1"}
                  />
                  <Text
                    style={[
                      styles.navBtnText,
                      selectedChapter == 1 && styles.disabledBtnText,
                    ]}
                  >
                    የቀደመው
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    selectedChapter == maxChapter && styles.disabledBtn,
                  ]}
                  onPress={navigateNext}
                  disabled={selectedChapter == maxChapter}
                >
                  <Text
                    style={[
                      styles.navBtnText,
                      selectedChapter == maxChapter && styles.disabledBtnText,
                    ]}
                  >
                    ቀጣይ
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={
                      selectedChapter == maxChapter ? "#cbd5e1" : "#6366f1"
                    }
                  />
                </TouchableOpacity>
              </View>
            }
          />
        </SafeAreaView>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 24, paddingBottom: 60 },

  // Header Design
  header: { alignItems: "center", marginTop: 40, marginBottom: 30 },
  bookBadge: {
    backgroundColor: "#f5f3ff",
    color: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
  },
  chapterSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "400",
  },
  accentDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0" },
  dotLarge: { width: 24, backgroundColor: "#6366f1" },

  // Verse Design
  verseContainer: { marginBottom: 8 },
  verseText: {
    fontSize: 14,
    color: "#334155",
    textAlign: "left",
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6366f1",
    position: "relative",
    top: -4,
  },

  // Footer Design
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 60,
    paddingBottom: 40,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  navBtnText: { fontSize: 16, fontWeight: "600", color: "#6366f1" },
  disabledBtn: { backgroundColor: "#fff", borderColor: "#fff" },
  disabledBtnText: { color: "#cbd5e1" },
});

export default PageScreen;

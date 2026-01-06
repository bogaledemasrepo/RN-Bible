import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { usePages } from "../context/use-pages-context";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the type for our navigation params
type RootStackParamList = {
  Page: {
    bookId: number;
    bookName: string;
    chapterNumber: number;
  };
};

interface Verse {
  verse_number: number;
  verse_text: string;
}

const PageScreen = () => {
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "Page">>();
  
  // Destructure params passed from HomeScreen or setParams
  const { bookId, bookName, chapterNumber } = route.params;
  
  const { navigateTo} = usePages();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // 1. Sync the Global Context whenever params change
  useEffect(() => {
    navigateTo(bookId, bookName, chapterNumber);
  }, [bookId, chapterNumber]);

  // 2. Fetch verses from SQLite based on current params
  useEffect(() => {
    async function fetchVerses() {
      setIsLoading(true);
      try {
        const result = await db.getAllAsync<Verse>(
          `SELECT v.verse_number, v.verse_text 
           FROM verses v
           JOIN chapters c ON v.chapter_id = c.chapter_id
           WHERE c.book_id = ? AND c.chapter_number = ?
           ORDER BY v.verse_number ASC`,
          [bookId, chapterNumber]
        );
        
        setVerses(result);
        
        // Always jump back to top when chapter changes
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      } catch (error) {
        console.error("Query Error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVerses();
  }, [bookId, chapterNumber]);

  // Navigation handlers using setParams
  const goToNext = () => {
    navigation.setParams({ chapterNumber: chapterNumber + 1 });
  };

  const goToPrev = () => {
    if (chapterNumber > 1) {
      navigation.setParams({ chapterNumber: chapterNumber - 1 });
    }
  };

  const renderVerse = ({ item }: { item: Verse }) => (
    <View style={styles.verseRow}>
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{item.verse_number} </Text>
        {item.verse_text}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b0000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={verses}
        keyExtractor={(item) => item.verse_number.toString()}
        renderItem={renderVerse}
        contentContainerStyle={styles.listPadding}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.bookTitle}>{bookName}</Text>
            <Text style={styles.chapterTitle}>ምዕራፍ {chapterNumber}</Text>
            <View style={styles.divider} />
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <TouchableOpacity 
              style={[styles.navButton, chapterNumber === 1 && styles.disabledButton]} 
              onPress={goToPrev}
              disabled={chapterNumber === 1}
            >
              <Text style={styles.navButtonText}>የቀደመው</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navButton} onPress={goToNext}>
              <Text style={styles.navButtonText}>ቀጣይ</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listPadding: {
    paddingHorizontal: 12,
  },
  header: {
    alignItems: "center",
  },
  bookTitle: {
    fontFamily: "Ethiopic-Bold",
    fontSize: 24,
    color: "#1a1a1a",
  },
  chapterTitle: {
    fontFamily: "Ethiopic-Regular",
    fontSize: 20,
    color: "#555",
    marginTop: 5,
  },
  divider: {
    height: 3,
    backgroundColor: "#8b0000",
    width: 50,
    marginTop: 8,
  },
  verseRow: {
    marginBottom: 8,
  },
  verseText: {
    fontFamily: "Ethiopic-Regular",
    fontSize: 14,
    color: "#2c3e50",
  },
  verseNumber: {
    fontFamily: "Ethiopic-Bold",
    fontSize: 16,
    color: "#8b0000",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navButton: {
    backgroundColor: "#f9f9f9",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    minWidth: 130,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.2,
  },
  navButtonText: {
    fontFamily: "Ethiopic-Bold",
    fontSize: 17,
    color: "#8b0000",
  },
});

export default PageScreen;
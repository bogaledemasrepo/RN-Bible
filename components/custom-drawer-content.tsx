import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useSQLiteContext } from "expo-sqlite";
import { Book } from "../types";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // Assuming you have Expo icons

export function CustomDrawerContent(props: any) {
  const [navData, setNavData] = useState<Book[]>([]);
  const [activeBar, setActiveBar] = useState<1 | 2>(1);
  const { navigation, state } = props; // state helps track which route is active
  const db = useSQLiteContext();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    db.getAllAsync("SELECT * FROM books").then((res) => {
      const fetchedBooks = res as Book[];
      setBooks(fetchedBooks);
      setNavData(fetchedBooks.filter((item) => item.testament === "old"));
    });
  }, []);

  const handlePress = (param: 1 | 2) => {
    setActiveBar(param);
    setNavData(
      books.filter((item) => item.testament === (param === 1 ? "old" : "new"))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandSection}>
        <Ionicons name="book" size={32} color="#6366f1" />
        <Text style={styles.brandText}>መጽሐፍ ቅዱስ</Text>
      </View>
      <View style={styles.segmentedControlWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            onPress={() => handlePress(1)}
            style={[styles.segment, activeBar === 1 && styles.activeSegment]}
          >
            <Text
              style={[
                styles.segmentText,
                activeBar === 1 && styles.activeSegmentText,
              ]}
            >
              ብሉይ ኪዳን
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePress(2)}
            style={[styles.segment, activeBar === 2 && styles.activeSegment]}
          >
            <Text
              style={[
                styles.segmentText,
                activeBar === 2 && styles.activeSegmentText,
              ]}
            >
              አዲስ ኪዳን
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.listContainer}>
          {navData.map((book,index) => {
            const isSelected = state.routes[state.index].params?.bookId === book.book_id;
            return (
              <TouchableOpacity
                key={book.book_id}
                style={[styles.bookItem, isSelected && styles.bookItemActive]}
                onPress={() => {
                  navigation.navigate("BookReader", {
                    bookId: book.book_id,
                    bookName: book.name_am,
                    chapterNumber:1
                  });
                }}
              >
                <View>
                  <Text>
                    {index+1}. 
                  </Text>
                </View>
                <Text
                  style={[
                    styles.bookLabel,
                    isSelected && styles.bookLabelActive,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {" "+book.name_am}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isSelected ? "#6366f1" : "#cbd5e1"}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  brandSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  segmentedControlWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 4,
  },
  activeSegment: {
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  activeSegmentText: {
    color: "#6366f1",
  },
  scrollContent: {
    paddingTop: 0,
  },
  listContainer: {
    paddingHorizontal: 12,
  },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  bookItemActive: {
    backgroundColor: "#f5f3ff",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: "#6366f1",
  },
  iconText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
  },
  iconTextActive: {
    color: "#ffffff",
  },
bookLabel: {
  flex: 1,           // Critical for ellipsis to work
  fontSize: 15,
  color: "#334155",
  fontWeight: "500",
  marginRight: 8,    // Gap before the chevron
},
  bookLabelActive: {
    color: "#6366f1",
    fontWeight: "700",
  },
});

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Book } from "../types";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props) => {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    db.getAllAsync("SELECT * FROM books").then((res) => {
      setBooks(res as Book[]);
    });
  }, []);
const handleBookPress = (book: Book) => {
    // TypeScript now knows exactly what "Page" needs
    navigation.navigate("Page",{
      bookId:book.book_id,
      bookName:book.name_am,
      chapterNumber:1
    });
  };
console.log(navigation)
  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
      <FlashList
        showsVerticalScrollIndicator={false}
        data={books}
        renderItem={({ item ,index}) => {
          return (
            <TouchableOpacity style={{padding:12}} key={item.book_id} onPress={()=>handleBookPress(item)}>
              <Text style={{color:"#666666",fontSize:16}}>{index+1}. {item.name_am}</Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={()=><View style={styles.separator}></View>}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
    separator:{
        width:"100%",
        height:1,
        backgroundColor:"#eee",
    }
})
export default HomeScreen;

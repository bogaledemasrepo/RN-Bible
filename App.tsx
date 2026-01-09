import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useAssets, Asset } from "expo-asset";
import { SQLiteProvider } from "expo-sqlite";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy"; // Use legacy to avoid deprecation errors
import { PagesProvider } from "./context/use-pages-context";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { CustomDrawerContent } from "./components/custom-drawer-content";
import PageScreen from "./screens/PageScreen";
import { RootDrawerParamList } from "./types";

SplashScreen.preventAutoHideAsync();

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const bibleDbAsset = require("./assets/bible.db");

export default function App() {
  const [assets] = useAssets([bibleDbAsset]);

  const [fontsLoaded, fontError] = useFonts({
    // Add your fonts here
  });

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function prepareDatabase() {
      if (!assets) return;

      try {
        const asset = Asset.fromModule(bibleDbAsset);
        await asset.downloadAsync();

        if (!asset.localUri) {
          throw new Error("Asset has no localUri after download");
        }

        const dbDir = `${FileSystem.documentDirectory}SQLite/`;
        const dbPath = `${dbDir}bible.db`;

        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(dbDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
          console.log("Created SQLite directory");
        }

        // Copy DB only if it doesn't exist
        const dbInfo = await FileSystem.getInfoAsync(dbPath);
        if (!dbInfo.exists) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: dbPath,
          });
          console.log("Copied pre-populated bible.db");
        } else {
          console.log("bible.db already exists – using cached copy");
        }

        // Test the database
        const testDb = await SQLite.openDatabaseAsync("bible.db");
        const result = await testDb.getFirstAsync("SELECT * FROM books LIMIT 1");
        console.log("DB test result:", result ?? "NULL – check your bible.db file!");
        await testDb.closeAsync();

        setDbReady(true);
      } catch (error) {
        console.error("Database preparation failed:", error);
      }
    }

    prepareDatabase();
  }, [assets]);

  const appIsReady = !!assets && (fontsLoaded || !!fontError) && dbReady;

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SQLiteProvider databaseName="bible.db">
        <PagesProvider>
          <NavigationContainer>
            <Drawer.Navigator
              drawerContent={(props) => <CustomDrawerContent {...props} />}
            >
              <Drawer.Screen
                name="BookReader"
                component={PageScreen}
                initialParams={{
                  bookId: 1,
                  bookName: "ኦሪት ዘፍጥረት",
                  chapterNumber: 1,
                }}
                options={{ headerShown: false }}
              />
            </Drawer.Navigator>
          </NavigationContainer>
        </PagesProvider>
      </SQLiteProvider>
    </View>
  );
}
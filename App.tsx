import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { Directory, File, Paths } from 'expo-file-system';
import { Asset, useAssets } from 'expo-asset';
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";

// Internal Providers and Screens
import { PagesProvider } from "./context/use-pages-context";
import { CustomDrawerContent } from "./components/custom-drawer-content";
import PageScreen from "./screens/PageScreen";
import { RootDrawerParamList } from "./types";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

// Prevent splash screen from hiding until we are ready
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  // 1. Load Assets (The DB file)
  const [assets] = useAssets([require("./assets/bible.db")]);

  // 2. Load Fonts
  const [fontsLoaded, fontError] = useFonts({
    // Add your custom fonts here if needed
  });

  // 3. Database Initialization Logic
  useEffect(() => {
    async function prepareDatabase() {
      // Wait until the asset is recognized by the bundler
      if (!assets) return;

      try {
        const sqliteDir = new Directory(Paths.document, 'SQLite');
        
        // Ensure the SQLite directory exists
        if (!sqliteDir.exists) {
          sqliteDir.create();
        }

        const destinationFile = new File(sqliteDir, 'bible.db');

        // Only copy if it doesn't exist to optimize startup time
        if (!destinationFile.exists) {
          console.log("🚚 Copying database from assets...");
          const dbAsset = Asset.fromModule(require('./assets/bible.db'));
          await dbAsset.downloadAsync();

          if (dbAsset.localUri) {
            const assetFile = new File(dbAsset.localUri);
            await assetFile.copy(destinationFile);
            console.log("✅ Database initialized.");
          }
        } else {
          console.log("📦 Database already exists, using cached copy.");
        }

        setDbReady(true);
      } catch (error) {
        console.error("Critical error during DB setup:", error);
        // Even if it fails, you might want to set ready to show an error UI
        setDbReady(true); 
      }
    }

    prepareDatabase();
  }, [assets]);

  // 4. Combined Loading State
  const appIsReady = dbReady && (fontsLoaded || !!fontError);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen once the UI is ready to paint
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Splash screen remains visible
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SQLiteProvider databaseName="bible.db" useSuspense>
        <PagesProvider>
          <NavigationContainer>
            <Drawer.Navigator
              drawerContent={(props) => <CustomDrawerContent {...props} />}
              screenOptions={{
                drawerStyle: { width: '80%' },
              }}
            >
              <Drawer.Screen
                name="BookReader"
                component={PageScreen}
                initialParams={{
                  bookId: 1,
                  bookName: "ኦሪት ዘፍጥረት",
                  chapterNumber: 1,
                }}
                options={{ 
                  headerTitle: "መጽሐፍ ቅዱስ",
                  headerShown: true 
                }}
              />
            </Drawer.Navigator>
          </NavigationContainer>
        </PagesProvider>
      </SQLiteProvider>
    </View>
  );
}
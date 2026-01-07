import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useAssets } from "expo-asset";
import { SQLiteProvider } from "expo-sqlite";

import { PagesProvider } from "./context/use-pages-context";

import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { CustomDrawerContent } from "./components/custom-drawer-content";
import PageScreen from "./screens/PageScreen";
import { RootDrawerParamList } from "./types";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const bibleDbAsset = require("./assets/bible.db");

export default function App() {
  // 1. Load Assets (Database)
  const [assets] = useAssets([bibleDbAsset]);

  // 2. Load Fonts (Replace with your actual font files)
  const [fontsLoaded, fontError] = useFonts({
    // "Ethiopic-Bold": require("./assets/fonts/NotoSansEthiopic-Bold.ttf"),
    // "Ethiopic-Regular": require("./assets/fonts/NotoSansEthiopic-Regular.ttf"),
  });

  // 3. Check if everything is ready
  const isReady = !!assets && (fontsLoaded || !!fontError);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      // This tells the splash screen to hide
      await SplashScreen.hideAsync();
    }
  }, [isReady]);
  if (!isReady) {
    return null; // Return null while splash screen is active
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SQLiteProvider
        databaseName="bible.db"
        assetSource={{ assetId: bibleDbAsset }}
      >
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
                options={{headerShown:false}}
              />
            </Drawer.Navigator>
          </NavigationContainer>
        </PagesProvider>
      </SQLiteProvider>
    </View>
  );
}

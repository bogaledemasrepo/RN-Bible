import React, { useCallback } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useAssets } from "expo-asset";
import { SQLiteProvider } from "expo-sqlite";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PagesProvider } from "./context/use-pages-context";
import HomeScreen from "./screens/HomeScreen";
import PageScreen from "./screens/PagesScreen";
import { RootStackParamList } from "./types";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();
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
      <NavigationContainer>
        <SQLiteProvider 
          databaseName="bible.db" 
          assetSource={{ assetId: bibleDbAsset }}
        >
          <PagesProvider>
            <Stack.Navigator screenOptions={{headerShown:false}}>
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
              />
              <Stack.Screen 
                name="Page" 
                component={PageScreen} 
              />
            </Stack.Navigator>
          </PagesProvider>
        </SQLiteProvider>
      </NavigationContainer>
    </View>
  );
}
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { CustomDrawerContent } from "./components/custom-drawer-content";
import { RootDrawerParamList } from "./types";
// import AutoPaginatedReader from "./screens/PageScreen";
import Sqlite from "./hooks/use-sqlite-context";
import { AutoPaginatedReader } from "./screens/PageScreen";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

// Prevent splash screen from hiding until we are ready
// SplashScreen.preventAutoHideAsync();

export default function App() {

  return (
    <View style={{ flex: 1 }}>
      <Sqlite>
        <NavigationContainer>
          <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              drawerStyle: { width: '80%' },
            }}
          >
            <Drawer.Screen
              name="BookReader"
              component={AutoPaginatedReader}
              initialParams={{
                bookId: 1,
                bookName: "ኦሪት ዘፍጥረት",
                chapterNumber: 1,
              }}
              options={{
                headerShown: false
              }}
            />
          </Drawer.Navigator>
        </NavigationContainer>
        {/* <AppStatusBar style="dark" /> */}
      </Sqlite>
    </View>
  );
}

// function AppStatusBar({ style }: { style: "auto" | "inverted" | "light" | "dark" }) {
//   return (
//     <View
//       style={{
//         height: 0,
//         backgroundColor: style === "light" ? "#fff" : "#000",
//       }}
//     />
//   );
// } 
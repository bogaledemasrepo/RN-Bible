import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Sqlite from "./hooks/use-sqlite-context";
import { AutoPaginatedReader } from "./screens/PageScreen";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

enableScreens();

export type RootStackParamList = {
  BookReader: {
    bookId: number;
    bookName: string;
    chapterNumber: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Sqlite>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="BookReader"
              component={AutoPaginatedReader}
              initialParams={{
                bookId: 1,
                bookName: "ኦሪት ዘፍጥረት",
                chapterNumber: 1,
              }}
              options={{
                headerShown: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Sqlite>
    </GestureHandlerRootView>
  );
}
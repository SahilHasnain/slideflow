import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PresentationsProvider } from "@/store/presentations";

export default function RootLayout() {
  return (
    <PresentationsProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          headerTintColor: "#18181B",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="create"
          options={{ title: "New presentation", presentation: "modal" }}
        />
        <Stack.Screen name="editor/[id]" options={{ title: "Edit" }} />
        <Stack.Screen name="export/[id]" options={{ title: "Export" }} />
      </Stack>
    </PresentationsProvider>
  );
}

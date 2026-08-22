import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePresentations } from "@/store/presentations";
import { getSubject, getTemplate } from "@/data/subjects";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { presentations, hydrated, deletePresentation } = usePresentations();

  return (
    <View className="flex-1 bg-zinc-50" style={{ paddingTop: insets.top }}>
      <View className="px-6 pb-4 pt-6">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <Ionicons name="albums" size={22} color="white" />
          </View>
          <View>
            <Text className="text-2xl font-extrabold text-zinc-900">Slideflow</Text>
            <Text className="text-sm text-zinc-500">
              A presentation in 5 minutes on your phone
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-10" contentContainerStyle={{ gap: 12 }}>
        <Pressable
          onPress={() => router.push("/create")}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4"
        >
          <Ionicons name="add" size={22} color="white" />
          <Text className="text-base font-bold text-white">New presentation</Text>
        </Pressable>

        {!hydrated ? (
          <Text className="mt-10 text-center text-sm text-zinc-400">Loading…</Text>
        ) : presentations.length === 0 ? (
          <View className="mt-16 items-center px-6">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100">
              <Ionicons name="albums-outline" size={40} color="#4F46E5" />
            </View>
            <Text className="text-center text-lg font-semibold text-zinc-900">
              No presentations yet
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-zinc-500">
              Pick a subject and template, add your headings, and get a slide deck
              you can export in minutes.
            </Text>
          </View>
        ) : (
          presentations.map((p) => {
            const subject = getSubject(p.subjectId);
            const template = getTemplate(p.templateId);
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/editor/${p.id}`)}
                className="flex-row items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${template?.accent ?? "#4F46E5"}1A` }}
                >
                  <Text className="text-xl">{subject?.emoji ?? "📄"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-zinc-900" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text className="mt-0.5 text-sm text-zinc-500">
                    {p.slides.length} slides · {template?.name ?? "Template"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => deletePresentation(p.id)}
                  hitSlop={8}
                  className="rounded-full p-1.5"
                >
                  <Ionicons name="trash-outline" size={18} color="#A1A1AA" />
                </Pressable>
                <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

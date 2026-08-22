import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePresentations } from "@/store/presentations";
import { getSubject, getTemplate } from "@/data/subjects";
import { exportPresentation } from "@/lib/export";
import type { ExportFormat } from "@/lib/export";

const FORMATS: { id: ExportFormat; label: string; hint: string; icon: string; color: string }[] = [
  {
    id: "pptx",
    label: "PPTX",
    hint: "Edit in PowerPoint, Google Slides",
    icon: "document-text",
    color: "bg-indigo-100",
  },
  {
    id: "pdf",
    label: "PDF",
    hint: "Share or present as-is",
    icon: "document-text",
    color: "bg-rose-100",
  },
];

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPresentation } = usePresentations();
  const presentation = id ? getPresentation(id) : undefined;

  const [format, setFormat] = useState<ExportFormat>("pptx");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const subject = useMemo(
    () => (presentation ? getSubject(presentation.subjectId) : undefined),
    [presentation]
  );
  const template = useMemo(
    () => (presentation ? getTemplate(presentation.templateId) : undefined),
    [presentation]
  );

  if (!presentation) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 px-8">
        <Text className="text-center text-zinc-500">Presentation not found.</Text>
        <Pressable onPress={() => router.replace("/")} className="mt-4">
          <Text className="font-semibold text-indigo-600">Go home</Text>
        </Pressable>
      </View>
    );
  }

  const handleExport = async () => {
    setStatus("working");
    setMessage("");
    try {
      await exportPresentation(presentation, format);
      setStatus("done");
      setMessage("Exported successfully!");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Export failed. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-zinc-50">
      <ScrollView contentContainerClassName="px-5 pb-8" contentContainerStyle={{ gap: 16 }}>
        <View className="mt-2 rounded-2xl border border-zinc-200 bg-white p-5">
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl">{subject?.emoji ?? "📄"}</Text>
            <View className="flex-1">
              <Text className="text-base font-bold text-zinc-900">{presentation.title}</Text>
              <Text className="text-sm text-zinc-500">
                {presentation.slides.length} slides · {template?.name} ·{" "}
                {template?.accent ?? ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Label>Export format</Label>
          {FORMATS.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFormat(f.id)}
              className={`flex-row items-center gap-4 rounded-2xl border bg-white p-4 ${
                format === f.id ? "border-indigo-600" : "border-zinc-200"
              }`}
            >
              <View className={`h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                <Ionicons name={f.icon as "document-text"} size={22} color={format === f.id ? "#4F46E5" : "#A1A1AA"} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-zinc-900">{f.label}</Text>
                <Text className="text-sm text-zinc-500">{f.hint}</Text>
              </View>
              <Ionicons
                name={format === f.id ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={format === f.id ? "#4F46E5" : "#D4D4D8"}
              />
            </Pressable>
          ))}
        </View>

        {message ? (
          <View
            className={`flex-row items-center gap-2 rounded-2xl p-4 ${
              status === "error" ? "bg-rose-50" : "bg-emerald-50"
            }`}
          >
            <Ionicons
              name={status === "error" ? "alert-circle" : "checkmark-circle"}
              size={20}
              color={status === "error" ? "#E11D48" : "#059669"}
            />
            <Text
              className={`flex-1 text-sm font-medium ${
                status === "error" ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {message}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-zinc-200 bg-white px-5 pb-5 pt-3">
        <Pressable
          onPress={handleExport}
          disabled={status === "working"}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4"
        >
          {status === "working" ? (
            <>
              <ActivityIndicator color="white" />
              <Text className="text-base font-bold text-white">Generating…</Text>
            </>
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="white" />
              <Text className="text-base font-bold text-white">
                Export {format.toUpperCase()}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-sm font-bold uppercase tracking-wide text-zinc-500">{children}</Text>;
}

import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePresentations } from "@/store/presentations";
import { getSubject, getTemplate } from "@/data/subjects";
import { buildStructure } from "@/lib/structure";
import { generateOutline, isAiConfigured } from "@/lib/ai";
import type { Slide } from "@/types";
import { TemplatePreview } from "@/components/template-preview";
import { SlideEditorModal } from "@/components/slide-editor-modal";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPresentation, updatePresentation } = usePresentations();
  const presentation = id ? getPresentation(id) : undefined;

  const [headings, setHeadings] = useState<string[]>([""]);
  const [topic, setTopic] = useState("");
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [editing, setEditing] = useState<Slide | null>(null);

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

  const template = getTemplate(presentation.templateId);
  if (!template) return null;
  const subject = getSubject(presentation.subjectId);

  const filtered = headings.map((h) => h.trim()).filter(Boolean);

  const updateSlides = (slides: Slide[]) => updatePresentation(presentation.id, { slides });

  const handleGenerateFromTopic = async () => {
    if (!topic.trim() || !subject) return;
    setGeneratingTopic(true);
    const outline = await generateOutline(topic, subject.field);
    setHeadings(outline);
    setGeneratingTopic(false);
  };

  const handleGenerate = () => {
    const slides = buildStructure(presentation.title, filtered);
    updateSlides(slides);
  };

  const saveSlide = (updated: Slide) => {
    updateSlides(presentation.slides.map((s) => (s.id === updated.id ? updated : s)));
    setEditing(null);
  };

  const addSlide = () => {
    const slide: Slide = {
      id: `s-${Date.now().toString(36)}`,
      kind: "content",
      heading: "New slide",
      bullets: [],
    };
    updateSlides([...presentation.slides, slide]);
  };

  const deleteSlide = (slideId: string) => {
    updateSlides(presentation.slides.filter((s) => s.id !== slideId));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const next = [...presentation.slides];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateSlides(next);
  };

  return (
    <View className="flex-1 bg-zinc-50">
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        contentContainerStyle={{ gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-2 items-center">
          <TemplatePreview template={template} title={presentation.title || "Title"} />
        </View>

        <View style={{ gap: 10 }}>
          <Label>Title</Label>
          <TextInput
            value={presentation.title}
            onChangeText={(text) => updatePresentation(presentation.id, { title: text })}
            placeholder="Presentation title"
            placeholderTextColor="#A1A1AA"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-900"
          />
        </View>

        {presentation.slides.length <= 1 && (
          <>
            {subject && (
              <View style={{ gap: 10 }}>
                <Label>Start from a topic</Label>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder={`e.g. Contract law basics (${subject.name})`}
                  placeholderTextColor="#A1A1AA"
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
                />
                <Pressable
                  onPress={handleGenerateFromTopic}
                  disabled={generatingTopic || !topic.trim()}
                  className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
                    topic.trim() && !generatingTopic ? "bg-indigo-600" : "bg-zinc-200"
                  }`}
                >
                  {generatingTopic ? (
                    <>
                      <ActivityIndicator color="white" />
                      <Text className="text-base font-bold text-white">Generating outline…</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color={topic.trim() ? "white" : "#A1A1AA"} />
                      <Text
                        className={`text-base font-bold ${
                          topic.trim() ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        Generate outline
                      </Text>
                    </>
                  )}
                </Pressable>
                {!isAiConfigured() && (
                  <Text className="text-xs leading-4 text-zinc-400">
                    AI gateway not configured — using the built-in offline outline generator.
                  </Text>
                )}
              </View>
            )}

            <View style={{ gap: 10 }}>
              <Label>Headings — one per slide</Label>
              {headings.map((heading, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <TextInput
                    value={heading}
                    onChangeText={(text) =>
                      setHeadings((prev) => prev.map((h, i) => (i === index ? text : h)))
                    }
                    placeholder="e.g. What is a contract?"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
                  />
                  {headings.length > 1 && (
                    <Pressable
                      onPress={() => setHeadings((prev) => prev.filter((_, i) => i !== index))}
                      className="h-11 w-11 items-center justify-center rounded-2xl bg-zinc-200"
                    >
                      <Ionicons name="close" size={18} color="#71717A" />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => setHeadings((prev) => [...prev, ""])}
                className="flex-row items-center justify-center gap-1 rounded-2xl border border-dashed border-zinc-300 py-3"
              >
                <Ionicons name="add" size={18} color="#4F46E5" />
                <Text className="text-sm font-semibold text-indigo-600">Add heading</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleGenerate}
              disabled={filtered.length === 0}
              className={`items-center rounded-2xl py-4 ${
                filtered.length > 0 ? "bg-indigo-600" : "bg-zinc-200"
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  filtered.length > 0 ? "text-white" : "text-zinc-400"
                }`}
              >
                Generate slide structure
              </Text>
            </Pressable>
          </>
        )}

        {presentation.slides.length > 1 && (
          <>
            <View className="flex-row items-center justify-between">
              <Label>Slides</Label>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    setHeadings([""]);
                    updateSlides([
                      {
                        id: `s-${Date.now().toString(36)}`,
                        kind: "title",
                        heading: presentation.title || "Untitled",
                        bullets: [],
                      },
                    ]);
                  }}
                  className="flex-row items-center gap-1 rounded-xl bg-zinc-100 px-3 py-1.5"
                >
                  <Ionicons name="refresh" size={14} color="#52525B" />
                  <Text className="text-sm font-semibold text-zinc-700">Reset</Text>
                </Pressable>
                <Pressable onPress={addSlide} className="flex-row items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5">
                  <Ionicons name="add" size={16} color="#4F46E5" />
                  <Text className="text-sm font-semibold text-indigo-700">Add slide</Text>
                </Pressable>
              </View>
            </View>

            {presentation.slides.map((slide, index) => (
              <View key={slide.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                    <Text className="text-sm font-bold text-zinc-500">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-zinc-900" numberOfLines={1}>
                      {slide.heading || "Untitled"}
                    </Text>
                    <Text className="text-xs uppercase tracking-wide text-zinc-400">{slide.kind}</Text>
                  </View>
                  <Pressable onPress={() => moveSlide(index, -1)} className="p-1.5" disabled={index === 0}>
                    <Ionicons name="chevron-up" size={18} color={index === 0 ? "#E4E4E7" : "#71717A"} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveSlide(index, 1)}
                    className="p-1.5"
                    disabled={index === presentation.slides.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={index === presentation.slides.length - 1 ? "#E4E4E7" : "#71717A"}
                    />
                  </Pressable>
                </View>

                {slide.bullets.length > 0 && (
                  <View className="mt-3 gap-1 border-t border-zinc-100 pt-3">
                    {slide.bullets.slice(0, 3).map((bullet, bi) => (
                      <Text key={bi} className="text-sm text-zinc-600" numberOfLines={1}>
                        • {bullet}
                      </Text>
                    ))}
                    {slide.bullets.length > 3 && (
                      <Text className="text-xs text-zinc-400">+{slide.bullets.length - 3} more</Text>
                    )}
                  </View>
                )}

                <View className="mt-3 flex-row gap-2 border-t border-zinc-100 pt-3">
                  <Pressable
                    onPress={() => setEditing(slide)}
                    className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-zinc-100 py-2.5"
                  >
                    <Ionicons name="pencil" size={15} color="#52525B" />
                    <Text className="text-sm font-semibold text-zinc-700">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteSlide(slide.id)}
                    className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-rose-50 py-2.5"
                  >
                    <Ionicons name="trash-outline" size={15} color="#E11D48" />
                    <Text className="text-sm font-semibold text-rose-600">Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {presentation.slides.length > 1 && (
        <View className="border-t border-zinc-200 bg-white px-5 pb-5 pt-3">
          <Pressable
            onPress={() => router.push(`/export/${presentation.id}`)}
            className="items-center rounded-2xl bg-indigo-600 py-4"
          >
            <Text className="text-base font-bold text-white">Continue to export</Text>
          </Pressable>
        </View>
      )}

      <SlideEditorModal
        slide={editing}
        field={subject?.field ?? "bca"}
        onClose={() => setEditing(null)}
        onSave={saveSlide}
      />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-sm font-bold uppercase tracking-wide text-zinc-500">{children}</Text>;
}

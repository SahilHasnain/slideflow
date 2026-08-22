import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { generateBullets } from "@/lib/ai";
import type { Field, Slide, SlideKind } from "@/types";

const KINDS: { value: SlideKind; label: string }[] = [
  { value: "title", label: "Title" },
  { value: "section", label: "Section" },
  { value: "content", label: "Content" },
  { value: "closing", label: "Closing" },
];

interface Props {
  slide: Slide | null;
  field: Field;
  onClose: () => void;
  onSave: (slide: Slide) => void;
}

export function SlideEditorModal({ slide, field, onClose, onSave }: Props) {
  const [heading, setHeading] = useState("");
  const [kind, setKind] = useState<SlideKind>("content");
  const [bullets, setBullets] = useState<string[]>([""]);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (slide) {
      setHeading(slide.heading);
      setKind(slide.kind);
      setBullets(slide.bullets.length ? slide.bullets : [""]);
    }
  }, [slide]);

  const canSave = heading.trim().length > 0;

  async function handleSuggest() {
    if (!heading.trim()) return;
    setSuggesting(true);
    const suggested = await generateBullets(heading, field);
    setBullets(suggested);
    setSuggesting(false);
  }

  function handleSave() {
    if (!slide || !canSave) return;
    onSave({
      ...slide,
      heading: heading.trim(),
      kind,
      bullets: bullets.map((b) => b.trim()).filter(Boolean),
    });
  }

  return (
    <Modal
      visible={!!slide}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white">
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-zinc-300" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
            <Text className="text-lg font-bold text-zinc-900">Edit slide</Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="#71717A" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-5 pb-6" contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              <Label>Slide type</Label>
              <View className="flex-row gap-2">
                {KINDS.map((k) => (
                  <Pressable
                    key={k.value}
                    onPress={() => setKind(k.value)}
                    className={`flex-1 items-center rounded-xl border py-2.5 ${
                      kind === k.value ? "border-indigo-600 bg-indigo-50" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        kind === k.value ? "text-indigo-700" : "text-zinc-600"
                      }`}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Label>Heading</Label>
              <TextInput
                value={heading}
                onChangeText={setHeading}
                placeholder="Slide heading"
                placeholderTextColor="#A1A1AA"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900"
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>Bullets</Label>
              <Pressable
                onPress={handleSuggest}
                disabled={suggesting || !heading.trim()}
                className={`flex-row items-center justify-center gap-1.5 rounded-2xl py-2.5 ${
                  heading.trim() && !suggesting ? "bg-indigo-600" : "bg-zinc-200"
                }`}
              >
                {suggesting ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-sm font-bold text-white">Generating…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={heading.trim() ? "white" : "#A1A1AA"} />
                    <Text
                      className={`text-sm font-bold ${
                        heading.trim() ? "text-white" : "text-zinc-400"
                      }`}
                    >
                      Suggest content
                    </Text>
                  </>
                )}
              </Pressable>
              {bullets.map((bullet, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <Text className="text-indigo-500">•</Text>
                  <TextInput
                    value={bullet}
                    onChangeText={(text) =>
                      setBullets((prev) => prev.map((b, i) => (i === index ? text : b)))
                    }
                    placeholder="Bullet point"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-base text-zinc-900"
                  />
                  <Pressable
                    onPress={() => setBullets((prev) => prev.filter((_, i) => i !== index))}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-200"
                  >
                    <Ionicons name="remove" size={16} color="#71717A" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() => setBullets((prev) => [...prev, ""])}
                className="flex-row items-center justify-center gap-1 rounded-2xl border border-dashed border-zinc-300 py-2.5"
              >
                <Ionicons name="add" size={16} color="#4F46E5" />
                <Text className="text-sm font-semibold text-indigo-600">Add bullet</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View className="border-t border-zinc-200 px-5 pb-6 pt-3">
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              className={`items-center rounded-2xl py-4 ${canSave ? "bg-indigo-600" : "bg-zinc-200"}`}
            >
              <Text className={`text-base font-bold ${canSave ? "text-white" : "text-zinc-400"}`}>
                Save slide
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-sm font-bold uppercase tracking-wide text-zinc-500">{children}</Text>;
}

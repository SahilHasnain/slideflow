import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SUBJECTS, TEMPLATES } from "@/data/subjects";
import { usePresentations } from "@/store/presentations";
import { emptySlide } from "@/lib/structure";
import type { Slide, Subject, Template } from "@/types";
import { TemplatePreview } from "@/components/template-preview";

export default function CreateScreen() {
  const router = useRouter();
  const { createPresentation } = usePresentations();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");

  const canCreate = !!subject && !!template;

  function handleCreate() {
    if (!subject || !template) return;
    const presentation = createPresentation({
      title: title.trim() || subject.name,
      subjectId: subject.id,
      templateId: template.id,
      slides: [emptySlide("title", title.trim() || subject.name)] as Slide[],
    });
    router.replace({ pathname: "/editor/[id]", params: { id: presentation.id } });
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <ScrollView contentContainerClassName="px-5 pb-8" contentContainerStyle={{ gap: 20 }}>
        <StepHeader current={subject ? 2 : 1} />

        {!subject ? (
          <View style={{ gap: 10 }}>
            <Label>Which subject is this for?</Label>
            {SUBJECTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSubject(s)}
                className="flex-row items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-zinc-100">
                  <Text className="text-xl">{s.emoji}</Text>
                </View>
                <Text className="flex-1 text-base font-semibold text-zinc-900">{s.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            <Pressable
              onPress={() => {
                setSubject(null);
                setTemplate(null);
              }}
              className="flex-row items-center gap-2"
            >
              <Ionicons name="arrow-back" size={16} color="#4F46E5" />
              <Text className="text-sm font-semibold text-indigo-600">Change subject</Text>
            </Pressable>

            <View style={{ gap: 10 }}>
              <Label>Pick a template</Label>
              {TEMPLATES.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTemplate(t)}
                  className={`flex-row items-center gap-4 rounded-2xl border bg-white p-4 ${
                    template?.id === t.id ? "border-indigo-600" : "border-zinc-200"
                  }`}
                >
                  <TemplatePreview template={t} title={subject.name} />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-zinc-900">{t.name}</Text>
                    <Text className="mt-1 text-sm leading-5 text-zinc-500">{t.description}</Text>
                  </View>
                  <Ionicons
                    name={template?.id === t.id ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={template?.id === t.id ? "#4F46E5" : "#D4D4D8"}
                  />
                </Pressable>
              ))}
            </View>

            <View style={{ gap: 10 }}>
              <Label>Presentation title</Label>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Contract Law — Chapter 4"
                placeholderTextColor="#A1A1AA"
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {subject && (
        <View className="border-t border-zinc-200 bg-white px-5 pb-5 pt-3">
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            className={`rounded-2xl py-4 ${
              canCreate ? "bg-indigo-600" : "bg-zinc-200"
            } items-center`}
          >
            <Text className={`text-base font-bold ${canCreate ? "text-white" : "text-zinc-400"}`}>
              Create presentation
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-sm font-bold uppercase tracking-wide text-zinc-500">{children}</Text>;
}

function StepHeader({ current }: { current: 1 | 2 }) {
  return (
    <View className="mt-2 flex-row items-center gap-2">
      {[1, 2].map((step) => (
        <View
          key={step}
          className={`h-1.5 flex-1 rounded-full ${step <= current ? "bg-indigo-600" : "bg-zinc-200"}`}
        />
      ))}
    </View>
  );
}

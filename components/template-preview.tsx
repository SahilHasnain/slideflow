import { Text, View } from "react-native";
import type { Template } from "@/types";

const FONT_FAMILIES: Record<Template["font"], string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

export function TemplatePreview({ template, title }: { template: Template; title: string }) {
  const textColor = template.dark ? "#FFFFFF" : "#18181B";
  const subColor = template.dark ? "rgba(255,255,255,0.6)" : "rgba(24,24,27,0.55)";
  const bgColor = template.dark ? "#0F172A" : "#FFFFFF";
  const borderColor = template.dark ? "#1E293B" : "#E4E4E7";
  const font = FONT_FAMILIES[template.font];

  if (template.layout === "column") {
    return (
      <View
        className="h-36 w-56 flex-row overflow-hidden rounded-xl"
        style={{ backgroundColor: bgColor, borderWidth: 1, borderColor }}
      >
        <View style={{ width: 18, height: "100%", backgroundColor: template.accent }} />
        <View className="flex-1 justify-between p-3.5">
          <Text numberOfLines={2} className="text-sm font-bold" style={{ color: textColor, fontFamily: font }}>
            {title}
          </Text>
          <View className="gap-2">
            {[0, 1].map((i) => (
              <View key={i} className="flex-row items-center gap-1.5">
                <View style={{ width: 4, height: 4, borderRadius: 99, backgroundColor: template.accent }} />
                <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: subColor }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (template.layout === "frame") {
    return (
      <View
        className="h-36 w-56 p-2 overflow-hidden rounded-xl"
        style={{ backgroundColor: bgColor, borderWidth: 1, borderColor }}
      >
        <View
          className="flex-1 justify-between p-3 rounded-lg"
          style={{ borderWidth: 1, borderColor: `${template.accent}66` }}
        >
          <Text
            numberOfLines={1}
            className="text-center text-sm font-bold"
            style={{ color: textColor, fontFamily: font }}
          >
            {title}
          </Text>
          <View className="gap-2">
            {[0, 1].map((i) => (
              <View key={i} className="flex-row items-center gap-1.5">
                <View style={{ width: 4, height: 4, borderRadius: 99, backgroundColor: template.accent }} />
                <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: subColor }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (template.layout === "block") {
    return (
      <View
        className="h-36 w-56 justify-between overflow-hidden rounded-xl"
        style={{ backgroundColor: bgColor, borderWidth: 1, borderColor }}
      >
        <View className="px-3.5 py-2.5" style={{ backgroundColor: template.accent }}>
          <Text numberOfLines={1} className="text-sm font-bold text-white" style={{ fontFamily: font }}>
            {title}
          </Text>
        </View>
        <View className="flex-1 justify-center gap-2 px-3.5">
          {[0, 1].map((i) => (
            <View key={i} className="flex-row items-center gap-1.5">
              <View style={{ width: 4, height: 4, borderRadius: 99, backgroundColor: template.accent }} />
              <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: subColor }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // "edge" (default)
  return (
    <View
      className="h-36 w-56 overflow-hidden rounded-xl"
      style={{ backgroundColor: bgColor, borderWidth: 1, borderColor }}
    >
      <View style={{ height: 4, width: "100%", backgroundColor: template.accent }} />
      <View className="flex-1 justify-between p-3.5">
        <Text numberOfLines={1} className="text-sm font-bold" style={{ color: textColor, fontFamily: font }}>
          {title}
        </Text>
        <View className="gap-2">
          {[0, 1].map((i) => (
            <View key={i} className="flex-row items-center gap-1.5">
              <View style={{ width: 4, height: 4, borderRadius: 99, backgroundColor: template.accent }} />
              <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: subColor }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { buildPptx } from "./pptx";
import { buildPdf } from "./pdf";
import { getTemplate } from "@/data/subjects";
import type { Presentation } from "@/types";

export type ExportFormat = "pptx" | "pdf";

const MIME: Record<ExportFormat, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

function sanitizeName(title: string): string {
  const safe = title.replace(/[^\w\d\s-]/g, "").trim().replace(/\s+/g, "_");
  return (safe || "presentation").slice(0, 60);
}

async function writeFile(name: string, bytes: Uint8Array): Promise<File> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}

function downloadOnWeb(name: string, bytes: Uint8Array, mime: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportPresentation(
  presentation: Presentation,
  format: ExportFormat
): Promise<void> {
  const template = getTemplate(presentation.templateId);
  if (!template) throw new Error("Template not found");

  const bytes = format === "pptx" ? await buildPptx(presentation, template) : await buildPdf(presentation, template);
  const name = `${sanitizeName(presentation.title)}.${format === "pptx" ? "pptx" : "pdf"}`;

  if (Platform.OS === "web") {
    downloadOnWeb(name, bytes, MIME[format]);
    return;
  }

  const file = await writeFile(name, bytes);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: MIME[format],
    dialogTitle: `Export ${format.toUpperCase()}`,
    UTI: format === "pptx" ? "org.openxmlformats.presentationml.presentation" : "com.adobe.pdf",
  });
}

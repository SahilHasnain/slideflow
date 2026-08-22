import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Presentation, Slide } from "@/types";

const STORAGE_KEY = "slideflow.presentations.v1";

const DEV_PRESENTATIONS: Presentation[] = [
  {
    id: "dev-contract-law",
    title: "Contract Law Basics",
    subjectId: "law",
    templateId: "classic",
    createdAt: Date.now(),
    slides: [
      {
        id: "dev-contract-title",
        kind: "title",
        heading: "Contract Law Basics",
        bullets: [],
      },
      {
        id: "dev-contract-framework",
        kind: "section",
        heading: "Legal Framework",
        bullets: [
          "Contracts create legally enforceable obligations",
          "The governing rules depend on the type of agreement",
        ],
      },
      {
        id: "dev-contract-elements",
        kind: "content",
        heading: "Essential Elements",
        bullets: [
          "Offer and acceptance",
          "Consideration",
          "Intention to create legal relations",
          "Capacity and free consent",
        ],
      },
      {
        id: "dev-contract-cases",
        kind: "content",
        heading: "Case Law & Application",
        bullets: [
          "Compare the facts and reasoning in leading cases",
          "Apply the legal test to a practical scenario",
          "Identify arguments for both parties",
        ],
      },
      {
        id: "dev-contract-conclusion",
        kind: "section",
        heading: "Conclusion",
        bullets: ["Summarize the rule", "Connect the rule to the facts", "State the likely outcome"],
      },
    ],
  },
  {
    id: "dev-app-architecture",
    title: "Mobile App Architecture",
    subjectId: "bca",
    templateId: "midnight",
    createdAt: Date.now() - 86400000,
    slides: [
      {
        id: "dev-app-title",
        kind: "title",
        heading: "Mobile App Architecture",
        bullets: [],
      },
      {
        id: "dev-app-stack",
        kind: "content",
        heading: "Technology Stack",
        bullets: [
          "React Native for cross-platform UI",
          "Expo for native capabilities and builds",
          "AsyncStorage for local persistence",
        ],
      },
      {
        id: "dev-app-flow",
        kind: "content",
        heading: "Data Flow",
        bullets: [
          "User input enters through the editor",
          "The store updates the active presentation",
          "Changes persist locally for offline access",
        ],
      },
    ],
  },
];

interface PresentationsContextValue {
  hydrated: boolean;
  presentations: Presentation[];
  getPresentation: (id: string) => Presentation | undefined;
  createPresentation: (input: {
    title: string;
    subjectId: string;
    templateId: string;
    slides: Slide[];
  }) => Presentation;
  updatePresentation: (id: string, updates: Partial<Presentation>) => void;
  deletePresentation: (id: string) => void;
}

const PresentationsContext = createContext<PresentationsContextValue | null>(null);

export function PresentationsProvider({ children }: { children: ReactNode }) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Presentation[];
          if (Array.isArray(parsed)) {
            setPresentations(parsed.length === 0 && __DEV__ ? DEV_PRESENTATIONS : parsed);
          }
        } else if (__DEV__) {
          setPresentations(DEV_PRESENTATIONS);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presentations)).catch(() => {});
  }, [presentations, hydrated]);

  const createPresentation = useCallback(
    (input: { title: string; subjectId: string; templateId: string; slides: Slide[] }) => {
      const presentation: Presentation = {
        id: `p-${Date.now().toString(36)}`,
        title: input.title,
        subjectId: input.subjectId,
        templateId: input.templateId,
        slides: input.slides,
        createdAt: Date.now(),
      };
      setPresentations((prev) => [presentation, ...prev]);
      return presentation;
    },
    []
  );

  const getPresentation = useCallback(
    (id: string) => presentations.find((p) => p.id === id),
    [presentations]
  );

  const updatePresentation = useCallback((id: string, updates: Partial<Presentation>) => {
    setPresentations((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePresentation = useCallback((id: string) => {
    setPresentations((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      presentations,
      getPresentation,
      createPresentation,
      updatePresentation,
      deletePresentation,
    }),
    [hydrated, presentations, getPresentation, createPresentation, updatePresentation, deletePresentation]
  );

  return <PresentationsContext.Provider value={value}>{children}</PresentationsContext.Provider>;
}

export function usePresentations(): PresentationsContextValue {
  const ctx = useContext(PresentationsContext);
  if (!ctx) throw new Error("usePresentations must be used within PresentationsProvider");
  return ctx;
}

export const appChapters = [
  { id: "opening", label: "Abertura" },
  { id: "love-letter", label: "Carta" },
  { id: "gallery", label: "Galeria" },
  { id: "timeline", label: "Linha do tempo" },
  { id: "memories", label: "Memorias" },
  { id: "promises", label: "Promessas" },
  { id: "finale", label: "Finale" },
] as const;

export type ChapterId = (typeof appChapters)[number]["id"];

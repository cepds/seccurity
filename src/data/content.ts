export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

export type GalleryEntry = {
  title: string;
  copy: string;
  badge: string;
  image: string;
  alt: string;
};

export type TimelineEntry = {
  date: string;
  title: string;
  copy: string;
  image: string;
  alt: string;
};

export type PromiseEntry = {
  title: string;
  copy: string;
};

export type MemoryMood = "Doce" | "Intensa" | "Safada" | "Saudade";

export type MemoryEntry = {
  id: string;
  title: string;
  date: string;
  mood: MemoryMood;
  headline: string;
  description: string;
  image: string;
};

export type MemoryDraft = Omit<MemoryEntry, "id">;

export type MemoryImageOption = {
  label: string;
  image: string;
};

const imagePathPattern = /^\/assets\/[a-z0-9/-]+\.(webp|png|jpg|jpeg|svg)$/i;

export const memoryMoodOptions: MemoryMood[] = ["Doce", "Intensa", "Safada", "Saudade"];

export const memoryImageOptions: MemoryImageOption[] = [
  {
    label: "Toque delicado",
    image: "/assets/memories/memory-01.webp",
  },
  {
    label: "Promessa em gesto",
    image: "/assets/memories/memory-02.webp",
  },
  {
    label: "Olhar em close",
    image: "/assets/memories/memory-03.webp",
  },
];

const allowedMemoryImages = new Set(memoryImageOptions.map((option) => option.image));

export function safeText(value?: string, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function truncateText(value: string, maxLength: number) {
  const normalized = safeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function safeImagePath(value?: string, fallback = memoryImageOptions[0].image) {
  if (typeof value === "string" && imagePathPattern.test(value.trim())) {
    return value.trim();
  }

  return fallback;
}

export function isValidIsoDate(value?: string) {
  const normalized = safeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().startsWith(normalized);
}

export function safeIsoDate(value: string, fallback: string) {
  return isValidIsoDate(value) ? value : fallback;
}

export function isMemoryMood(value: unknown): value is MemoryMood {
  return typeof value === "string" && memoryMoodOptions.includes(value as MemoryMood);
}

export function buildMemoryId() {
  return `memory-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createMemoryDraft(partial?: Partial<MemoryDraft>): MemoryDraft {
  return {
    title: safeText(partial?.title),
    date: safeIsoDate(safeText(partial?.date), new Date().toISOString().slice(0, 10)),
    mood: isMemoryMood(partial?.mood) ? partial.mood : "Doce",
    headline: safeText(partial?.headline),
    description: safeText(partial?.description),
    image: allowedMemoryImages.has(partial?.image ?? "")
      ? (partial?.image as string)
      : memoryImageOptions[0].image,
  };
}

export function hasRequiredMemoryFields(memory: MemoryDraft) {
  return (
    safeText(memory.title).length > 0 &&
    safeText(memory.headline).length > 0 &&
    safeText(memory.description).length > 0 &&
    isValidIsoDate(memory.date)
  );
}

export function sanitizeMemoryEntry(input: unknown, fallback?: MemoryEntry): MemoryEntry {
  const source = typeof input === "object" && input !== null ? input : {};
  const raw = source as Partial<MemoryEntry>;
  const base = fallback ?? {
    id: buildMemoryId(),
    ...createMemoryDraft(),
  };

  return {
    id: safeText(raw.id, base.id),
    title: truncateText(safeText(raw.title, base.title), 68),
    date: safeIsoDate(safeText(raw.date, base.date), base.date),
    mood: isMemoryMood(raw.mood) ? raw.mood : base.mood,
    headline: truncateText(safeText(raw.headline, base.headline), 72),
    description: truncateText(safeText(raw.description, base.description), 220),
    image: allowedMemoryImages.has(raw.image ?? "") ? (raw.image as string) : base.image,
  };
}

export function sanitizeMemoryEntries(input: unknown, fallback: MemoryEntry[]) {
  if (!Array.isArray(input)) {
    return fallback;
  }

  if (input.length === 0) {
    return [];
  }

  const sanitized = input
    .map((entry, index) => sanitizeMemoryEntry(entry, fallback[index] ?? fallback[0]))
    .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => right.date.localeCompare(left.date));

  return sanitized.length > 0 ? sanitized : fallback;
}

const fallbackMemories: MemoryEntry[] = [
  {
    id: "memory-01",
    title: "Primeiro cafe sem pressa de Carlos e Sandra",
    date: "2025-01-11",
    mood: "Doce",
    headline: "O tipo de calma que vira saudade boa",
    description:
      "Aquele momento simples que ficou gigante porque bastava a companhia um do outro para o mundo parecer completo.",
    image: "/assets/memories/memory-01.webp",
  },
  {
    id: "memory-02",
    title: "O gesto que virou promessa",
    date: "2025-08-19",
    mood: "Saudade",
    headline: "Tem carinho que parece promessa",
    description:
      "Tem dias que o melhor lugar do mundo cabe exatamente no espaco entre o ombro dela e o coracao dele.",
    image: "/assets/memories/memory-02.webp",
  },
  {
    id: "memory-03",
    title: "Um olhar que reorganiza tudo",
    date: "2025-12-07",
    mood: "Intensa",
    headline: "Close certo, pessoa certa, tempo certo",
    description:
      "Nem todo frame precisa de muita coisa para ficar eterno. As vezes basta o jeito que voces se olham.",
    image: "/assets/memories/memory-03.webp",
  },
];

export const appContent = {
  metadata: {
    marriageDate: "2024-11-28",
    targetDate: "2026-03-28",
  },
  hero: {
    eyebrow: "Luxury Edition | 28 de marco",
    title: "Carlos & Sandra",
    headline: "Uma estreia romantica pensada como cinema, toque e futuro.",
    description:
      "O APP AMOR agora abre como um filme intimista: poucas cenas por vez, mais silencio visual, mais presenca e fotos dirigindo o sentimento.",
    image: "/assets/hero/main.webp",
    portrait: "/assets/hero/portrait.webp",
    primaryCta: "Abrir surpresa",
    secondaryCta: "Tocar nossa trilha",
  },
  quiz: [
    {
      question: "Que dia voce se casou?",
      options: ["28 de novembro de 2024", "28 de marco de 2024", "08 de agosto de 2023"],
      answer: "28 de novembro de 2024",
    },
    {
      question: "Vai ter xibiu hoje?",
      options: ["Sim", "Nao"],
      answer: "Sim",
    },
    {
      question: "Que dia voces se conheceram?",
      options: ["8 de agosto de 2023", "28 de novembro de 2024", "8 de agosto de 2022"],
      answer: "8 de agosto de 2023",
    },
  ] satisfies QuizQuestion[],
  letters: [
    "Sandra, cada dia ao seu lado transforma o comum em algo raro. Este app existe para te lembrar que a nossa historia merece sempre um tratamento bonito, atento e inesquecivel.",
    "Quando penso em 28/11, penso em gratidao. Gratidao por tudo o que eu, Carlos, vivo com voce, pelas risadas, pelos abracos demorados e pela paz que o seu amor deixa no meu peito.",
    "Nosso casamento continua ganhando novas camadas, e talvez o meu detalhe favorito seja esse: a sensacao de que ainda existe muito amor novo para a gente descobrir juntos.",
  ],
  spotlightMessages: [
    "Sandra, voce e o tipo de amor que deixa paz no peito e vontade de futuro no coracao.",
    "Se hoje tivesse uma legenda, seria esta: Carlos continua apaixonado por cada detalhe seu.",
    "Nos dias bons, voce brilha. Nos dias dificeis, voce acolhe. Nos dois casos, eu te admiro mais.",
    "Nem todo presente cabe numa caixa. Este aqui tenta caber no tamanho do que eu sinto por voce.",
    "Voce conseguiu uma coisa rara: fazer o meu mundo parecer mais bonito sem deixar de ser real.",
  ],
  highlights: [
    {
      title: "Detalhes que contam tudo",
      copy: "As maos, o toque e o jeito de segurar a historia sem dizer uma palavra a mais.",
      image: "/assets/highlights/hands.webp",
      alt: "Detalhe das maos de Carlos e Sandra no casamento",
    },
    {
      title: "O beijo que vira cartaz",
      copy: "Uma cena forte o suficiente para segurar o primeiro impacto da abertura.",
      image: "/assets/highlights/kiss.webp",
      alt: "Carlos e Sandra se beijando no casamento",
    },
    {
      title: "O gesto que desacelera o mundo",
      copy: "Uma delicadeza que parece feita para o close certo e a memoria certa.",
      image: "/assets/highlights/gesture.webp",
      alt: "Carlos beijando a mao de Sandra",
    },
  ],
  gallery: [
    {
      title: "O nosso sim em plano aberto",
      copy: "Cena de apresentacao, com espaco, elegancia e a sensacao de que tudo estava exatamente no lugar.",
      badge: "Abertura",
      image: "/assets/gallery/frame-01.webp",
      alt: "Carlos e Sandra diante do altar no casamento",
    },
    {
      title: "Proximidade que vira atmosfera",
      copy: "Uma imagem para quando o app quiser trocar escala e ficar mais intimo sem perder impacto.",
      badge: "Close",
      image: "/assets/gallery/frame-02.webp",
      alt: "Carlos e Sandra em close romantico",
    },
    {
      title: "O beijo de grande lancamento",
      copy: "Aquele frame que segura hero, poster, capa e memoria favorita no mesmo instante.",
      badge: "Poster",
      image: "/assets/gallery/frame-03.webp",
      alt: "Carlos e Sandra se beijando",
    },
    {
      title: "Um gesto que diz futuro",
      copy: "O romantismo aqui nao e ruido. E gesto, pausa, presenca e direcao de olhar.",
      badge: "Toque",
      image: "/assets/gallery/frame-04.webp",
      alt: "Carlos beijando a mao de Sandra",
    },
    {
      title: "Os dois em eixo perfeito",
      copy: "Uma foto limpa para respirar entre blocos e manter o app com cara de editorial premium.",
      badge: "Editorial",
      image: "/assets/gallery/frame-05.webp",
      alt: "Carlos e Sandra se olhando no casamento",
    },
    {
      title: "Preto, branco e eternidade",
      copy: "Um encerramento visual mais classico para deixar a galeria com peso emocional.",
      badge: "Classic",
      image: "/assets/gallery/frame-06.webp",
      alt: "Carlos e Sandra em preto e branco",
    },
  ] satisfies GalleryEntry[],
  timeline: [
    {
      date: "08/08/2023",
      title: "Quando o roteiro mudou",
      copy: "O encontro que fez o resto ganhar outro sentido. O tipo de capitulo que parece pequeno no dia e enorme quando a historia amadurece.",
      image: "/assets/timeline/chapter-01.webp",
      alt: "Carlos e Sandra no altar",
    },
    {
      date: "28/11/2024",
      title: "O dia do nosso sim",
      copy: "Promessas, olhares, calor e a certeza de que o amor tambem pode ter cara de casa e de evento ao mesmo tempo.",
      image: "/assets/timeline/chapter-02.webp",
      alt: "Carlos e Sandra com familiares",
    },
    {
      date: "Primeiros meses",
      title: "Aprendendo a ser lar",
      copy: "A rotina ficou menos comum. O amor foi virando gesto, cuidado e o tipo de presenca que reorganiza qualquer dia.",
      image: "/assets/timeline/chapter-03.webp",
      alt: "Carlos e Sandra na cerimonia de casamento",
    },
    {
      date: "28/03/2026",
      title: "O nosso proximo grande capitulo",
      copy: "Uma data para olhar para tras com carinho e para frente com aquela fome boa de futuro compartilhado.",
      image: "/assets/timeline/chapter-04.webp",
      alt: "Carlos e Sandra se olhando com carinho",
    },
  ] satisfies TimelineEntry[],
  reasons: [
    "Sandra, voce faz os dias simples parecerem poesia.",
    "Seu cuidado me lembra que amar tambem e escolher ficar.",
    "A sua companhia deixa qualquer lugar mais bonito para Carlos.",
    "Com voce, os planos fazem sentido e o presente tambem.",
    "Seu jeito me acalma e me inspira ao mesmo tempo.",
    "Nosso amor tem verdade, parceria e vontade de futuro.",
  ],
  promises: [
    {
      title: "Continuar te escolhendo",
      copy: "Nos dias leves e nos dias corridos, com paciencia, escuta e carinho real.",
    },
    {
      title: "Criar novas memorias",
      copy: "Guardar espaco para viagens, risadas inesperadas e pequenas celebracoes nossas.",
    },
    {
      title: "Cuidar do nosso amor",
      copy: "Lembrar que o romance tambem vive na presenca, no toque e na delicadeza.",
    },
  ] satisfies PromiseEntry[],
  surprise: {
    title: "Se este app pudesse abracar, ele teria o meu jeito.",
    body:
      "Sandra, este presente foi pensado para te fazer sorrir, lembrar do quanto voce e amada e mostrar que a nossa historia merece ser celebrada de um jeito unico. Obrigado por ser meu amor, meu lar e a parte mais bonita dos meus dias.",
    signature: "Com amor, Carlos.",
  },
  finalVow:
    "Sandra, se um dia voce esquecer o tamanho do seu valor, abra este app e lembre: voce e o amor que Carlos agradece, admira e escolhe viver todos os dias. O nosso casamento nao e so uma data bonita. E a prova de que o amor pode ser casa, riso, colo, coragem e futuro ao mesmo tempo.",
  fallbackMemories,
};

export type ContrastPair = {
  foreground: string;
  background: string;
  minimum: 3 | 4.5;
  usage: string;
};

export const contrastPairs: ContrastPair[] = [
  { foreground: "ink", background: "bg", minimum: 4.5, usage: "Gövde metni / zemin" },
  { foreground: "ink", background: "surface", minimum: 4.5, usage: "Gövde metni / kart" },
  { foreground: "ink", background: "sunken", minimum: 4.5, usage: "Gövde metni / çukur yüzey" },
  { foreground: "ink-muted", background: "bg", minimum: 4.5, usage: "İkincil metin / zemin" },
  { foreground: "ink-muted", background: "surface", minimum: 4.5, usage: "İkincil metin / kart" },
  { foreground: "ink-muted", background: "sunken", minimum: 4.5, usage: "İkincil metin / çukur yüzey" },
  { foreground: "ink-muted", background: "primary-soft", minimum: 4.5, usage: "İkincil metin / yeşil etiket" },
  { foreground: "primary", background: "surface", minimum: 4.5, usage: "Bağlantı ve yeşil metin / kart" },
  { foreground: "primary", background: "bg", minimum: 4.5, usage: "Bağlantı ve yeşil metin / zemin" },
  { foreground: "primary", background: "primary-soft", minimum: 4.5, usage: "Etiket metni" },
  { foreground: "primary", background: "sunken", minimum: 4.5, usage: "Yeşil metin / çukur yüzey" },
  { foreground: "on-primary", background: "primary", minimum: 4.5, usage: "Birincil buton metni" },
  { foreground: "on-primary", background: "primary-hover", minimum: 4.5, usage: "Birincil buton metni (hover)" },
  { foreground: "accent-ink", background: "surface", minimum: 4.5, usage: "Kehribar metin / kart" },
  { foreground: "accent-ink", background: "accent-soft", minimum: 4.5, usage: "Kehribar etiket" },
  { foreground: "accent-ink", background: "bg", minimum: 4.5, usage: "Kehribar metin / zemin" },
  { foreground: "danger", background: "surface", minimum: 4.5, usage: "Hata metni / kart" },
  { foreground: "danger", background: "danger-soft", minimum: 4.5, usage: "Hata bandı" },
  { foreground: "danger", background: "bg", minimum: 4.5, usage: "Hata metni / zemin" },
  { foreground: "line-strong", background: "surface", minimum: 3, usage: "Form kenarlığı / kart" },
  { foreground: "line-strong", background: "bg", minimum: 3, usage: "Form kenarlığı / zemin" },
  { foreground: "focus", background: "surface", minimum: 3, usage: "Odak halkası / kart" },
  { foreground: "focus", background: "bg", minimum: 3, usage: "Odak halkası / zemin" },
  { foreground: "focus", background: "sunken", minimum: 3, usage: "Odak halkası / çukur yüzey" },
  { foreground: "surface", background: "primary", minimum: 3, usage: "Odak halkası / koyu yeşil bölüm" },
  { foreground: "accent", background: "primary", minimum: 3, usage: "Dekoratif kehribar / koyu yeşil" },
];

import type { MatchCardData } from "@/components/need/MatchCard";
import type { NeedCardData } from "@/components/need/NeedCard";

export const basketballRawText = "Cuma akşamı basketbol oynayacak 2 kişi arıyorum.";

export const basketballNeed: NeedCardData = {
  title: "Cuma akşamı basketbol",
  category: "Spor",
  tags: ["basketbol", "takım sporu"],
  when: "Bu cuma · akşam (18.00–22.00)",
  participants: "2 kişi aranıyor",
  postedAgo: "az önce",
  author: { name: "Deniz Yılmaz", department: "Bilgisayar Mühendisliği", verified: true },
};

export const pythonRawText = "Cumartesi proje için Python bilen bir arkadaş arıyorum.";

export const pythonParsed = [
  { label: "Başlık", value: "Cumartesi proje ortağı" },
  { label: "Kategori", value: "Ders / Proje" },
  { label: "Aranan beceri", value: "Python" },
  { label: "Kişi sayısı", value: "1" },
  { label: "Zaman", value: "Bu cumartesi" },
] as const;

export const exampleMatch: MatchCardData = {
  name: "Ece Kaya",
  department: "Spor Bilimleri",
  verified: true,
  score: 92,
  reasons: ["Aynı kampüstesiniz", "Basketbol ilginiz ortak", "Spor alanında deneyimin var"],
};

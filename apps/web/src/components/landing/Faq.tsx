import { Icon } from "@/components/ui/Icon";
import { Section } from "./Section";

export const faqItems = [
  {
    question: "KampüsAğı'na kimler katılabilir?",
    answer:
      "Türkiye'deki üniversitelerde okuyan ve öğrenci belgesini doğrulatan öğrenciler. Doğrulama tamamlanmadan kampüs içeriği ve eşleşmeler görüntülenemez.",
  },
  {
    question: "Neden öğrenci belgesi istiyorsunuz?",
    answer:
      "Platformdaki herkesin gerçekten üniversite öğrencisi olduğundan emin olmak için. Böylece sahte hesapların önüne geçilir.",
  },
  {
    question: "Belgemi kimler görebilir?",
    answer: "Yalnızca sen ve belgeyi inceleyen moderatör. Belge diğer kullanıcılara hiçbir zaman gösterilmez.",
  },
  {
    question: "Yapay zekâ ne yapıyor?",
    answer:
      "Yazdığın ihtiyaç metnini başlık, kategori, zaman, kişi sayısı ve etiketlere ayırır. Eşleşmeye, yetkilendirmeye veya moderasyona karar vermez; yayınlamadan önce sonucu sen onaylarsın.",
  },
  {
    question: "Eşleşme puanı nasıl hesaplanıyor?",
    answer:
      "Puan; kampüs, ilgi alanları, etiketler, beceriler, bölüm ve güvenilirlik gibi bileşenlerden sunucuda hesaplanır. Her eşleşmede hangi bileşenlerin öne çıktığını görürsün.",
  },
  {
    question: "Başka üniversitedeki öğrenciler paylaşımlarımı görebilir mi?",
    answer:
      "Kampüse özel paylaşımları yalnızca aynı üniversitedeki doğrulanmış öğrenciler görür. Bu kural sunucu tarafındaki güvenlik kurallarıyla uygulanır.",
  },
  {
    question: "Hesabımı silersem ne olur?",
    answer:
      "Öğrenci belgen ve kişisel verilerin silinir; korunması gereken içerikler kimliğinle ilişkilendirilmeyecek şekilde anonimleştirilir. Ayrıntılar yasal metinler kesinleştiğinde paylaşılacak.",
  },
] as const;

export function Faq() {
  return (
    <Section id="sss" eyebrow="SSS" title="Sık sorulan sorular">
      <div className="max-w-3xl divide-y divide-line rounded-card border border-line bg-surface">
        {faqItems.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <Icon name="chevron-down" className="text-primary transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-ink-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

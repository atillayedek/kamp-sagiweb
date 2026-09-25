import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları (Taslak)",
  description: "KampüsAğı kullanım şartları taslağı.",
  alternates: { canonical: "/kullanim-sartlari" },
};

export default function KullanimSartlariPage() {
  return (
    <LegalPage title="Kullanım Şartları" summary="KampüsAğı'nı kullanırken uyulması gereken kurallar.">
      <section>
        <h2>Kimler kullanabilir?</h2>
        <p>
          KampüsAğı, öğrenci belgesiyle doğrulanmış üniversite öğrencileri içindir. Doğrulama tamamlanmadan kampüs
          içeriğine ve eşleşmelere erişilemez. <Pending>Yaş sınırı — karar bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>Hesabın ve belgen</h2>
        <ul>
          <li>Yüklediğin öğrenci belgesi sana ait ve güncel olmalıdır.</li>
          <li>Başkasına ait veya değiştirilmiş belge yüklemek yasaktır ve hesabın kapatılmasına yol açar.</li>
          <li>Hesabının güvenliğinden sen sorumlusun.</li>
        </ul>
      </section>
      <section>
        <h2>İçerik kuralları</h2>
        <ul>
          <li>Taciz, nefret söylemi, tehdit ve ayrımcılık içeren içerik paylaşılamaz.</li>
          <li>Başkalarının kişisel bilgilerini izinsiz paylaşamazsın.</li>
          <li>Yanıltıcı, sahte veya ticari spam niteliğinde ilan veremezsin.</li>
        </ul>
      </section>
      <section>
        <h2>Moderasyon ve bildirim</h2>
        <p>
          Kurallara aykırı içerik ve kullanıcılar bildirilebilir. Moderatörler bildirimleri inceler; içerik kaldırma,
          uyarı veya hesap kısıtlama gibi işlemler denetim kaydıyla uygulanır.
        </p>
      </section>
      <section>
        <h2>Yapay zekâ ile yapılandırma</h2>
        <p>
          İhtiyaç metnin yapay zekâ ile yapılandırılır. Sonuç hatalı olabilir; yayınlamadan önce kontrol etmek ve
          düzenlemek senin sorumluluğundadır.
        </p>
      </section>
      <section>
        <h2>Sorumluluk ve uyuşmazlıklar</h2>
        <p>
          <Pending>Sorumluluğun sınırlandırılması, uygulanacak hukuk ve yetkili mahkeme — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
    </LegalPage>
  );
}

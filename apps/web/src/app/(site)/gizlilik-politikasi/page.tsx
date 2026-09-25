import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası (Taslak)",
  description: "KampüsAğı gizlilik politikası taslağı.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

export default function GizlilikPolitikasiPage() {
  return (
    <LegalPage title="Gizlilik Politikası" summary="KampüsAğı'nda hangi bilgileri neden işlediğimiz ve bunlar üzerindeki kontrolün.">
      <section>
        <h2>Temel ilkeler</h2>
        <ul>
          <li>Yalnızca hizmeti sunmak için gereken veriyi işleriz.</li>
          <li>Öğrenci belgen yalnızca sana ve belgeyi inceleyen moderatöre açıktır.</li>
          <li>Kampüse özel içerik yalnızca aynı üniversitedeki doğrulanmış öğrencilere gösterilir.</li>
          <li>Eşleşme puanı, doğrulama durumu ve sayaçlar yalnızca sunucuda üretilir.</li>
        </ul>
      </section>
      <section>
        <h2>Yapay zekâ kullanımı</h2>
        <p>
          İhtiyaç metnin, başlık, kategori, zaman ve etiketlere ayrılması için Anthropic&apos;in Claude API&apos;sine
          gönderilir. Metindeki telefon numarası, T.C. kimlik numarası, IBAN ve e-posta gibi kalıplar gönderilmeden önce
          maskelenir. Yapay zekâ eşleşme, yetkilendirme veya moderasyon kararı vermez; yapılandırılmış ilanı yayınlamadan
          önce sen onaylarsın.
        </p>
      </section>
      <section>
        <h2>Saklama süreleri</h2>
        <p>
          <Pending>Veri kategorilerine göre saklama süreleri — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>Kontrollerin</h2>
        <ul>
          <li>Verilerimi indir: hakkında tutulan verilerin bir kopyasını al.</li>
          <li>Hesabımı sil: öğrenci belgen ve kişisel verilerin silinir, gerekli içerikler anonimleştirilir.</li>
          <li>Görünürlük ve mesajlaşma ayarları: profilini kimin göreceğini ve sana kimin yazabileceğini belirle.</li>
          <li>Engellenen kullanıcılar: istemediğin kişilerin seninle iletişim kurmasını engelle.</li>
        </ul>
      </section>
      <section>
        <h2>Güvenlik</h2>
        <p>
          Verilere erişim sunucu tarafındaki güvenlik kurallarıyla sınırlandırılır; yetkiler yalnızca sunucu tarafından
          atanır. Yetkili moderatör işlemleri denetim kaydıyla izlenir.
        </p>
      </section>
      <section>
        <h2>Yaş sınırı</h2>
        <p>
          <Pending>18 yaş altı kullanıcılara ilişkin kural — karar bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>Değişiklikler</h2>
        <p>
          <Pending>Politika değişikliklerinin duyurulma yöntemi — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
    </LegalPage>
  );
}

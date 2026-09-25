import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aydınlatma Metni (Taslak)",
  description: "KampüsAğı kişisel verilerin korunması aydınlatma metni taslağı.",
  alternates: { canonical: "/aydinlatma-metni" },
};

export default function AydinlatmaMetniPage() {
  return (
    <LegalPage
      title="Kişisel Verilerin Korunması Aydınlatma Metni"
      summary="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, kişisel verilerinin nasıl işlendiğine dair bilgilendirme."
    >
      <section>
        <h2>1. Veri sorumlusu</h2>
        <p>
          <Pending>Veri sorumlusunun unvanı, adresi ve iletişim bilgileri — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>2. İşlenen kişisel veriler</h2>
        <ul>
          <li>Kimlik ve iletişim: e-posta adresi, görünen ad</li>
          <li>Öğrenim: üniversite, bölüm</li>
          <li>Öğrenci belgesi: e-Devlet üzerinden alınmış öğrenci belgesi (PDF)</li>
          <li>Profil: ilgi alanları, beceriler, kısa tanıtım</li>
          <li>Kullanıcı içeriği: ihtiyaç ilanları, gönderiler, yorumlar, mesajlar</li>
          <li>Eşleşme verileri: eşleşme puanı ve gerekçeleri</li>
          <li>İşlem güvenliği: oturum ve güvenlik kayıtları</li>
        </ul>
      </section>
      <section>
        <h2>3. İşleme amaçları</h2>
        <ul>
          <li>Hesabın oluşturulması ve yönetilmesi</li>
          <li>Üniversite öğrencisi olduğunun doğrulanması</li>
          <li>İhtiyaç metninin yapılandırılmış ilana dönüştürülmesi</li>
          <li>Eşleşmelerin hesaplanması ve gösterilmesi</li>
          <li>Mesajlaşma, topluluk ve bildirim hizmetlerinin sunulması</li>
          <li>Platform güvenliğinin ve moderasyonun sağlanması</li>
        </ul>
      </section>
      <section>
        <h2>4. Kişisel verilerin aktarılması</h2>
        <p>Hizmetin sunulması için kişisel veriler aşağıdaki hizmet sağlayıcılarla paylaşılabilir:</p>
        <ul>
          <li>Google (Firebase): kimlik doğrulama, veri tabanı, dosya depolama ve sunucu altyapısı</li>
          <li>
            Anthropic (Claude API): ihtiyaç metninin yapılandırılması. Metindeki telefon numarası, T.C. kimlik numarası,
            IBAN ve e-posta gibi kalıplar gönderilmeden önce maskelenir.
          </li>
        </ul>
        <p>
          Bu hizmet sağlayıcıların sunucuları yurt dışında bulunabilir.{" "}
          <Pending>Yurt dışına aktarımın hukuki dayanağı ve usulü — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>5. Toplama yöntemi ve hukuki sebep</h2>
        <p>
          Kişisel veriler, uygulamaya girdiğin bilgiler ve yüklediğin belgeler aracılığıyla elektronik ortamda toplanır.{" "}
          <Pending>Her işleme amacı için hukuki sebep — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
      <section>
        <h2>6. Kanun kapsamındaki hakların</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca;</p>
        <ul>
          <li>Kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>Kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
          <li>Düzeltme, silme veya yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
          <li>
            İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhine bir sonucun ortaya
            çıkmasına itiraz etme,
          </li>
          <li>Kanuna aykırı işleme sebebiyle zarara uğraman hâlinde zararın giderilmesini talep etme</li>
        </ul>
        <p>haklarına sahipsin.</p>
      </section>
      <section>
        <h2>7. Başvuru</h2>
        <p>
          <Pending>Başvuru kanalı ve yanıt süreci — hukuk onayı bekleniyor</Pending>
        </p>
      </section>
    </LegalPage>
  );
}

import type { VerificationStatus } from "@kampusagi/contracts";
import { Banner } from "@/components/ui/Banner";

export function VerificationBanner({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return (
      <Banner tone="success" title="Doğrulanmış öğrencisin">
        Kampüs içeriğine ve eşleşmelere erişebilirsin.
      </Banner>
    );
  }
  if (status === "pending") {
    return (
      <Banner tone="warning" title="Öğrenci belgen inceleniyor">
        Onaylanana kadar kampüs içeriği ve eşleşmeler kapalı kalır.
      </Banner>
    );
  }
  if (status === "rejected") {
    return (
      <Banner tone="danger" title="Öğrenci belgen onaylanmadı">
        Yeni bir belge yükleyerek tekrar başvurabilirsin.
      </Banner>
    );
  }
  return (
    <Banner tone="warning" title="Öğrenci doğrulaman henüz yapılmadı">
      Kampüs içeriğine ve eşleşmelere erişmek için e-Devlet öğrenci belgeni yüklemelisin.
    </Banner>
  );
}

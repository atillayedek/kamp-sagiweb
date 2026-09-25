import type { VerificationStatus } from "@kampusagi/contracts";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";

const action = (label: string) => (
  <ButtonLink href="/dogrulama" variant="secondary">
    {label}
  </ButtonLink>
);

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
      <Banner tone="danger" title="Öğrenci belgen onaylanmadı" action={action("Ayrıntılar")}>
        Yeni bir belge yükleyerek tekrar başvurabilirsin.
      </Banner>
    );
  }
  return (
    <Banner tone="warning" title="Öğrenci doğrulaman henüz yapılmadı" action={action("Belgeni yükle")}>
      Kampüs içeriğine ve eşleşmelere erişmek için e-Devlet öğrenci belgeni yüklemelisin.
    </Banner>
  );
}

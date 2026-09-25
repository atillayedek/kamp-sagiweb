"use client";

import { useState, type ReactNode } from "react";
import { basketballNeed, exampleMatch } from "@/components/landing/examples";
import { MatchCard } from "@/components/need/MatchCard";
import { NeedCard } from "@/components/need/NeedCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { Chip, Tag } from "@/components/ui/Tag";
import { TextArea, TextField } from "@/components/ui/TextField";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { Wordmark } from "@/components/site/Logo";

const swatches = [
  { token: "bg", className: "bg-bg", note: "Zemin" },
  { token: "surface", className: "bg-surface", note: "Kart" },
  { token: "sunken", className: "bg-sunken", note: "Çukur yüzey" },
  { token: "ink", className: "bg-ink", note: "Metin" },
  { token: "ink-muted", className: "bg-ink-muted", note: "İkincil metin" },
  { token: "primary", className: "bg-primary", note: "Ana renk" },
  { token: "primary-hover", className: "bg-primary-hover", note: "Ana renk (hover)" },
  { token: "primary-soft", className: "bg-primary-soft", note: "Yeşil etiket" },
  { token: "accent", className: "bg-accent", note: "Kehribar — yalnızca dekoratif" },
  { token: "accent-ink", className: "bg-accent-ink", note: "Kehribar metin" },
  { token: "accent-soft", className: "bg-accent-soft", note: "Kehribar etiket" },
  { token: "line", className: "bg-line", note: "Dekoratif çizgi" },
  { token: "line-strong", className: "bg-line-strong", note: "Form kenarlığı" },
  { token: "danger", className: "bg-danger", note: "Hata" },
  { token: "danger-soft", className: "bg-danger-soft", note: "Hata zemini" },
];

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.show({ title: "İlan kaydedildi", tone: "success" })}>Başarılı bildirim</Button>
      <Button
        variant="secondary"
        onClick={() => toast.show({ title: "Bağlantı sorunu", description: "Lütfen tekrar dene.", tone: "danger" })}
      >
        Hata bildirimi
      </Button>
    </div>
  );
}

function Gallery() {
  const [modal, setModal] = useState<"center" | "sheet" | null>(null);
  const [selected, setSelected] = useState<string[]>(["Spor"]);
  const [need, setNeed] = useState("Cuma akşamı basketbol oynayacak 2 kişi arıyorum.");

  function toggleChip(value: string) {
    setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <Wordmark className="text-primary" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tasarım sistemi</h1>
        <p className="max-w-2xl text-ink-muted">
          Bileşenler yalnızca <code>globals.css</code> içindeki token&apos;ları kullanır. Kontrast oranları
          <code> src/design/tokens.test.ts</code> ile otomatik doğrulanır. Bu sayfa arama motorlarına kapalıdır.
        </p>
      </header>

      <GallerySection title="Renkler">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((swatch) => (
            <li key={swatch.token} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className={`h-16 ${swatch.className}`} />
              <div className="p-3 text-sm">
                <p className="font-semibold">{swatch.token}</p>
                <p className="text-ink-muted">{swatch.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </GallerySection>

      <GallerySection title="Tipografi">
        <div className="space-y-2">
          <p className="text-4xl font-bold tracking-tight">Başlık 1 — Kampüste ihtiyacını yaz</p>
          <p className="text-3xl font-bold tracking-tight">Başlık 2 — Doğru kişiyle buluş</p>
          <p className="text-xl font-semibold">Başlık 3 — Neden eşleştiniz?</p>
          <p>Gövde metni: Çağrı, Işıl, İlkay, Şule, Göksu ve Ümit öğüt veriyor.</p>
          <p className="text-sm text-ink-muted">İkincil metin: ğ ş ı İ ö ç ü — Ğ Ş I İ Ö Ç Ü</p>
        </div>
      </GallerySection>

      <GallerySection title="Butonlar">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Birincil</Button>
          <Button variant="secondary">İkincil</Button>
          <Button variant="ghost">Sade</Button>
          <Button variant="danger">Hesabımı sil</Button>
          <Button disabled>Devre dışı</Button>
          <ButtonLink href="/" variant="secondary">
            Bağlantı butonu
          </ButtonLink>
          <IconButton icon="settings" label="Ayarlar" />
          <IconButton icon="bookmark" label="Kaydet" />
        </div>
      </GallerySection>

      <GallerySection title="Form alanları">
        <div className="grid gap-6 md:grid-cols-2">
          <TextField label="Görünen ad" hint="Profilinde görünecek ad." required placeholder="Örn. Deniz" />
          <TextField label="Bölüm" error="Bölüm alanı boş bırakılamaz." defaultValue="" />
          <div className="md:col-span-2">
            <TextArea
              label="İhtiyacını yaz"
              hint="Ne, ne zaman ve kaç kişi aradığını yaz."
              maxLength={280}
              value={need}
              onChange={(event) => setNeed(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <FileDropzone
              label="Öğrenci belgesi"
              hint="e-Devlet'ten aldığın öğrenci belgesini PDF olarak yükle. Bu galeride dosya hiçbir yere gönderilmez."
              maxBytes={MAX_PDF_BYTES}
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 font-semibold">Yükleme sürüyor (örnek durum)</p>
            <UploadProgress fileName="ogrenci-belgesi.pdf" fileSize={412_000} progress={42} onCancel={() => undefined} />
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Etiketler, filtreler ve rozetler">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>basketbol</Tag>
          <Tag tone="accent">Spor</Tag>
          <Tag tone="neutral">global</Tag>
          <VerifiedBadge />
          <Badge tone="accent" icon="clock">
            Doğrulama bekliyor
          </Badge>
          <Badge tone="danger" icon="alert">
            Reddedildi
          </Badge>
        </div>
        <div role="group" aria-label="Kategori filtresi" className="flex flex-wrap gap-2">
          {["Spor", "Ders / Proje", "Etkinlik", "Kulüp"].map((value) => (
            <Chip key={value} selected={selected.includes(value)} onClick={() => toggleChip(value)}>
              {value}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Avatar name="Deniz Yılmaz" size="sm" />
          <Avatar name="ilker ışık" />
          <Avatar name="Ece Kaya" size="lg" />
        </div>
      </GallerySection>

      <GallerySection title="Bantlar">
        <div className="space-y-3">
          <Banner tone="warning" title="Öğrenci belgen inceleniyor">
            Onaylanana kadar kampüs içeriği ve eşleşmeler kapalı.
          </Banner>
          <Banner tone="danger" title="Belgen onaylanmadı" action={<Button variant="secondary">Yeniden yükle</Button>}>
            Sebep: Belge okunamıyor. Lütfen e-Devlet&apos;ten yeni bir belge indirip tekrar yükle.
          </Banner>
          <Banner tone="success" title="Doğrulandın">
            Artık kampüs içeriğine ve eşleşmelere erişebilirsin.
          </Banner>
          <Banner tone="info" title="Bilgi">
            Yapılandırılmış ilanı yayınlamadan önce düzenleyebilirsin.
          </Banner>
        </div>
      </GallerySection>

      <GallerySection title="Kartlar ve TearOffStrip">
        <div className="board-dots grid gap-8 rounded-[20px] bg-sunken p-6 md:grid-cols-2">
          <NeedCard
            need={basketballNeed}
            pinned
            actions={[
              { id: "interest", label: "İlgileniyorum", icon: "hand", toggle: true },
              { id: "save", label: "Kaydet", icon: "bookmark", toggle: true, defaultPressed: true },
            ]}
          />
          <MatchCard
            match={exampleMatch}
            footer={
              <>
                <Button>Mesaj gönder</Button>
                <Button variant="ghost">Gizle</Button>
              </>
            }
          />
          <Card className="p-5 md:col-span-2">Düz kart içeriği.</Card>
        </div>
      </GallerySection>

      <GallerySection title="Sekmeler">
        <Tabs
          label="Örnek sekmeler"
          items={[
            { id: "a", label: "Keşfet", icon: "compass", content: <Card className="p-5">Keşfet içeriği</Card> },
            { id: "b", label: "Topluluklar", icon: "users", content: <Card className="p-5">Topluluklar içeriği</Card> },
            { id: "c", label: "Mesajlar", icon: "chat", content: <Card className="p-5">Mesajlar içeriği</Card> },
            { id: "d", label: "Profil", icon: "user", content: <Card className="p-5">Profil içeriği</Card> },
          ]}
        />
      </GallerySection>

      <GallerySection title="Modal ve alt sayfa">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal("center")}>Modal aç</Button>
          <Button variant="secondary" onClick={() => setModal("sheet")}>
            Alt sayfa aç
          </Button>
        </div>
        <Modal
          open={modal !== null}
          onClose={() => setModal(null)}
          variant={modal ?? "center"}
          title="Hesabını silmek istiyor musun?"
          description="Bu işlem geri alınamaz."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Vazgeç
              </Button>
              <Button variant="danger" onClick={() => setModal(null)}>
                Hesabımı sil
              </Button>
            </>
          }
        >
          <p>Öğrenci belgen ve kişisel verilerin silinir; gerekli içerikler anonimleştirilir.</p>
        </Modal>
      </GallerySection>

      <GallerySection title="Bildirimler (toast)">
        <ToastDemo />
      </GallerySection>

      <GallerySection title="Yükleniyor, boş ve hata durumları">
        <LoadingRegion label="İlanlar yükleniyor">
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        </LoadingRegion>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            title="Henüz ilan yok"
            description="Kampüsünde ilk ihtiyacı sen paylaş."
            action={<Button>İhtiyacını yaz</Button>}
          />
          <ErrorState
            title="İlanlar yüklenemedi"
            description="Bağlantını kontrol edip tekrar dene."
            action={<Button variant="secondary">Tekrar dene</Button>}
          />
        </div>
      </GallerySection>
    </div>
  );
}

export function DesignGallery() {
  return (
    <ToastProvider>
      <main id="icerik">
        <Gallery />
      </main>
    </ToastProvider>
  );
}

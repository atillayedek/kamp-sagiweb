import { ButtonLink } from "@/components/ui/Button";

export function ClosingCta() {
  return (
    <section aria-labelledby="kapanis-baslik" className="pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="board-dots flex flex-col items-start gap-5 rounded-[20px] border border-line bg-sunken p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 id="kapanis-baslik" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kampüsünde doğru kişiyi bulmak bu kadar kolay olmalı.
            </h2>
            <p className="text-ink-muted">Kayıtlar henüz açık değil. Açıldığında bu sayfada duyurulacak.</p>
          </div>
          <ButtonLink href="#sss" variant="secondary">
            Sorularına göz at
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

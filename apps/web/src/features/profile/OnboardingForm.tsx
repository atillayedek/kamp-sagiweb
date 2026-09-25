"use client";

import { completeOnboardingRequestSchema, LEGAL_TERMS_VERSION } from "@kampusagi/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { RequiredNote } from "@/components/ui/RequiredNote";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { SelectField } from "@/components/ui/SelectField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { safeNextPath } from "@/lib/redirect";
import { profileFieldErrors, type ProfileFieldErrors } from "./fieldErrors";
import { ProfileFields, type ProfileDraft } from "./ProfileFields";
import { parseTagInput } from "./tags";
import { useUniversities } from "./useUniversities";

const emptyDraft: ProfileDraft = { displayName: "", department: "", interests: "", skills: "", bio: "" };

function NewTabLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-4">
      {children}
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </Link>
  );
}

export function OnboardingForm() {
  const { functions } = useConnectors();
  const router = useRouter();
  const searchParams = useSearchParams();
  const universities = useUniversities();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [universityId, setUniversityId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = {
      displayName: draft.displayName,
      department: draft.department,
      interests: parseTagInput(draft.interests),
      skills: parseTagInput(draft.skills),
      bio: draft.bio,
      universityId,
      acceptedTermsVersion: accepted ? LEGAL_TERMS_VERSION : "",
    };
    const parsed = completeOnboardingRequestSchema.safeParse(request);
    if (!parsed.success) {
      setErrors(profileFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    setFormError(null);
    try {
      await functions.call("completeOnboarding", { ...request, acceptedTermsVersion: LEGAL_TERMS_VERSION });
      router.replace(safeNextPath(searchParams.get("next")));
    } catch (error) {
      setFormError(toAppError(error).message);
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {formError && <Banner tone="danger" title={formError} live />}
      <RequiredNote />
      {universities.status === "loading" && <Skeleton className="h-20 w-full" />}
      {universities.status === "error" && <Banner tone="danger" title={universities.error.message} />}
      {universities.status === "ready" && (
        <SelectField
          label="Üniversiten"
          hint="Kampüse özel içerikleri yalnızca aynı üniversitedeki doğrulanmış öğrenciler görür."
          required
          placeholder="Üniversiteni seç"
          options={universities.universities.map((u) => ({ value: u.id, label: `${u.name} (${u.city})` }))}
          value={universityId}
          error={errors.universityId}
          onChange={(event) => setUniversityId(event.target.value)}
        />
      )}
      <ProfileFields draft={draft} errors={errors} onChange={setDraft} />
      <CheckboxField
        checked={accepted}
        onChange={(event) => setAccepted(event.target.checked)}
        error={errors.acceptedTermsVersion}
        label={
          <>
            <NewTabLink href="/kullanim-sartlari">Kullanım Şartları</NewTabLink>&apos;nı kabul ediyorum ve{" "}
            <NewTabLink href="/aydinlatma-metni">Aydınlatma Metni</NewTabLink>&apos;ni okudum.
          </>
        }
      />
      <Button type="submit" fullWidth disabled={pending || universities.status !== "ready"}>
        {pending ? "Profil oluşturuluyor…" : "Profilimi oluştur"}
      </Button>
    </form>
  );
}

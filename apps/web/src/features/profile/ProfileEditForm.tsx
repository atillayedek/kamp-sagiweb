"use client";

import { updateProfileRequestSchema, type PublicProfile } from "@kampusagi/contracts";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { RequiredNote } from "@/components/ui/RequiredNote";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { profileFieldErrors, type ProfileFieldErrors } from "./fieldErrors";
import { ProfileFields, type ProfileDraft } from "./ProfileFields";
import { formatTagInput, parseTagInput } from "./tags";

function draftFrom(profile: PublicProfile): ProfileDraft {
  return {
    displayName: profile.displayName,
    department: profile.department,
    interests: formatTagInput(profile.interests),
    skills: formatTagInput(profile.skills),
    bio: profile.bio,
  };
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function changedFields(profile: PublicProfile, draft: ProfileDraft) {
  const next = {
    displayName: draft.displayName.trim(),
    department: draft.department.trim(),
    interests: parseTagInput(draft.interests),
    skills: parseTagInput(draft.skills),
    bio: draft.bio.trim(),
  };
  return {
    ...(next.displayName !== profile.displayName && { displayName: next.displayName }),
    ...(next.department !== profile.department && { department: next.department }),
    ...(!sameList(next.interests, profile.interests) && { interests: next.interests }),
    ...(!sameList(next.skills, profile.skills) && { skills: next.skills }),
    ...(next.bio !== profile.bio && { bio: next.bio }),
  };
}

type ProfileEditFormProps = {
  profile: PublicProfile;
  onDone: () => void;
};

export function ProfileEditForm({ profile, onDone }: ProfileEditFormProps) {
  const { functions } = useConnectors();
  const toast = useToast();
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(profile));
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changes = changedFields(profile, draft);
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    const parsed = updateProfileRequestSchema.safeParse(changes);
    if (!parsed.success) {
      setErrors(profileFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    setFormError(null);
    try {
      await functions.call("updateProfile", changes);
      toast.show({ title: "Profilin güncellendi", tone: "success" });
      onDone();
    } catch (error) {
      setFormError(toAppError(error).message);
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {formError && <Banner tone="danger" title={formError} live />}
      <RequiredNote />
      <ProfileFields draft={draft} errors={errors} onChange={setDraft} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

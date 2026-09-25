"use client";

import { PROFILE_LIMITS } from "@kampusagi/contracts";
import { TextArea, TextField } from "@/components/ui/TextField";
import type { ProfileFieldErrors } from "./fieldErrors";

export type ProfileDraft = {
  displayName: string;
  department: string;
  interests: string;
  skills: string;
  bio: string;
};

type ProfileFieldsProps = {
  draft: ProfileDraft;
  errors: ProfileFieldErrors;
  onChange: (draft: ProfileDraft) => void;
};

export function ProfileFields({ draft, errors, onChange }: ProfileFieldsProps) {
  const set = (key: keyof ProfileDraft) => (value: string) => onChange({ ...draft, [key]: value });
  return (
    <>
      <TextField
        label="Görünen ad"
        hint="Diğer öğrenciler seni bu adla görür."
        autoComplete="nickname"
        required
        maxLength={PROFILE_LIMITS.displayName.max}
        value={draft.displayName}
        error={errors.displayName}
        onChange={(event) => set("displayName")(event.target.value)}
      />
      <TextField
        label="Bölüm"
        required
        maxLength={PROFILE_LIMITS.department.max}
        value={draft.department}
        error={errors.department}
        onChange={(event) => set("department")(event.target.value)}
      />
      <TextField
        label="İlgi alanların"
        hint="Virgülle ayır. Örn. basketbol, fotoğrafçılık, satranç"
        value={draft.interests}
        error={errors.interests}
        onChange={(event) => set("interests")(event.target.value)}
      />
      <TextField
        label="Becerilerin"
        hint="Virgülle ayır. Örn. python, gitar, grafik tasarım"
        value={draft.skills}
        error={errors.skills}
        onChange={(event) => set("skills")(event.target.value)}
      />
      <TextArea
        label="Kısa tanıtım"
        hint="İsteğe bağlı."
        maxLength={PROFILE_LIMITS.bio.max}
        rows={3}
        value={draft.bio}
        error={errors.bio}
        onChange={(event) => set("bio")(event.target.value)}
      />
    </>
  );
}

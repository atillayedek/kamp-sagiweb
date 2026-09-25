"use client";

import { NEED_CATEGORIES, NEED_LIMITS, NEED_WHEN_KINDS } from "@kampusagi/contracts";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import type { NeedFieldErrors, NeedFormState } from "./form";
import { categoryLabels, visibilityLabels, whenKindLabels } from "./labels";

type NeedFieldsProps = {
  state: NeedFormState;
  errors: NeedFieldErrors;
  onChange: (state: NeedFormState) => void;
};

const categoryOptions = NEED_CATEGORIES.map((value) => ({ value, label: categoryLabels[value] }));
const whenOptions = NEED_WHEN_KINDS.map((value) => ({ value, label: whenKindLabels[value] }));
const visibilityOptions = (["campus", "global"] as const).map((value) => ({
  value,
  label: visibilityLabels[value].title,
  description: visibilityLabels[value].description,
}));

export function NeedFields({ state, errors, onChange }: NeedFieldsProps) {
  const set = <K extends keyof NeedFormState>(key: K) => (value: NeedFormState[K]) => onChange({ ...state, [key]: value });
  const timed = state.whenKind === "exact" || state.whenKind === "range";
  return (
    <div className="flex flex-col gap-5">
      <TextField
        label="Başlık"
        required
        maxLength={NEED_LIMITS.title.max}
        value={state.title}
        error={errors.title}
        onChange={(event) => set("title")(event.target.value)}
      />
      <SelectField
        label="Kategori"
        required
        options={categoryOptions}
        value={state.category}
        error={errors.category}
        onChange={(event) => set("category")(event.target.value as NeedFormState["category"])}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 font-semibold text-ink">Aranan kişi sayısı</legend>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="En az"
            type="number"
            inputMode="numeric"
            min={NEED_LIMITS.participants.min}
            max={NEED_LIMITS.participants.max}
            value={state.participantsMin}
            onChange={(event) => set("participantsMin")(event.target.value)}
          />
          <TextField
            label="En fazla"
            type="number"
            inputMode="numeric"
            min={NEED_LIMITS.participants.min}
            max={NEED_LIMITS.participants.max}
            value={state.participantsMax}
            onChange={(event) => set("participantsMax")(event.target.value)}
          />
        </div>
        {errors.participants && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.participants}
          </p>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 font-semibold text-ink">Zaman</legend>
        <SelectField
          label="Zaman türü"
          options={whenOptions}
          value={state.whenKind}
          onChange={(event) => set("whenKind")(event.target.value as NeedFormState["whenKind"])}
        />
        {timed && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={state.whenKind === "range" ? "Başlangıç" : "Tarih ve saat"}
              type="datetime-local"
              required
              value={state.whenStart}
              error={errors.whenStart}
              onChange={(event) => set("whenStart")(event.target.value)}
            />
            {state.whenKind === "range" && (
              <TextField
                label="Bitiş"
                type="datetime-local"
                required
                value={state.whenEnd}
                error={errors.whenEnd}
                onChange={(event) => set("whenEnd")(event.target.value)}
              />
            )}
          </div>
        )}
        {state.whenKind === "flexible" && (
          <TextField
            label="Zaman açıklaması"
            hint="Örn. hafta içi akşamları"
            maxLength={NEED_LIMITS.whenText.max}
            value={state.whenText}
            error={errors.whenText}
            onChange={(event) => set("whenText")(event.target.value)}
          />
        )}
      </fieldset>
      <TextField
        label="Konum"
        hint="İsteğe bağlı. Örn. merkez kütüphane"
        maxLength={NEED_LIMITS.locationHint.max}
        value={state.locationHint}
        error={errors.locationHint}
        onChange={(event) => set("locationHint")(event.target.value)}
      />
      <TextField
        label="Etiketler"
        hint="Virgülle ayır. Örn. basketbol, akşam"
        value={state.tags}
        error={errors.tags}
        onChange={(event) => set("tags")(event.target.value)}
      />
      <TextField
        label="Gereken beceriler"
        hint="İsteğe bağlı, virgülle ayır. Eşleştirmede kullanılır."
        value={state.requiredSkills}
        error={errors.requiredSkills}
        onChange={(event) => set("requiredSkills")(event.target.value)}
      />
      <RadioGroup
        legend="Kimler görsün?"
        value={state.visibility}
        options={visibilityOptions}
        onChange={set("visibility")}
      />
    </div>
  );
}

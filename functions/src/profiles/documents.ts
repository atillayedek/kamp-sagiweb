import type { CompleteOnboardingRequest, EditableProfile } from "@kampusagi/contracts";

type ParsedOnboarding = EditableProfile & Pick<CompleteOnboardingRequest, "universityId" | "acceptedTermsVersion">;

export function newProfileDocuments<T>(input: ParsedOnboarding, timestamp: T) {
  return {
    profile: {
      displayName: input.displayName,
      universityId: input.universityId,
      department: input.department,
      interests: input.interests,
      skills: input.skills,
      bio: input.bio,
      verificationStatus: "unverified" as const,
      reputationScore: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    private: {
      legal: { acceptedTermsVersion: input.acceptedTermsVersion, acceptedAt: timestamp },
      privacy: { profileVisibility: "campus" as const },
      messaging: { allowFrom: "campus" as const },
      createdAt: timestamp,
    },
  };
}

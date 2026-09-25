import { AppSections } from "@/components/landing/AppSections";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Matching } from "@/components/landing/Matching";
import { Privacy } from "@/components/landing/Privacy";
import { Verification } from "@/components/landing/Verification";
import { siteConfig } from "@/lib/site";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "tr-TR",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <HowItWorks />
      <Verification />
      <AppSections />
      <Matching />
      <Privacy />
      <Faq />
      <ClosingCta />
    </>
  );
}

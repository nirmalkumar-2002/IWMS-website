import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { sharedContent } from '@/content/shared';
export default function Privacy() {
  return (
    <Section id="privacy">
      <Heading as="h1">{sharedContent.privacyTitle}</Heading>
      <p className="section-description">{sharedContent.privacyPending}</p>
    </Section>
  );
}

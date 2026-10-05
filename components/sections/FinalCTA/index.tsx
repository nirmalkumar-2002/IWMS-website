import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { finalCTAContent } from '@/content/final-cta';
export default function FinalCTA() {
  return (
    <Section id={finalCTAContent.id} variant="dark">
      <Heading as="h2" eyebrow={finalCTAContent.eyebrow}>
        {finalCTAContent.title}
      </Heading>
      <p className="section-description">{finalCTAContent.description}</p>
    </Section>
  );
}

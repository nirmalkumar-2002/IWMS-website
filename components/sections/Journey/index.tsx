import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { journeyContent } from '@/content/journey';
export default function Journey() {
  return (
    <Section id={journeyContent.id} variant="light">
      <Heading as="h2" eyebrow={journeyContent.eyebrow}>
        {journeyContent.title}
      </Heading>
      <p className="section-description">{journeyContent.description}</p>
    </Section>
  );
}

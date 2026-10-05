import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { technologiesContent } from '@/content/technologies';
export default function Technologies() {
  return (
    <Section id={technologiesContent.id} variant="light">
      <Heading as="h2" eyebrow={technologiesContent.eyebrow}>
        {technologiesContent.title}
      </Heading>
      <p className="section-description">{technologiesContent.description}</p>
    </Section>
  );
}

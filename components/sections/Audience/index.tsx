import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { audienceContent } from '@/content/audience';
export default function Audience() {
  return (
    <Section id={audienceContent.id} variant="light">
      <Heading as="h2" eyebrow={audienceContent.eyebrow}>
        {audienceContent.title}
      </Heading>
      <p className="section-description">{audienceContent.description}</p>
    </Section>
  );
}

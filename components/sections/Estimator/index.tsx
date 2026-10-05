import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { estimatorContent } from '@/content/estimator';
export default function Estimator() {
  return (
    <Section id={estimatorContent.id} variant="light">
      <Heading as="h2" eyebrow={estimatorContent.eyebrow}>
        {estimatorContent.title}
      </Heading>
      <p className="section-description">{estimatorContent.description}</p>
    </Section>
  );
}

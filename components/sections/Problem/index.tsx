import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { problemContent } from '@/content/problem';
export default function Problem() {
  return (
    <Section id={problemContent.id} variant="light">
      <Heading as="h2" eyebrow={problemContent.eyebrow}>
        {problemContent.title}
      </Heading>
      <p className="section-description">{problemContent.description}</p>
    </Section>
  );
}

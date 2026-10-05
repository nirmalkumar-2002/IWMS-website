import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { roadmapContent } from '@/content/roadmap';
export default function Roadmap() {
  return (
    <Section id={roadmapContent.id} variant="light">
      <Heading as="h2" eyebrow={roadmapContent.eyebrow}>
        {roadmapContent.title}
      </Heading>
      <p className="section-description">{roadmapContent.description}</p>
    </Section>
  );
}

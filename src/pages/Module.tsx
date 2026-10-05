import { modulesContent } from '@/content/modules';
import { sharedContent } from '@/content/shared';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import NotFound from './NotFound';
export default function ModulePage({ slug }: { slug: string }) {
  const item = modulesContent.modules.find((item) => item.slug === slug);
  if (!item) return <NotFound />;
  return (
    <Section id={slug}>
      <Heading as="h1">{item.title}</Heading>
      <p className="section-description">{item.summary}</p>
      <p className="mt-8 text-sm">{sharedContent.foundation}</p>
    </Section>
  );
}

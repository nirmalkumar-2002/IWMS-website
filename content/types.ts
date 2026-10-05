export type Source = { pages: number[]; note?: string };
export type ContentItem = {
  title: string;
  body: string;
  bullets?: string[];
  value?: string;
};
export type SectionContent = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  source: Source;
  items: ContentItem[];
  labels?: Record<string, string>;
};
export type ModuleContent = {
  slug: string;
  title: string;
  summary: string;
  source: Source;
  features: ContentItem[];
};
export type ModulesContent = SectionContent & { modules: ModuleContent[] };

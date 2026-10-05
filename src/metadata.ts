import { siteConfig } from '@/content/config';
import { modulesContent } from '@/content/modules';
import { sharedContent } from '@/content/shared';
export function getPageMetadata(path: string) {
  const route = path.replace(/\/$/, '') || '/';
  const item = modulesContent.modules.find(
    (item) => route === `/modules/${item.slug}`,
  );
  return {
    title: item
      ? `${item.title} | ${siteConfig.name}`
      : route === '/privacy'
        ? `${sharedContent.privacyTitle} | ${siteConfig.name}`
        : siteConfig.title,
    description: item?.summary ?? siteConfig.description,
    noindex:
      route.startsWith('/dev/') || route === '/privacy' || route === '/404',
  };
}

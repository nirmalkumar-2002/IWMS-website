import { siteConfig } from '@/content/config';
import { sharedContent } from '@/content/shared';
export function getPageMetadata(path: string) {
  const route = path.replace(/\/$/, '') || '/';
  return {
    title:
      route === '/privacy'
        ? `${sharedContent.privacyTitle} | ${siteConfig.name}`
        : route === '/' || route === ''
          ? siteConfig.title
          : `${sharedContent.notFoundTitle} | ${siteConfig.name}`,
    description: siteConfig.description,
    noindex: route === '/privacy' || route === '/404',
  };
}

import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { navigation } from '@/content/navigation';
import { sharedContent } from '@/content/shared';
import { siteConfig } from '@/content/config';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 1101px)');
    const onResize = () => {
      if (media.matches) dialog.current?.close();
    };
    media.addEventListener('change', onResize);
    return () => {
      document.body.style.overflow = previous;
      media.removeEventListener('change', onResize);
    };
  }, [open]);
  const close = () => dialog.current?.close();
  return (
    <header className="site-header" data-scrolled={scrolled}>
      <Container className="header-inner">
        <a
          href="/#platform"
          aria-label={sharedContent.home}
          className="brand-lockup"
        >
          <span>
            <span className="brand-logos">
              <img
                src="/brand/zigma.png"
                alt={sharedContent.zigmaAlt}
                width={126}
                height={142}
                fetchPriority="high"
              />
              <img
                src="/brand/blue-planet.png"
                alt={sharedContent.bluePlanetAlt}
                width={252}
                height={142}
                fetchPriority="high"
              />
            </span>
            <span className="brand-caption">{siteConfig.group}</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label={sharedContent.navigation}>
          {navigation.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <Button href="/#contact">{sharedContent.demo}</Button>
        </nav>
        <button
          ref={trigger}
          type="button"
          className="menu-trigger"
          aria-label={sharedContent.menuOpen}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
        >
          <Menu aria-hidden="true" strokeWidth={1.75} />
        </button>
      </Container>
      <dialog
        ref={dialog}
        id="mobile-navigation"
        className="mobile-dialog"
        aria-label={sharedContent.navigation}
        data-lenis-prevent
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <button
          type="button"
          className="menu-close"
          aria-label={sharedContent.menuClose}
          onClick={close}
        >
          <X aria-hidden="true" strokeWidth={1.75} />
        </button>
        <nav aria-label={sharedContent.navigation}>
          {navigation.map((link) => (
            <a key={link.href} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
          <Button href="/#contact" onClick={close}>
            {sharedContent.demo}
          </Button>
          <Button href={siteConfig.brochurePath} variant="secondary" download>
            {sharedContent.brochure}
          </Button>
        </nav>
      </dialog>
      <noscript>
        <nav
          className="container flex flex-wrap gap-4"
          aria-label={sharedContent.navigation}
        >
          {navigation.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </noscript>
    </header>
  );
}

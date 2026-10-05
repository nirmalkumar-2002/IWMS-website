import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { experienceContent as copy } from '@/content/experience';
import { heroContent } from '@/content/hero';
import { useScrollTimeline } from '@/lib/animations/useScrollTimeline';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { ExperienceContext } from './experienceContext';
import { CityPanorama } from './CityPanorama';
import './experience.css';

/** Home-only scene coordinator. Children keep their anchors/order and own their copy.
 * One shared, unpinned timeline controls the camera, truck and chapter transitions.
 * DOM text/navigation remain usable without JavaScript or motion enhancement.
 */
export function ScrollExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [layout, setLayout] = useState('');
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed) setLayout(`${element.offsetWidth}:${element.offsetHeight}:${window.innerHeight}`);
      }, 120);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    void document.fonts.ready.then(measure);
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let inView = true;
    const update = () => { element.dataset.visible = String(inView && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  const end = useCallback(() => `+=${Math.max(1, (root.current?.offsetHeight ?? 0) - window.innerHeight)}`, []);
  useScrollTimeline(root, (tl, element) => {
    const world = element.querySelector<SVGGElement>('[data-world-pan]');
    const distance = element.querySelector<SVGGElement>('[data-world-distance]');
    const vehicle = element.querySelector<SVGGElement>('[data-world-truck]');
    const body = vehicle?.querySelector<SVGGElement>('[data-truck-body]');
    const load = vehicle?.querySelector<SVGGElement>('[data-truck-load]');
    const wheels = vehicle?.querySelectorAll<SVGGElement>('[data-wheel]');
    const network = element.querySelector<SVGGElement>('[data-world-network]');
    const progress = element.querySelector<HTMLElement>('[data-world-progress]');
    const worker = element.querySelector<SVGGElement>('[data-world-worker]');
    const bin = element.querySelector<SVGGElement>('[data-world-bin]');
    const scan = element.querySelector<SVGPathElement>('[data-world-scan]');
    const verification = element.querySelector<HTMLElement>('[data-world-verification]');
    const mascot = element.querySelector<HTMLElement>('[data-mascot]');
    const extent = Math.max(1, element.offsetHeight - window.innerHeight);
    const rootTop = element.getBoundingClientRect().top;
    const points = copy.chapters.map((chapter, index) => {
      const section = element.querySelector<HTMLElement>(`#${chapter.id}`);
      const position = section ? section.getBoundingClientRect().top - rootTop : index * extent / (copy.chapters.length - 1);
      return Math.max(0, Math.min(1, (position - window.innerHeight * 0.16) / extent));
    });
    points[0] = 0;
    points[points.length - 1] = 1;
    const frame = { camera: 0, x: 300, load: copy.chapters[0].load, network: 0, scan: 0, tip: 0 };
    const pickupDuration = points[1] * 0.65;
    tl.to(frame, { scan: 1, duration: pickupDuration * 0.2, ease: 'power2.out' }, 0)
      .to(frame, { tip: 1, load: 0.55, duration: pickupDuration * 0.2 }, pickupDuration * 0.4)
      .to(frame, { tip: 0, duration: pickupDuration * 0.2 }, pickupDuration * 0.65)
      .to(frame, { scan: 0, duration: pickupDuration * 0.15 }, pickupDuration * 0.85);
    [1, 2, 6, 8, 14].forEach((chapterIndex) => {
      const point = points[chapterIndex];
      if (mascot && point !== undefined && point < 1)
        tl.to(mascot, { y: -3, duration: 0.025, yoyo: true, repeat: 1, ease: 'sine.inOut' }, point);
    });
    let previous = 0;
    copy.chapters.slice(1).forEach((chapter, offset) => {
      const index = offset + 1;
      const destination = Math.max(previous + 0.001, points[index]);
      const departure = index === 1 ? pickupDuration : previous;
      tl.to(frame, {
        camera: index * 900,
        x: 300 + (index % 3) * 35,
        load: chapter.load,
        network: ['dashboard', 'technologies', 'compliance', 'modules'].includes(chapter.id) ? 0.65 : 0,
        duration: destination - departure,
        ease: 'power1.inOut',
      }, departure);
      const content = element.querySelector(`#${chapter.id} > .container`);
      if (content) tl.fromTo(content, { opacity: 0.25, y: 28 }, {
        opacity: 1, y: 0, duration: Math.min(0.025, (destination - previous) * 0.6), ease: 'power2.out',
      }, Math.max(0, destination - 0.04));
      previous = destination;
    });
    let lastChapter = -1;
    const draw = () => {
      world?.setAttribute('transform', `translate(${-frame.camera} 0)`);
      distance?.setAttribute('transform', `translate(${-frame.camera * 0.12} 0)`);
      vehicle?.setAttribute('transform', `translate(${frame.x} 439)`);
      body?.setAttribute('transform', `translate(0 ${Math.sin(frame.camera / 24) * 0.7})`);
      if (load) load.style.transform = `scaleX(${frame.load})`;
      wheels?.forEach((wheel) => { wheel.style.transform = `rotate(${frame.camera * 360 / (34 * Math.PI * 350 / 240)}deg)`; });
      network?.setAttribute('opacity', String(frame.network));
      worker?.setAttribute('opacity', String(frame.scan));
      scan?.setAttribute('opacity', String(frame.scan * (1 - frame.tip) * 0.5));
      bin?.setAttribute('transform', `translate(${710 - frame.camera - frame.tip * 235} ${530 - frame.tip * 145}) rotate(${-frame.tip * 110} 35 20)`);
      if (verification) verification.style.opacity = String(frame.scan);
      const p = tl.progress();
      if (progress) progress.style.transform = `scaleX(${p})`;
      const index = points.reduce((current, point, i) => p >= point - 0.015 ? i : current, 0);
      if (index !== lastChapter) {
        lastChapter = index;
        element.dataset.chapter = copy.chapters[index].id;
        setActive(index);
      }
    };
    element.dataset.motion = 'active';
    tl.eventCallback('onUpdate', draw);
    draw();
    return () => {
      delete element.dataset.motion;
      delete element.dataset.chapter;
      if (mascot) mascot.style.removeProperty('transform');
      world?.removeAttribute('transform');
      distance?.removeAttribute('transform');
      vehicle?.setAttribute('transform', 'translate(300 439)');
      body?.removeAttribute('transform');
      if (load) load.style.transform = 'scaleX(0.25)';
      wheels?.forEach((wheel) => { wheel.style.transform = 'rotate(0deg)'; });
      network?.setAttribute('opacity', '0');
      worker?.setAttribute('opacity', '0');
      scan?.setAttribute('opacity', '0');
      bin?.setAttribute('transform', 'translate(710 530)');
      if (verification) verification.style.removeProperty('opacity');
      if (progress) progress.style.transform = 'scaleX(0)';
    };
  }, { sectionId: 'platform', enabled: Boolean(layout) && !paused, start: 'top top', end, scrub: 0.7, rebuildKey: layout });

  const chapter = copy.chapters[reduced || paused ? 0 : active];
  return (
    <ExperienceContext.Provider value>
      <div className="scroll-experience" ref={root} data-paused={paused || reduced}>
        <div className="experience-content">{children}</div>
        <aside className="experience-stage" ref={stage} aria-label={copy.title} data-visible="true">
          <div className="experience-stage-top">
            <span><i aria-hidden="true" />{copy.eyebrow}</span>
            {!reduced && <button type="button" className="experience-motion" aria-pressed={paused} onClick={() => { setPaused(!paused); setActive(0); }}>{paused ? copy.resume : copy.pause}<span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span></button>}
          </div>
          <CityPanorama />
          <div className="experience-verification" data-world-verification>
            <span aria-hidden="true">✓</span>
            <div><strong>{heroContent.labels.verified}</strong><p>{heroContent.labels.weight} · {heroContent.labels.gps}</p></div>
          </div>
          <div className="experience-record">
            <span className="experience-record-number" aria-hidden="true">{String(copy.chapters.indexOf(chapter) + 1).padStart(2, '0')}</span>
            <div><span className="experience-record-label">{chapter.label}</span><h2>{chapter.title}</h2><p>{chapter.description}</p></div>
          </div>
          <nav className="experience-chapters" aria-label={copy.navigation}>
            {copy.chapters.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-label={`${copy.chapter} ${index + 1}: ${item.label}`} aria-current={chapter.id === item.id ? 'step' : undefined}><span aria-hidden="true" /><span className="experience-chapter-tooltip">{item.label}</span></a>)}
          </nav>
          <div className="experience-stage-bottom"><span>{copy.illustration}</span><span>{copy.scroll}<span aria-hidden="true">↓</span></span></div>
          <div className="experience-progress" aria-hidden="true"><span data-world-progress /></div>
          <p className="sr-only">{copy.description}</p>
        </aside>
      </div>
    </ExperienceContext.Provider>
  );
}

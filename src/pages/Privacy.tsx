import { sharedContent } from '@/content/shared';
export default function Privacy() {
  return (
    <section className="page">
      <h1>{sharedContent.privacyTitle}</h1>
      <p>{sharedContent.privacyPending}</p>
      <a href="/">{sharedContent.back}</a>
    </section>
  );
}

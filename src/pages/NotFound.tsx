import { sharedContent } from '@/content/shared';
export default function NotFound() {
  return (
    <section className="page">
      <h1>{sharedContent.notFoundTitle}</h1>
      <p>{sharedContent.notFoundBody}</p>
      <a href="/">{sharedContent.back}</a>
    </section>
  );
}

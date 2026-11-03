import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '../ui';

/** Module routes outside this build (placeholder convention, shared-workflows.md § 7). */
export default function NotBuilt({ name }: { name: string }) {
  const nav = useNavigate();
  return (
    <div className="sub sub--fill">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: name }]} title={name} />
      <section className="lf-card tablecard notbuilt">
        <EmptyState icon="layers" title={`${name} isn't part of this prototype yet.`}
          message="This build covers sign-in, Home and Settings. Every other module keeps its place in the navigation."
          action={<Button variant="primary" icon="settings" onClick={() => nav('/settings')}>Open settings</Button>} />
      </section>
    </div>
  );
}

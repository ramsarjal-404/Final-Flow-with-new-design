import type { ComponentType } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { sourceById } from './store';
import type { IdfSource } from './store';
import { ProfileList, SourcePicker } from './ProfileList';
import { TemplateEditor, TemplatesPage } from './Templates';
import { TagEditor, TagsPage } from './Tags';
import { PatternEditor, PatternsPage } from './Patterns';
import { AgentsPage } from './Agents';
import { ServersPage } from './Servers';
import './styles.css';

/* Identify Settings (MOD-SDS SCR-SDS-11 … SCR-SDS-20). Unknown sources or sub-paths redirect
   (replace) to the category root. */

const HOME = '/settings/identify';

function WithSource({ Page }: { Page: ComponentType<{ source: IdfSource }> }) {
  const { source, id } = useParams();
  const s = sourceById(source);
  if (!s) return <Navigate replace to={HOME} />;
  return <Page key={s.id + (id ?? '')} source={s} />;
}

export default function IdentifySettings() {
  return (
    <Routes>
      <Route index element={<SourcePicker />} />
      <Route path=":source" element={<WithSource Page={ProfileList} />} />
      <Route path=":source/templates" element={<WithSource Page={TemplatesPage} />} />
      <Route path=":source/templates/:id" element={<WithSource Page={TemplateEditor} />} />
      <Route path=":source/tags" element={<WithSource Page={TagsPage} />} />
      <Route path=":source/tags/:id" element={<WithSource Page={TagEditor} />} />
      <Route path=":source/patterns" element={<WithSource Page={PatternsPage} />} />
      <Route path=":source/patterns/:id" element={<WithSource Page={PatternEditor} />} />
      <Route path=":source/agents" element={<WithSource Page={AgentsPage} />} />
      <Route path=":source/servers" element={<WithSource Page={ServersPage} />} />
      <Route path="*" element={<Navigate replace to={HOME} />} />
    </Routes>
  );
}

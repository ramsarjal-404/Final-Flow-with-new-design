import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Picker } from './Picker';
import { SourcePage } from './SourcePage';
import { sourceById } from './store';
import './styles.css';

/* Trust Settings (MOD-SDS SCR-SDS-09, SCR-SDS-10 and DLG-SDS-37 … 51).
   /settings/trust → picker; /settings/trust/:sourceId → source page for a known source whose kind
   is not "none"; anything else redirects (replace) to the category root. */

const HOME = '/settings/trust';

function SourceRoute() {
  const { sourceId } = useParams();
  const s = sourceById(sourceId);
  if (!s || s.kind === 'none') return <Navigate replace to={HOME} />;
  return <SourcePage key={s.id} source={s} />;
}

export default function TrustSettings() {
  return (
    <Routes>
      <Route index element={<Picker />} />
      <Route path=":sourceId" element={<SourceRoute />} />
      <Route path="*" element={<Navigate replace to={HOME} />} />
    </Routes>
  );
}

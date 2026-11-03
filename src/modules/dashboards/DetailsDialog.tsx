import { useEffect, useState } from 'react';
import { Button, Modal, TextAreaField, TextField } from '../../ui';

/* DLG-DSH-01 · Dashboard details dialog ("Create dashboard" / "Edit Dashboard"). */
export function DetailsDialog({ open, mode, initial, taken, onClose, onConfirm }: {
  open: boolean; mode: 'create' | 'edit'; initial: { name: string; description: string }; taken: string[];
  onClose: () => void; onConfirm: (v: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tried, setTried] = useState(false);
  // Reset rule: every opening re-seeds the fields and clears "tried".
  useEffect(() => { if (open) { setName(initial.name); setDescription(initial.description); setTried(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = name.trim();
  const message = !trimmed ? 'Dashboard name is required.'
    : taken.some((t) => t.trim().toLowerCase() === trimmed.toLowerCase()) ? 'A dashboard with this name already exists.' : null;
  const confirm = () => {
    setTried(true);
    if (message) return;
    onConfirm({ name: trimmed, description: description.trim() });
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={mode === 'create' ? 'plus' : 'edit'}
      title={mode === 'create' ? 'Create dashboard' : 'Edit Dashboard'}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={confirm}>{mode === 'create' ? 'Next' : 'Save'}</Button>
      </>}>
      <TextField label="Dashboard Name:" placeholder="Type here dashboard name" required value={name} onChange={setName}
        error={tried ? message : null} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } }} />
      <TextAreaField label="Description:" placeholder="Description" value={description} onChange={setDescription} />
    </Modal>
  );
}

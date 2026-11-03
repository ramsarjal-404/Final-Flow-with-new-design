import type { ReactNode } from 'react';
import { Icon, Modal, type IconName } from '../../../../ui';
import './shared.css';

/**
 * A small dialog "without a title" (DLG-SAD-32, DLG-SAD-40): the accessible name is `label`,
 * the body shows a badge, an optional heading and the text.
 */
export function UntitledDialog({ open, onClose, label, icon = 'info', tone, heading, children, footer }: {
  open: boolean; onClose: () => void; label: string; icon?: IconName; tone?: 'warn'; heading?: ReactNode; children?: ReactNode; footer: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={label} icon={null} size="xs" footer={footer}>
      <div className="configure-notifications-untitled">
        <span className={'configure-notifications-badge' + (tone === 'warn' ? ' configure-notifications-badge--warn' : '')} aria-hidden="true"><Icon name={icon} /></span>
        {heading && <h4>{heading}</h4>}
        {children}
      </div>
    </Modal>
  );
}

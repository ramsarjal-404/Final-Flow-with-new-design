import { Icon } from '../../../ui';

/** "{n} word" when n = 1, else "{n} word(s)" (the module's toast rule). */
export const plural = (n: number, word: string) => (n === 1 ? `${n} ${word}` : `${n} ${word}(s)`);
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
export const QUARTERS = ['00', '15', '30', '45'];

/** Soft pill search that can be disabled (the kit's SearchField has no disabled state). Lepide Design System classes only. */
export function SoftSearch({ value, onChange, ariaLabel, disabled, placeholder = 'Search' }: {
  value: string; onChange: (v: string) => void; ariaLabel: string; disabled?: boolean; placeholder?: string;
}) {
  return (
    <label className={'lf-field backup-restore-search' + (disabled ? ' is-disabled' : '')}>
      <span className="lf-input lf-input--pill">
        <Icon name="search" />
        <input type="search" value={value} maxLength={200} placeholder={placeholder} aria-label={ariaLabel} disabled={disabled}
          onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

/** Digits only, at most `max` characters (NumberField helper). */
export const digits = (v: number | '', max = 4): boolean => v === '' || (Number.isInteger(v) && v >= 0 && String(v).length <= max);

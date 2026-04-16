import { useState, useEffect, useRef } from 'react';
import { t } from '../../i18n';
import './FloatingActions.css';

interface FloatingActionsProps {
  onExport: () => void;
  onSave: () => void;
  onImport: () => void;
  onToggleSettings: () => void;
  onStoryMode?: () => void;
}

export default function FloatingActions({ onExport, onSave, onImport, onToggleSettings, onStoryMode }: FloatingActionsProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const doAction = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="floating-actions" ref={wrapRef}>
      <button
        className={`floating-actions__toggle${open ? ' floating-actions__toggle--active' : ''}`}
        onClick={() => setOpen(!open)}
        title={t('floating.more')}
      >
        ☰
      </button>
      {open && (
        <div className="floating-actions__menu">
          <button className="floating-actions__item" onClick={() => doAction(onExport)}>{t('app.export')}</button>
          <button className="floating-actions__item" onClick={() => doAction(onSave)}>{t('app.save')}</button>
          <button className="floating-actions__item" onClick={() => doAction(onImport)}>{t('app.import')}</button>
          {onStoryMode && (
            <button className="floating-actions__item" onClick={() => doAction(onStoryMode)}>{t('app.storyMode')}</button>
          )}
          <button className="floating-actions__item" onClick={() => doAction(onToggleSettings)}>⚙️ {t('settings.title')}</button>
        </div>
      )}
    </div>
  );
}

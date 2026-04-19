import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { t } from '../../i18n';
import pkg from '../../../package.json';
import './UpdatePrompt.css';

// Toast auto-collapses into a small dot after this delay so editing isn't disrupted.
const COLLAPSE_AFTER_MS = 10_000;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.error('SW registration error:', err);
    },
  });

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!needRefresh) return;
    setCollapsed(false);
    const timer = setTimeout(() => setCollapsed(true), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [needRefresh]);

  if (!needRefresh) return null;

  if (collapsed) {
    return (
      <button
        className="update-prompt__badge"
        onClick={() => setCollapsed(false)}
        title={t('update.available')}
      >
        ✨
      </button>
    );
  }

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <div className="update-prompt__text">
        <span className="update-prompt__title">{t('update.available')}</span>
        <span className="update-prompt__version">v{pkg.version}</span>
      </div>
      <div className="update-prompt__actions">
        <button
          className="update-prompt__btn update-prompt__btn--primary"
          onClick={() => updateServiceWorker(true)}
        >
          {t('update.now')}
        </button>
        <button
          className="update-prompt__btn"
          onClick={() => { setNeedRefresh(false); setCollapsed(false); }}
        >
          {t('update.later')}
        </button>
      </div>
    </div>
  );
}

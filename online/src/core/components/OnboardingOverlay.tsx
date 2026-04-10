import { useState } from 'react';
import { t } from '../../i18n';
import type zhTW from '../../i18n/zh-TW';
import { getSampleProjectJSON } from '../utils/sampleProject';
import { useProjectStore } from '../store/useProjectStore';
import './OnboardingOverlay.css';

type MessageKey = keyof typeof zhTW;

const STORAGE_KEY = 'trailpaint-onboarded';

function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

interface Step {
  emoji: string;
  titleKey: MessageKey;
  descKey: MessageKey;
  hintKey: MessageKey;
  showSample?: boolean;
}

const STEPS: Step[] = [
  {
    emoji: '🗺️',
    titleKey: 'onboarding.step1.title',
    descKey: 'onboarding.step1.desc',
    hintKey: 'onboarding.step1.hint',
  },
  {
    emoji: '📍',
    titleKey: 'onboarding.step2.title',
    descKey: 'onboarding.step2.desc',
    hintKey: 'onboarding.step2.hint',
  },
  {
    emoji: '📷',
    titleKey: 'onboarding.step3.title',
    descKey: 'onboarding.step3.desc',
    hintKey: 'onboarding.step3.hint',
    showSample: true,
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => !hasOnboarded());
  const [step, setStep] = useState(0);
  const importJSON = useProjectStore((s) => s.importJSON);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function dismiss() {
    markOnboarded();
    setVisible(false);
  }

  function handleNext() {
    if (isLast) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleLoadSample() {
    const json = await getSampleProjectJSON();
    if (json) importJSON(json);
    dismiss();
  }

  return (
    <div className="onboarding-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="onboarding-card">
        {/* Step content */}
        <div className="onboarding-content">
          <div className="onboarding-emoji">{current.emoji}</div>
          <h2 className="onboarding-title">{t(current.titleKey)}</h2>
          <p className="onboarding-desc">{t(current.descKey)}</p>
          <div className="onboarding-hint">{t(current.hintKey)}</div>
          {current.showSample && (
            <button className="onboarding-sample-btn" onClick={handleLoadSample}>
              {t('onboarding.loadSample')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          {/* Step dots */}
          <div className="onboarding-dots">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`onboarding-dot${i === step ? ' onboarding-dot--active' : ''}`}
              />
            ))}
          </div>

          {/* Next / Start button */}
          <button className="onboarding-next-btn" onClick={handleNext}>
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </button>

          {/* Skip */}
          <button className="onboarding-skip" onClick={dismiss}>
            {t('onboarding.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}

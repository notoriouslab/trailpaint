import { useProjectStore } from '../store/useProjectStore';
import { t } from '../../i18n';

export default function SettingsPanel() {
  const { 
    playMode, setPlayMode, 
    playInterval, setPlayInterval, 
    playLoop, setPlayLoop 
  } = useProjectStore();

  return (
    <div className="settings-panel">
      {/* Quick guide */}
      <div className="settings-panel__title">{t('info.guide')}</div>
      <div className="settings-panel__guide">
        <p>📍 {t('info.step1')}</p>
        <p>🖊️ {t('info.step2')}</p>
        <p>📷 {t('info.step3')}</p>
      </div>

      {/* Playback Settings */}
      <div className="settings-panel__title">{t('playback.title')}</div>
      <div className="settings-panel__playback">
        <div className="settings-panel__row">
          <label>{t('playback.mode')}</label>
          <select 
            className="settings-panel__select"
            value={playMode}
            onChange={(e) => setPlayMode(e.target.value as 'auto' | 'manual')}
          >
            <option value="auto">{t('playback.mode.auto')}</option>
            <option value="manual">{t('playback.mode.manual')}</option>
          </select>
        </div>
        
        {playMode === 'auto' && (
          <div className="settings-panel__row">
            <label>{t('playback.interval')}</label>
            <div className="settings-panel__input-group">
              <input 
                type="number" 
                min="0.5" 
                step="0.5"
                max="60"
                value={playInterval / 1000}
                onChange={(e) => setPlayInterval(Number(e.target.value) * 1000)}
              />
            </div>
          </div>
        )}

        <label className="settings-panel__toggle">
          <input 
            type="checkbox" 
            checked={playLoop}
            onChange={(e) => setPlayLoop(e.target.checked)}
          />
          {t('playback.loop')}
        </label>
      </div>

      {/* Services */}
      <div className="settings-panel__title">{t('info.services')}</div>
      <div className="settings-panel__services">
        <p><a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> — {t('info.svc.leaflet')}</p>
        <p><a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> — {t('info.svc.osm')}</p>
        <p><a href="https://carto.com" target="_blank" rel="noopener noreferrer">CARTO</a> — {t('info.svc.carto')}</p>
        <p><a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer">Nominatim</a> — {t('info.svc.nominatim')}</p>
        <p><a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a> — {t('info.svc.openmeteo')}</p>
      </div>

      {/* About */}
      <div className="settings-panel__title">{t('info.about')}</div>
      <div className="settings-panel__about">
        <p>🌿 TrailPaint {t('info.tagline')}</p>
        <p>
          <a href="https://github.com/notoriouslab/trailpaint" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          {' · '}
          © {new Date().getFullYear()} notoriouslab
        </p>
      </div>
    </div>
  );
}

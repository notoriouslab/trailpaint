import { t } from '../../i18n';

export default function SettingsPanel() {
  return (
    <div className="settings-panel">
      {/* Quick guide */}
      <div className="settings-panel__title">{t('info.guide')}</div>
      <div className="settings-panel__guide">
        <p>📍 {t('info.step1')}</p>
        <p>🖊️ {t('info.step2')}</p>
        <p>📷 {t('info.step3')}</p>
      </div>

      {/* Services */}
      <div className="settings-panel__title">{t('info.services')}</div>
      <div className="settings-panel__services">
        <p><a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> — {t('info.svc.leaflet')}</p>
        <p><a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> — {t('info.svc.osm')}</p>
        <p><a href="https://carto.com" target="_blank" rel="noopener noreferrer">CARTO</a> — {t('info.svc.carto')}</p>
        <p><a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon</a> / <a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer">Nominatim</a> — {t('info.svc.geocoder')}</p>
        <p><a href="https://gis.sinica.edu.tw/ccts/" target="_blank" rel="noopener noreferrer">中研院 CCTS</a> — {t('info.svc.ccts')}</p>
        <p><a href="https://dh.gu.se/dare/" target="_blank" rel="noopener noreferrer">DARE</a> — {t('info.svc.dare')}</p>
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

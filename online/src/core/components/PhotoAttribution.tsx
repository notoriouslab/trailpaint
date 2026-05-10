import type { PhotoMeta } from '../models/types';
import { t } from '../../i18n';
import './PhotoAttribution.css';

/** 照片右下角小字授權標示：photoMeta 存在才 render（D10 規則，既有 stories 用
 *  `📷 作者, 授權` 內嵌 spot.desc 的慣例不受影響）。 */
export function PhotoAttribution({ meta }: { meta: PhotoMeta | undefined }) {
  if (!meta) return null;
  return (
    <div className="photo-attribution">
      {t('player.photo.prefix')}:{' '}
      {meta.authorUrl ? (
        <a href={meta.authorUrl} target="_blank" rel="noopener noreferrer">{meta.author}</a>
      ) : meta.author}
      , {meta.license} —{' '}
      <a href={meta.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
    </div>
  );
}

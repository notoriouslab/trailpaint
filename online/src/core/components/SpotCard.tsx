import type { Spot } from '../models/types';
import { PhotoAttribution } from './PhotoAttribution';

interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onSelect: () => void;
}

export default function SpotCard({ spot, selected, onSelect }: SpotCardProps) {
  return (
    <div
      className={`spot-card${selected ? ' spot-card--selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Title tag */}
      <div className="spot-card__title-tag">
        <span className="spot-card__hole" />
        <span className="spot-card__title">{spot.title}</span>
      </div>

      {/* Photo */}
      {spot.photo && (
        <div className="spot-card__photo-wrap">
          <img src={spot.photo} alt={spot.title} className="spot-card__photo" />
          <PhotoAttribution meta={spot.photoMeta} />
        </div>
      )}

      {/* Description */}
      {spot.desc && (
        <div className="spot-card__desc">{spot.desc}</div>
      )}

      {/* Number badge */}
      <div className="spot-card__badge">{spot.num}</div>
    </div>
  );
}

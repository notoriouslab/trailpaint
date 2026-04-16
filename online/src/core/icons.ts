export interface IconDef {
  id: string;
  emoji: string;
  label: string;
}

export const ICONS: IconDef[] = [
  // 生態
  { id: 'leaf',     emoji: '🌿', label: '植物' },
  { id: 'flower',   emoji: '🌸', label: '花卉' },
  { id: 'tree',     emoji: '🌲', label: '樹木' },
  { id: 'bird',     emoji: '🐦', label: '鳥類' },
  { id: 'bug',      emoji: '🦋', label: '昆蟲' },
  { id: 'water',    emoji: '💧', label: '水域' },
  { id: 'fish',     emoji: '🐟', label: '魚類' },
  { id: 'mushroom', emoji: '🍄', label: '菌類' },
  { id: 'rock',     emoji: '⛰️', label: '岩石' },
  // 設施
  { id: 'toilet',   emoji: '🚻', label: '廁所' },
  { id: 'bus',      emoji: '🚌', label: '站牌' },
  { id: 'rest',     emoji: '🛋️', label: '休憩' },
  { id: 'camp',     emoji: '⛺', label: '露營' },
  { id: 'food',     emoji: '🥤', label: '餐廳' },
  { id: 'beer',     emoji: '🍺', label: '酒吧' },
  { id: 'hotspring', emoji: '♨️', label: '溫泉' },
  { id: 'mall',     emoji: '🏢', label: '商城' },
  { id: 'cinema',   emoji: '🎬', label: '電影院' },
  { id: 'bike',     emoji: '🚲', label: '腳踏車' },
  { id: 'parking',  emoji: '🅿️', label: '停車' },
  { id: 'firstaid', emoji: '🩺', label: '急救' },
  { id: 'beach',    emoji: '🏖️', label: '海邊' },
  { id: 'amusement', emoji: '🎠', label: '遊樂' },
  // 登山
  { id: 'trigo',    emoji: '△',  label: '三角點' },
  { id: 'trailhead', emoji: '🚩', label: '集合點' },
  // 通用
  { id: 'sun',      emoji: '🔍', label: '觀景' },
  { id: 'stargazing', emoji: '🔭', label: '星空' },
  { id: 'camera',   emoji: '📷', label: '拍照' },
  { id: 'warning',  emoji: '⚠️', label: '注意' },
  { id: 'info',     emoji: 'ℹ️', label: '說明' },
  { id: 'pin',      emoji: '📍', label: '標記' },
];

export function getIcon(id: string, customEmoji?: string): IconDef {
  if (id === 'custom' && customEmoji) {
    return { id: 'custom', emoji: customEmoji, label: '自訂' };
  }
  return ICONS.find(i => i.id === id) ?? ICONS.find(i => i.id === 'pin') ?? ICONS[0];
}

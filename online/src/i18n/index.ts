import zhTW from './zh-TW';
import en from './en';
import ja from './ja';

type MessageKeys = keyof typeof zhTW;
type Messages = Record<MessageKeys, string>;

const localeMap: Record<string, Messages> = {
  'zh-TW': zhTW,
  'zh': zhTW,
  'en': en,
  'ja': ja,
};

function detectLocale(): string {
  // 1. URL param override: ?lang=ja
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && localeMap[urlLang]) return urlLang;

  // 2. Build-time env
  const envLocale = import.meta.env.VITE_LOCALE as string;
  if (envLocale && localeMap[envLocale]) return envLocale;

  // 3. Browser language
  const browserLang = navigator.language;
  if (localeMap[browserLang]) return browserLang;
  const short = browserLang.split('-')[0];
  if (localeMap[short]) return short;

  return 'zh-TW';
}

const locale = detectLocale();
const messages: Messages = localeMap[locale] ?? zhTW;

/** The resolved locale (e.g. 'zh-TW', 'en', 'ja'). Stable for the app lifetime. */
export const currentLocale = locale;

export function t(key: MessageKeys): string {
  return messages[key] ?? key;
}

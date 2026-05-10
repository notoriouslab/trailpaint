#!/usr/bin/env node
/** Phase 15: stories/cook/ 庫克船長太平洋三航 1768-1779, 7 spots, no overlay. */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'cook');
const TMP = '/tmp/tp-cook';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT = {
  id: 'voyages', name: '太平洋三航',
  subtitle: 'AD 1768 — 1779 從 Plymouth 到 Kealakekua',
  description: 'James Cook 約克郡農夫之子，皇家海軍升至上尉後率 HMS Endeavour 三度環行太平洋：1768-71 觀金星凌日 + 紐澳測繪、1772-75 首船過南極圈、1776-79 西北通道尋找。Cook 是現代精確航海的開創者（用 chronometer 測經度、強制食酸菜防壞血病）— 後死於夏威夷 Kealakekua 灣與原住民衝突。',
  color: '#7c2d12', center: [-15, 175], zoom: 2,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: 'Plymouth（1768 第一航出發）', latlng: [50.3755, -4.1427],
      historical_refs: ['Cook《Endeavour Journal》(1768-71)，Beaglehole 1955 編輯'],
      desc: `1768 年 8 月 26 日 Cook 39 歲率 HMS Endeavour 從 Plymouth 出航 — 表面任務是抵 Tahiti 觀測 1769 年 6 月 3 日金星凌日（皇家學會 + 海軍部聯合科學項目），暗中持密令尋找「Terra Australis Incognita」(未知南方大陸)。船員 94 人含博物學家 Joseph Banks（後皇家學會主席 41 年）+ 畫家 Sydney Parkinson + 瑞典植物學家 Daniel Solander。Cook 強制每日食 sauerkraut（德式酸菜，含維他命 C）防壞血病 — 整個三年航程僅 1 人因壞血病死，前所未見。

學者引用：J. C. Beaglehole《The Life of Captain James Cook》(Stanford UP, 1974) 終極傳記章 5；Richard Hough《Captain James Cook》(Hodder, 1994)。`,
      photo_query: 'Plymouth UK harbour|普利茅斯港',
    },
    {
      title: 'Tahiti（1769 金星凌日）', latlng: [-17.6797, -149.4068],
      historical_refs: ['Cook 1769-06-03 entry; Banks《Endeavour Journal》'],
      desc: `1769 年 4 月 13 日抵 Tahiti，建立「Fort Venus」(金星堡壘)。6 月 3 日 Cook、Green、Solander 三隊分組同步觀測金星凌日（測太陽系尺度的 18 世紀關鍵實驗）— 但因「黑滴效應」(black drop) 視覺現象使精確測量受限。Banks 詳細記載 Tahitian 文化、tattoo 詞源（tatau 即源自 Tahitian）、breadfruit 引入西方視野。離開時帶上 Tahitian 祭司 Tupaia — 他繪製含 74 個太平洋島嶼的航海圖（最早 Polynesian 航海地理一手資料），對後續紐西蘭抵達極關鍵。

學者引用：Beaglehole 同上書章 7；Anne Salmond《The Trial of the Cannibal Dog》(Yale UP, 2003) 詳論 Tupaia 角色。`,
      photo_query: 'Tahiti Matavai Bay Polynesia|大溪地 Matavai 灣',
    },
    {
      title: 'New Zealand（1769-70 環島測繪）', latlng: [-41.2865, 174.7762],
      historical_refs: ['Cook 1769-10-08 first landing; 1770-03-31 departure'],
      desc: `1769 年 10 月 6 日抵紐西蘭東岸 Poverty Bay（今 Gisborne）— 1642 Tasman 後第二位歐洲人抵達。後 6 個月環繞紐西蘭兩島測繪 3,860 公里海岸線，誤差 < 5 公里 — Cook 製圖學里程碑。1769 年 10 月 9 日首遇 Māori 的衝突誤傷致死 9 人。Tupaia 翻譯（Tahitian 與 Māori 語言相近）使後續接觸較和平。「Endeavour Strait」(庫克海峽) 確認南北兩島不相連 — 否定 Tasman 推測的「Staten Land 大陸」。

學者引用：Beaglehole 同上書章 8；Salmond 同上書詳論 Cook 與 Māori 第一次接觸；Vincent O\'Malley《The New Zealand Wars》(Bridget Williams, 2019) 整理當代 Māori 視角重審 Cook 抵達意義。`,
      photo_query: 'Poverty Bay Gisborne New Zealand|Poverty Bay 紐西蘭',
    },
    {
      title: 'Botany Bay（1770 澳洲東岸）', latlng: [-33.9926, 151.2295],
      historical_refs: ['Cook 1770-04-29 entry'],
      desc: `1770 年 4 月 29 日 Cook 在 Botany Bay 首登澳洲東岸 — 命名因 Banks 與 Solander 在此採集大量新物種植物。Cook 沿東岸北上測繪 3,000 公里至 Cape York，於 Possession Island 1770-08-22 宣告整個東岸為英王屬地，命名「New South Wales」。但與 Eora 原住民幾無正式接觸（多次被警告性投擲長矛驅離）。Cook 寫「他們生活簡單但快樂；對歐洲衣物毫無興趣；不窺探我們的科學儀器；安於現狀」— 1788 年第一艦隊在此 Sydney Cove 建殖民地。

爭議：「terra nullius」(無主之地) 法律虛構 — Cook 1770 主張 vs 原住民既有 50,000 年文明；1992 Mabo case 澳洲高院推翻 terra nullius 確立原住民地權。Cook Day 紀念在當代澳洲含義轉為複雜。

學者引用：Beaglehole 同上書章 9；Henry Reynolds《The Other Side of the Frontier》(UNSW Press, 1981) 經典原住民視角史學；Mark McKenna《Looking for Blackfellas\' Point》(UNSW Press, 2002)。`,
      photo_query: 'Botany Bay Captain Cook landing place|Botany Bay 庫克登陸點',
    },
    {
      title: 'Antarctic Circle（1773 南極圈首航）', latlng: [-66.5, 0],
      historical_refs: ['Cook《Resolution Journal》1773-01-17 entry'],
      desc: `1772-1775 第二航 HMS Resolution + Adventure。1773 年 1 月 17 日 Cook 駕 Resolution 首船穿越南極圈 — 「我們已抵達 71° 10\' S 緯度，比任何人去過的更南」(1774-01-30 entry)。三度進出南極圈，繞南極大陸近一周，徹底否定「Terra Australis 富庶南方大陸」傳說 — Cook 結論「即便存在，也是無人可居的冰封荒地」。同航附帶發現 South Georgia + South Sandwich Islands。本航全程 1,100 天無一人壞血病死亡 — Cook 獲皇家學會 Copley 獎章。

學者引用：Beaglehole 同上書章 12；Glyn Williams《The Death of Captain Cook》(Profile, 2008) 章 2 整理第二航科學意義。`,
      photo_query: 'Antarctica icebergs Southern Ocean|南極冰山南大洋',
    },
    {
      title: 'Hawaii（1778 首位歐人抵達）', latlng: [19.6398, -155.9968],
      historical_refs: ['Cook《Resolution Journal》1778-01-18 entry'],
      desc: `1776-1779 第三航尋「西北通道」(連接大西洋與太平洋的北冰洋海路)。1778 年 1 月 18 日 Cook 抵 Kauai 島成為首位記載抵 Hawaii 群島的歐洲人，命名為「Sandwich Islands」紀念第四代 Sandwich 伯爵（海軍部長）。Cook 1778 年北上至 Bering Strait 測繪阿拉斯加海岸，遭冰阻折返。冬季回 Hawaii 大島 Kealakekua 灣 — 適逢 Hawaiian 歲時祭 Makahiki，Cook 被島民誤認為神 Lono 化身（部分學者爭議此說，見 Marshall Sahlins vs Gananath Obeyesekere 1990s 學術論戰）。

學者引用：Beaglehole 同上書章 17；Marshall Sahlins《How "Natives" Think: About Captain Cook, For Example》(U of Chicago, 1995) vs Gananath Obeyesekere《The Apotheosis of Captain Cook》(Princeton UP, 1992)。`,
      photo_query: 'Kauai Hawaii Waimea bay|考愛島夏威夷',
    },
    {
      title: 'Kealakekua Bay（1779 Cook 戰死）', latlng: [19.4761, -155.9264],
      historical_refs: ['William Bligh《Notes on Cook\'s Death》(1779-02-14)'],
      desc: `1779 年 2 月 4 日 Cook 離 Kealakekua Bay 北上續尋西北通道；6 日後 Resolution 船桅損壞被迫返航 — 此次返回適逢 Makahiki 祭結束、Cook 不再被視為 Lono 神。2 月 14 日早晨小艇被島民偷走，Cook 帶 9 名陸戰隊登陸打算挾持酋長 Kalaniʻōpuʻu 換船。海灘衝突中 Cook 被棍棒擊倒、長刀刺死 — 屍體被島民按 Hawaiian 王族禮節分割（部分骨頭視為神聖物保留 + 心臟祭禮）。船員後取回部分遺骨海葬於 Kealakekua 灣。今 Cook Monument（白色方尖碑）立於海灘，技術上仍是英國領土（1877 夏威夷王室贈地）。

爭議：Cook 死亡原因 — 傳統英國敘事「英雄遇害」vs 1990s 後 Hawaiian 視角「侵略者被本地慣例正當處決」（Cook 違反 kapu 神聖禁忌進入聖區）。

學者引用：Beaglehole 同上書終章；Williams 同上書章 5-6；Sahlins 同上書整理 Hawaiian 視角；Tony Horwitz《Blue Latitudes》(Henry Holt, 2002) 通俗讀本含現代造訪 Cook 三航地點。`,
      photo_query: 'Kealakekua Bay Captain Cook Monument|Kealakekua 灣庫克紀念碑',
    },
  ],
};

const COVER_HTML_SPEC = { title: '庫克船長太平洋', subtitle: '從 Plymouth 到 Kealakekua', badge: 'AD 1768 — 1779' };

async function searchCommonsTopHit(query) {
  const [zh, en] = query.split('|');
  for (const q of [zh, en].filter(Boolean)) {
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '1', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '600' }).toString();
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    const j = await r.json();
    const pages = j.query?.pages;
    if (!pages) continue;
    const page = Object.values(pages)[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    const meta = ii.extmetadata || {};
    return { query: q, file: page.title.replace(/^File:/, ''), thumbUrl: ii.thumburl, sourceUrl: ii.descriptionurl, license: meta.LicenseShortName?.value || 'Unknown', artistHtml: meta.Artist?.value || '' };
  }
  return null;
}
async function fetchAsBase64(url) { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`fetch ${r.status}`); return `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`; }
function decodeEntities(s) { return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' '); }
function stripHtml(s) { return decodeEntities(s.replace(/<[^>]*>/g, '')).trim(); }
function extractFirstHref(html) { const m = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i); if (!m) return null; let href = m[1]; if (href.startsWith('//')) return `https:${href}`; if (href.startsWith('/')) return `https://commons.wikimedia.org${href}`; if (!/^https?:\/\//i.test(href)) return null; try { const host = new URL(href).hostname; if (/(^|\.)(wikimedia|wikipedia)\.org$/.test(host)) return href; return null; } catch { return null; } }
function buildPhotoMeta(hit) { return { source: 'wikimedia-commons', license: hit.license, author: stripHtml(hit.artistHtml) || 'Unknown', authorUrl: extractFirstHref(hit.artistHtml), sourceUrl: hit.sourceUrl }; }
function makeCoverHtml(spec, w, h) { const ts = Math.round(h * 0.11), ss = Math.round(h * 0.045), bs = Math.round(h * 0.035), ls = Math.round(h * 0.18); const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}body{width:${w}px;height:${h}px;background:radial-gradient(circle at 30% 35%,#2a1408 0%,#1c0a00 60%,#0e0500 100%);color:#fde68a;font-family:'Cormorant Garamond','Noto Serif TC',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px),repeating-linear-gradient(0deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px);pointer-events:none}body::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(h*0.3)}px rgba(0,0,0,0.7);pointer-events:none}.l{font-size:${ls}px;line-height:1;margin-bottom:${Math.round(h*0.025)}px}.t{font-size:${ts}px;font-weight:600;color:#fde68a;letter-spacing:0.03em;margin:0;line-height:1.1}.s{font-size:${ss}px;color:#d4a574;margin:${Math.round(h*0.02)}px 0 0;font-style:italic}.b{margin-top:${Math.round(h*0.04)}px;padding:${Math.round(h*0.012)}px ${Math.round(h*0.03)}px;border:1px solid #78350f;border-radius:999px;background:rgba(120,53,15,0.25);color:#fde68a;font-size:${bs}px;letter-spacing:0.15em}.w{position:absolute;bottom:${Math.round(h*0.03)}px;right:${Math.round(w*0.025)}px;font-size:${Math.round(h*0.022)}px;color:rgba(212,165,116,0.55);letter-spacing:0.18em;font-family:sans-serif}</style></head><body><div class="l">🌿</div><h1 class="t">${esc(spec.title)}</h1><div class="s">${esc(spec.subtitle)}</div><div class="b">${esc(spec.badge)}</div><div class="w">TRAILPAINT 路小繪</div></body></html>`; }
function runChrome(args) { return new Promise((res, rej) => { const p = spawn(CHROME, args, { stdio: 'pipe' }); p.on('close', (c) => c === 0 ? res() : rej(new Error(`chrome ${c}`))); }); }
function runSips(args) { return new Promise((res, rej) => { const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', (c) => c === 0 ? res() : rej(new Error(`sips ${c}`))); }); }

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });
const credits = [], failed = [];
console.log(`Building stories/cook/ — 1 segment / ${SEGMENT.spots.length} spots`);
const projSpots = [];
for (let i = 0; i < SEGMENT.spots.length; i++) {
  const s = SEGMENT.spots[i], num = i + 1;
  process.stdout.write(`  ${num}. ${s.title}... `);
  const hit = await searchCommonsTopHit(s.photo_query);
  const baseSpot = { id: `s${num}`, num, latlng: s.latlng, title: s.title, desc: s.desc, photo: null, iconId: 'pin', cardOffset: { x: 0, y: -60 }, historical_refs: s.historical_refs };
  if (!hit) { process.stdout.write('NO HIT\n'); failed.push({ num, title: s.title, query: s.photo_query }); projSpots.push(baseSpot); continue; }
  let p = null; try { p = await fetchAsBase64(hit.thumbUrl); } catch (e) { process.stdout.write('FETCH FAIL\n'); failed.push({ num, title: s.title, err: e.message }); projSpots.push(baseSpot); continue; }
  const meta = buildPhotoMeta(hit);
  process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
  credits.push({ num, title: s.title, file: hit.file, meta });
  projSpots.push({ ...baseSpot, photo: p, photoMeta: meta });
  await sleep(500);
}
const project = { version: 5, name: `庫克船長太平洋三航 — ${SEGMENT.name}`, center: SEGMENT.center, zoom: SEGMENT.zoom, basemapId: 'voyager', spots: projSpots, routes: [{ id: 'r1', name: SEGMENT.name, pts: SEGMENT.spots.map((s) => s.latlng), color: SEGMENT.color, elevations: null }] };
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));
console.log(`\n  cover: generating placeholder...`);
for (const [n, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], [`${SEGMENT.id}-thumb`, 400, 400]]) {
  const hp = join(TMP, `${n}.html`), pp = join(TMP, `${n}.png`);
  writeFileSync(hp, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${pp}`, `file://${hp}`]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', n.endsWith('thumb') ? '78' : '85', pp, '--out', join(STORY_DIR, `${n}.jpg`)]);
  console.log(`    ✓ ${n}.jpg`);
}
const storyJson = { id: 'cook', title: '庫克船長太平洋三航', subtitle: SEGMENT.subtitle, description: SEGMENT.description, locale: 'zh-TW', cover: 'cover.jpg', music: { src: '../music/voller-hoffnung.mp3', title: 'Voller Hoffnung — Ronny Matthes', credit: 'Ronny Matthes (Jamendo / Internet Archive)', license: 'CC' }, og: { title: '庫克船長太平洋三航 — TrailPaint Stories', description: SEGMENT.description, image: 'og.jpg' }, stories: [{ id: SEGMENT.id, title: SEGMENT.name, subtitle: SEGMENT.subtitle, description: SEGMENT.description, data: `${SEGMENT.id}.trailpaint.json`, thumbnail: `${SEGMENT.id}-thumb.jpg`, color: SEGMENT.color, music: '../music/voller-hoffnung.mp3' }], footer: { cta: '在 TrailPaint 中建立你自己的故事地圖', url: 'https://trailpaint.org/app/' } };
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));
const lines = ['# 庫克船長太平洋三航 — 圖片來源與授權', '', '本故事為 **非營利個人學術展示** 使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。', '', `生成日期：${new Date().toISOString().slice(0, 10)}`, '', '---', '', '## Spot 照片', '', '| # | Spot | 作者 | 授權 | 來源 |', '|---|---|---|---|---|'];
for (const c of credits) lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
lines.push('', '## 路線爭議參考', '');
lines.push('- **Cook 是「神」？**：Marshall Sahlins《How "Natives" Think》(1995) 主張 Cook 被誤認 Lono 神 vs Gananath Obeyesekere《The Apotheosis of Captain Cook》(1992) 反駁此為西方人類學家自我投射 — 1990s 經典學術論戰');
lines.push('- **Botany Bay terra nullius**：Cook 1770 主張澳洲為「無主之地」vs 1992 Mabo case 澳洲高院推翻此法律虛構，確立原住民地權');
lines.push('- **Cook Day 紀念意義**：傳統英國視為「Pacific 探險英雄」vs 紐西蘭 / 澳洲 / 夏威夷原住民視角「殖民先鋒」— 1990s 後當代史學主流',
  '- **Pacific crossing 進度估算**：Cook 三航航海日誌精度遠超同代人，1768-71 第一航航線標準誤差 < 1 度經度（前所未有），全靠 Larcum Kendall 製鐘錶 K1（仿 John Harrison H4）穩定運作');
lines.push('', '學者引用：J. C. Beaglehole《The Life of Captain James Cook》(Stanford UP, 1974) 終極傳記 / Sahlins / Obeyesekere / Hough / Salmond《The Trial of the Cannibal Dog》/ Glyn Williams《The Death of Captain Cook》/ Henry Reynolds 原住民視角史學 / Tony Horwitz《Blue Latitudes》通俗讀本');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));
console.log(`\n${'═'.repeat(60)}\n✅ ${SEGMENT.spots.length} spots, ${credits.length} ok, ${failed.length} failed`);
if (failed.length) for (const f of failed) console.log(`   ${f.num}  ${f.query || ''}  ${f.err || ''}`);

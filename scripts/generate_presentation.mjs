import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const root = process.cwd();
const outputDir = path.join(root, 'presentation');
const logoPath = path.join(root, 'public', 'pwa-512x512.png');
fs.mkdirSync(outputDir, { recursive: true });

const colors = {
  ink: '17352D',
  green: '087F5B',
  mint: 'DDF4EA',
  gold: 'F5B942',
  sky: 'DCEFF3',
  coral: 'F6D8C8',
  white: 'FFFFFF',
  slate: '5A6B66',
  line: 'C9D8D2',
  bg: 'F7FAF8',
};

const slides = [
  {
    kind: 'title',
    title: 'AgriShield',
    subtitle: 'Offline-first parametric micro-insurance for smallholder farmers',
    kicker: 'PRODUCT PRESENTATION',
    caption: 'Weather-triggered protection that keeps working when connectivity does not.',
  },
  {
    title: 'The protection gap is also a connectivity gap',
    bullets: [
      'Smallholder farmers face rainfall volatility, delayed claims, and limited access to trusted insurance.',
      'Rural connectivity can be intermittent exactly when a farmer needs to submit evidence.',
      'Manual verification slows payouts and makes every claim expensive to process.',
    ],
    callout: 'Design principle: make the claim journey simple, auditable, and resilient offline.',
    visual: 'problem',
  },
  {
    title: 'A parametric safety net built around verified weather',
    bullets: [
      'Policies define a crop, location, coverage period, rainfall trigger, and payout amount.',
      'Three weather sources are combined using a median consensus, with outliers flagged.',
      'Eligible claims move through verification and payout workflows without manual field inspection.',
    ],
    callout: 'Outcome: transparent rules, faster decisions, and predictable support.',
    visual: 'solution',
  },
  {
    title: 'From rainfall signal to farmer payout',
    bullets: [
      '1. Weather readings arrive from three independent sources.',
      '2. The policy engine calculates a verified rainfall median.',
      '3. The farmer submits a claim online or saves it locally while offline.',
      '4. The backend verifies the trigger, records an audit trail, and initiates payout.',
    ],
    visual: 'flow',
  },
  {
    title: 'Architecture: small, focused, and deployable',
    bullets: [
      'React and TypeScript frontend with responsive farmer and administrator views.',
      'Node.js and Express REST API for authentication, policies, weather, claims, payouts, and audit logs.',
      'SQLite with WAL mode keeps the deployment lightweight and self-contained.',
    ],
    callout: 'The same codebase supports development, production static hosting, and offline web use.',
    visual: 'architecture',
  },
  {
    title: 'Offline-first is a product behavior, not a fallback screen',
    bullets: [
      'Claims are stored locally when the network is unavailable.',
      'A visible queue shows what is waiting to sync.',
      'Reconnection triggers synchronization and preserves the user journey.',
      'Cached profiles and weather context keep the experience useful between connections.',
    ],
    visual: 'offline',
  },
  {
    title: 'Two experiences, one trusted source of truth',
    bullets: [
      'Farmer: view policy, rainfall status, claim history, payout decision, and voice explanation.',
      'Administrator: monitor devices, inspect claims, review weather consensus, settle payouts, and audit actions.',
      'English and Telugu language support meets users where they are.',
    ],
    visual: 'people',
  },
  {
    kind: 'closing',
    title: 'Make insurance reachable when it matters most',
    subtitle: 'AgriShield turns weather data into a simple, auditable promise: verify fairly, pay quickly, keep working offline.',
    caption: 'Next steps: connect production weather providers, integrate regulated payout rails, and pilot with local farmer groups.',
  },
];

function addPptBrand(slide, pptx, pageNumber) {
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 7.08, w: 12.25, h: 0, line: { color: colors.line, width: 1 } });
  slide.addText(`AGRISHIELD  /  ${String(pageNumber).padStart(2, '0')}`, { x: 0.6, y: 7.14, w: 3, h: 0.2, fontFace: 'Aptos', fontSize: 8, color: colors.slate, bold: true, margin: 0 });
}

function addPptVisual(slide, pptx, type) {
  const x = 7.55;
  const y = 1.48;
  const w = 4.75;
  const h = 4.9;
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: colors.white }, line: { color: colors.line, width: 1.2 } });
  const box = (bx, by, bw, bh, label, fill, textColor = colors.ink) => {
    slide.addShape(pptx.ShapeType.roundRect, { x: x + bx, y: y + by, w: bw, h: bh, rectRadius: 0.06, fill: { color: fill }, line: { color: fill } });
    slide.addText(label, { x: x + bx + 0.08, y: y + by + 0.12, w: bw - 0.16, h: bh - 0.18, fontFace: 'Aptos', fontSize: 13, color: textColor, bold: true, align: 'center', valign: 'mid', margin: 0.03, breakLine: false, fit: 'shrink' });
  };
  const arrow = (ax, ay, aw, ah) => slide.addShape(pptx.ShapeType.chevron, { x: x + ax, y: y + ay, w: aw, h: ah, fill: { color: colors.gold }, line: { color: colors.gold } });

  if (type === 'problem') {
    box(0.45, 0.65, 1.3, 0.75, 'DROUGHT', colors.coral);
    box(2.15, 0.65, 1.3, 0.75, 'DELAY', colors.gold);
    box(3.0, 2.0, 1.3, 0.75, 'TRUST GAP', colors.sky);
    arrow(1.78, 0.84, 0.28, 0.3); arrow(2.0, 1.7, 0.45, 0.3);
    slide.addText('Farmer needs\nfast, fair support', { x: x + 0.65, y: y + 3.2, w: 3.5, h: 0.9, fontFace: 'Aptos Display', fontSize: 22, bold: true, color: colors.green, align: 'center', margin: 0 });
  } else if (type === 'solution') {
    box(0.35, 0.55, 1.25, 0.7, 'POLICY', colors.mint);
    box(1.85, 0.55, 1.25, 0.7, 'ORACLES', colors.sky);
    box(3.35, 0.55, 1.0, 0.7, 'PAYOUT', colors.gold);
    arrow(1.63, 0.75, 0.18, 0.25); arrow(3.13, 0.75, 0.18, 0.25);
    box(1.35, 2.0, 2.1, 0.85, 'MEDIAN CONSENSUS', colors.green, colors.white);
    slide.addText('Verified rainfall = median(source 1, source 2, source 3)', { x: x + 0.55, y: y + 3.45, w: 3.7, h: 0.7, fontFace: 'Aptos', fontSize: 15, color: colors.ink, align: 'center', margin: 0, fit: 'shrink' });
  } else if (type === 'flow') {
    const labels = ['3 weather sources', 'Median + outlier check', 'Claim online/offline', 'Verified payout'];
    labels.forEach((label, index) => { box(0.55 + (index % 2) * 2.15, 0.65 + Math.floor(index / 2) * 1.8, 1.65, 0.8, label, [colors.sky, colors.mint, colors.coral, colors.gold][index]); });
    arrow(2.28, 0.89, 0.25, 0.25); arrow(1.15, 1.58, 0.25, 0.25); arrow(3.35, 2.38, 0.25, 0.25);
  } else if (type === 'architecture') {
    box(0.45, 0.55, 3.75, 0.7, 'React + TypeScript + PWA', colors.mint);
    box(0.45, 1.8, 3.75, 0.7, 'Express REST API', colors.sky);
    box(0.45, 3.05, 1.65, 0.7, 'SQLite WAL', colors.gold);
    box(2.55, 3.05, 1.65, 0.7, 'Policy Engine', colors.coral);
    arrow(2.08, 1.32, 0.25, 0.3); arrow(2.08, 2.57, 0.25, 0.3);
    slide.addText('Auth  |  Claims  |  Weather  |  Payouts  |  Audit', { x: x + 0.45, y: y + 4.28, w: 3.8, h: 0.45, fontFace: 'Aptos', fontSize: 12, bold: true, color: colors.slate, align: 'center', margin: 0, fit: 'shrink' });
  } else if (type === 'offline') {
    box(0.5, 0.7, 1.45, 0.85, 'ONLINE', colors.mint);
    box(2.8, 0.7, 1.45, 0.85, 'OFFLINE', colors.coral);
    arrow(2.12, 0.95, 0.38, 0.3);
    box(1.35, 2.35, 2.1, 0.85, 'LOCAL QUEUE', colors.gold);
    arrow(2.16, 1.7, 0.28, 0.35);
    slide.addText('Reconnect -> sync -> confirm', { x: x + 0.65, y: y + 3.75, w: 3.45, h: 0.5, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: colors.green, align: 'center', margin: 0 });
  } else if (type === 'people') {
    box(0.45, 0.7, 1.65, 1.0, 'FARMER\nPORTAL', colors.mint);
    box(2.65, 0.7, 1.65, 1.0, 'ADMIN\nCONSOLE', colors.sky);
    box(1.55, 2.65, 1.65, 1.0, 'SHARED\nTRUTH', colors.green, colors.white);
    arrow(1.5, 1.95, 0.28, 0.4); arrow(3.05, 1.95, 0.28, 0.4);
    slide.addText('Bilingual, auditable, role-aware', { x: x + 0.55, y: y + 4.1, w: 3.7, h: 0.45, fontFace: 'Aptos', fontSize: 15, color: colors.ink, align: 'center', margin: 0 });
  }
}

async function buildPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'AgriShield';
  pptx.subject = 'Offline-first parametric micro-insurance';
  pptx.title = 'AgriShield Product Presentation';
  pptx.company = 'AgriShield';
  pptx.lang = 'en-US';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-US' };
  const logo = fs.readFileSync(logoPath).toString('base64');

  slides.forEach((data, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: data.kind === 'title' || data.kind === 'closing' ? colors.ink : colors.bg };
    if (data.kind === 'title' || data.kind === 'closing') {
      slide.addImage({ data: `data:image/png;base64,${logo}`, x: 0.75, y: 0.72, w: 1.1, h: 1.1, transparency: 0 });
      slide.addText(data.kicker || 'AGRICULTURE  /  INSURANCE  /  TRUST', { x: 2.15, y: 0.84, w: 8.8, h: 0.25, fontFace: 'Aptos', fontSize: 10, bold: true, color: colors.gold, charSpacing: 1.5, margin: 0 });
      slide.addText(data.title, { x: 0.75, y: 2.05, w: 7.1, h: 0.9, fontFace: 'Aptos Display', fontSize: 38, bold: true, color: colors.white, margin: 0, breakLine: false, fit: 'shrink' });
      slide.addText(data.subtitle, { x: 0.8, y: 3.18, w: 6.8, h: 0.75, fontFace: 'Aptos', fontSize: 21, color: 'D6E9E1', margin: 0, fit: 'shrink' });
      slide.addText(data.caption, { x: 0.8, y: 5.42, w: 8.5, h: 0.55, fontFace: 'Aptos', fontSize: 14, color: 'A9C7BA', margin: 0 });
      slide.addShape(pptx.ShapeType.arc, { x: 9.25, y: 1.25, w: 3.1, h: 3.1, line: { color: colors.green, width: 28, transparency: 15 }, adjustPoint: 0.3 });
      slide.addShape(pptx.ShapeType.arc, { x: 9.75, y: 1.75, w: 2.1, h: 2.1, line: { color: colors.gold, width: 18, transparency: 10 }, adjustPoint: 0.3 });
      slide.addText('WEATHER\nTRIGGERED\nPROTECTION', { x: 9.55, y: 2.15, w: 2.5, h: 1, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: colors.white, align: 'center', valign: 'mid', margin: 0 });
      slide.addText(`AgriShield  /  ${String(index + 1).padStart(2, '0')}`, { x: 0.8, y: 7.05, w: 3, h: 0.2, fontFace: 'Aptos', fontSize: 8, color: '9CBCAF', margin: 0 });
      return;
    }
    slide.addText(data.title, { x: 0.65, y: 0.62, w: 6.45, h: 0.75, fontFace: 'Aptos Display', fontSize: 27, bold: true, color: colors.ink, margin: 0, fit: 'shrink' });
    slide.addShape(pptx.ShapeType.line, { x: 0.68, y: 1.35, w: 1.2, h: 0, line: { color: colors.gold, width: 4 } });
    slide.addText(data.bullets.map((text) => ({ text, options: { bullet: { indent: 16 }, hanging: 4 } })), { x: 0.75, y: 1.68, w: 6.15, h: 3.55, fontFace: 'Aptos', fontSize: 16, color: colors.ink, breakLine: true, paraSpaceAfterPt: 13, margin: 0.04, fit: 'shrink' });
    if (data.callout) {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 5.55, w: 6.15, h: 0.72, rectRadius: 0.06, fill: { color: colors.mint }, line: { color: colors.mint } });
      slide.addText(data.callout, { x: 0.98, y: 5.76, w: 5.7, h: 0.28, fontFace: 'Aptos', fontSize: 12, bold: true, color: colors.green, margin: 0, fit: 'shrink' });
    }
    addPptVisual(slide, pptx, data.visual);
    addPptBrand(slide, pptx, index + 1);
  });
  await pptx.writeFile({ fileName: path.join(outputDir, 'AgriShield-Product-Presentation.pptx') });
}

function pdfText(page, text, x, y, size, font, color, maxWidth = 800) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * (size + 5), size, font, color }));
  return lines.length;
}

async function buildPdf() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(fs.readFileSync(logoPath));
  const W = 960; const H = 540;
  slides.forEach((data, index) => {
    const page = pdf.addPage([W, H]);
    const dark = data.kind === 'title' || data.kind === 'closing';
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(...(dark ? [0.09, 0.21, 0.18] : [0.97, 0.98, 0.97])) });
    const ink = rgb(0.09, 0.21, 0.18); const green = rgb(0.03, 0.5, 0.36); const gold = rgb(0.96, 0.73, 0.26); const white = rgb(1, 1, 1); const slate = rgb(0.35, 0.42, 0.4);
    if (dark) {
      page.drawImage(logo, { x: 58, y: 390, width: 74, height: 74 });
      page.drawText(data.kicker || 'AGRICULTURE  /  INSURANCE  /  TRUST', { x: 155, y: 430, size: 10, font: bold, color: gold });
      page.drawText(data.title, { x: 58, y: 300, size: 42, font: bold, color: white });
      pdfText(page, data.subtitle, 62, 252, 21, regular, rgb(0.84, 0.91, 0.88), 570);
      pdfText(page, data.caption, 62, 110, 14, regular, rgb(0.66, 0.78, 0.72), 760);
      page.drawCircle({ x: 790, y: 310, size: 104, borderColor: green, borderWidth: 20, opacity: 0.8 });
      page.drawCircle({ x: 790, y: 310, size: 66, borderColor: gold, borderWidth: 14, opacity: 0.9 });
      page.drawText('WEATHER', { x: 744, y: 320, size: 16, font: bold, color: white });
      page.drawText('TRIGGER', { x: 747, y: 298, size: 16, font: bold, color: white });
      page.drawText('PROTECTION', { x: 725, y: 276, size: 13, font: bold, color: white });
    } else {
      page.drawText(data.title, { x: 50, y: 472, size: 26, font: bold, color: ink });
      page.drawRectangle({ x: 52, y: 451, width: 78, height: 4, color: gold });
      let y = 405;
      data.bullets.forEach((bullet) => { const count = pdfText(page, bullet, 72, y, 15, regular, ink, 480); page.drawCircle({ x: 58, y: y + 4, size: 4, color: green }); y -= count * 20 + 18; });
      if (data.callout) { page.drawRectangle({ x: 50, y: 66, width: 500, height: 45, color: rgb(0.87, 0.96, 0.92) }); pdfText(page, data.callout, 68, 91, 12, bold, green, 465); }
      page.drawRectangle({ x: 602, y: 98, width: 290, height: 330, color: white, borderColor: rgb(0.79, 0.85, 0.82), borderWidth: 1 });
      page.drawText((data.visual || 'SYSTEM').toUpperCase(), { x: 625, y: 397, size: 11, font: bold, color: slate });
      page.drawCircle({ x: 748, y: 275, size: 72, borderColor: green, borderWidth: 12, opacity: 0.75 });
      page.drawCircle({ x: 748, y: 275, size: 43, color: rgb(0.87, 0.96, 0.92), opacity: 0.9 });
      page.drawText(data.visual === 'flow' ? 'SIGNAL  >  DECISION  >  PAYOUT' : data.visual === 'architecture' ? 'UI  >  API  >  DATA' : data.visual === 'offline' ? 'LOCAL  >  SYNC' : data.visual === 'people' ? 'FARMER  +  ADMIN' : 'TRUSTED DATA', { x: 636, y: 174, size: 13, font: bold, color: green });
      page.drawText(`AGRISHIELD  /  ${String(index + 1).padStart(2, '0')}`, { x: 52, y: 28, size: 8, font: bold, color: slate });
    }
  });
  fs.writeFileSync(path.join(outputDir, 'AgriShield-Product-Presentation.pdf'), await pdf.save());
}

await buildPptx();
await buildPdf();
console.log(`Created presentation files in ${outputDir}`);

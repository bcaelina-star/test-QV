/**
 * tests_resultats.js — Tests automatiques V.A.L.E.U.R© V3
 * Échelle 0-5 · 78 items masques + 7 items SPA = 85 items
 * 4 inversés : J6, V5, V11, B8
 * SPA indépendant : score_SPA% = (Σ7 / 35) × 100
 * Usage : node tests_resultats.js  (depuis le dossier questionnaire/)
 */

const fs = require('fs');
const vm = require('vm');

const htmlIndex = fs.readFileSync('index.html', 'utf8');
const scriptsIndex = [...htmlIndex.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).join('\n');

const htmlRes = fs.readFileSync('resultats.html', 'utf8');
const scriptsRes = [...htmlRes.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).join('\n');

const stub = `
  const window={location:{href:'http://localhost/',search:''}};
  const document={getElementById:()=>({innerHTML:'',style:{},classList:{add:()=>{}}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener:()=>{},body:{style:{}}};
  const localStorage={getItem:()=>null,setItem:()=>{}};
  const sessionStorage={getItem:()=>null};
  const URLSearchParams=class{constructor(){}get(){return null;}};
  const IntersectionObserver=class{observe(){}};
  const navigator={userAgent:''};
  const history={pushState:()=>{},replaceState:()=>{}};
  const emailjs={init:()=>{},send:()=>Promise.resolve()};
  const fetch=()=>Promise.resolve({json:()=>Promise.resolve({})});
`;

const ctxI = { console, setTimeout:()=>{}, clearTimeout:()=>{}, require };
vm.createContext(ctxI);
try { vm.runInContext(stub + scriptsIndex, ctxI); } catch(e) {}

const ctxR = { console, setTimeout:()=>{}, clearTimeout:()=>{}, require };
vm.createContext(ctxR);
try { vm.runInContext(stub + scriptsRes, ctxR); } catch(e) {}

// ── Helpers ──────────────────────────────────────────────────────────────
let passed=0, failed=0, failures=[];

function test(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  process.stdout.write(`  ${ok?'✓':'✗'} ${label}\n`);
  if(ok) { passed++; }
  else {
    failed++;
    failures.push(label);
    process.stdout.write(`      Attendu: ${JSON.stringify(expected)}\n`);
    process.stdout.write(`      Obtenu : ${JSON.stringify(got)}\n`);
  }
}
function testIn(label, str, sub) {
  const ok = typeof str==='string' && str.includes(sub);
  process.stdout.write(`  ${ok?'✓':'✗'} ${label}\n`);
  if(ok) passed++; else { failed++; failures.push(label); }
}
function testNotIn(label, str, sub) {
  const ok = typeof str==='string' && !str.includes(sub);
  process.stdout.write(`  ${ok?'✓':'✗'} ${label}\n`);
  if(ok) passed++; else { failed++; failures.push(label); }
}
function section(t) { console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

// Fonctions depuis resultats.html
const lv            = ctxR.lv;
const detectProfile = ctxR.detectProfile;
const gd            = ctxR.gd;
const gt            = ctxR.gt;
const computeSPA_res = ctxR.computeSPA;

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 1 — lv(p) seuils V3
// < 30 Non sig · < 50 Modéré · < 70 Significatif · < 85 Élevé · ≥ 85 Dominant
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 1 — lv(p) : seuils V3 (%)');
if(typeof lv!=='function') { console.log('  ⚠ lv() absent'); }
else {
  test('lv(0)   = Non significatif', lv(0),   'Non significatif');
  test('lv(29)  = Non significatif', lv(29),  'Non significatif');
  test('lv(30)  = Modéré',           lv(30),  'Modéré');
  test('lv(49)  = Modéré',           lv(49),  'Modéré');
  test('lv(50)  = Significatif',     lv(50),  'Significatif');
  test('lv(69)  = Significatif',     lv(69),  'Significatif');
  test('lv(70)  = Élevé',            lv(70),  'Élevé');
  test('lv(84)  = Élevé',            lv(84),  'Élevé');
  test('lv(85)  = Dominant',         lv(85),  'Dominant');
  test('lv(100) = Dominant',         lv(100), 'Dominant');
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 2 — detectProfile()
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 2 — detectProfile()');
if(typeof detectProfile!=='function') { console.log('  ⚠ detectProfile() absent'); }
else {
  let r;
  r = detectProfile({orange:88,rouge:30,jaune:40,vert:35,bleu:50,indigo:60,violet:25});
  test('Mono dominant — type',   r.type,    'mono');
  test('Mono dominant — mask',   r.masks[0],'orange');

  r = detectProfile({vert:72,bleu:68,orange:40,jaune:35,rouge:30,indigo:50,violet:25});
  test('Dyade — type',    r.type,    'dyade');

  r = detectProfile({orange:72,indigo:65,vert:60,bleu:55,rouge:30,jaune:40,violet:25});
  test('Triade — type',   r.type, 'triade');
  test('Triade — 3 masks', r.masks.length, 3);

  r = detectProfile({rouge:20,orange:22,jaune:18,vert:25,bleu:15,indigo:28,violet:12});
  test('Adaptatif — type (tous < 50%)', r.type, 'adaptatif');
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 3 — 21 dyades
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 3 — DY lookup : 21 dyades');
const DYADES_21=[
  ['rouge','orange'],['rouge','jaune'],['rouge','vert'],['rouge','bleu'],
  ['rouge','indigo'],['rouge','violet'],['orange','jaune'],['orange','vert'],
  ['orange','bleu'],['orange','indigo'],['orange','violet'],['jaune','vert'],
  ['jaune','bleu'],['jaune','indigo'],['jaune','violet'],['vert','bleu'],
  ['vert','indigo'],['vert','violet'],['bleu','indigo'],['bleu','violet'],
  ['indigo','violet']
];
if(typeof gd!=='function') { console.log('  ⚠ gd() absent'); }
else {
  let dyOk=0;
  for(const [a,b] of DYADES_21) {
    const d1=gd(a,b), d2=gd(b,a);
    if(d1&&d1.n&&d2&&d1.n===d2.n) dyOk++;
    else { process.stdout.write(`  ✗ dyade ${a}+${b}\n`); failed++; failures.push(`DY[${a}+${b}]`); }
  }
  if(dyOk===21) { process.stdout.write(`  ✓ 21/21 dyades OK\n`); passed++; }
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 4 — 15 triades
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 4 — gt() : 15 triades');
const TRIADES_15=[
  ['rouge','jaune','orange'],['jaune','bleu','indigo'],['vert','indigo','orange'],
  ['rouge','bleu','jaune'],['violet','orange','indigo'],['rouge','vert','jaune'],
  ['jaune','vert','bleu'],['rouge','orange','violet'],['indigo','bleu','orange'],
  ['vert','jaune','orange'],['rouge','indigo','jaune'],['violet','vert','bleu'],
  ['bleu','jaune','orange'],['rouge','vert','violet'],['indigo','jaune','violet']
];
if(typeof gt!=='function') { console.log('  ⚠ gt() absent'); }
else {
  let trOk=0;
  for(const keys of TRIADES_15) {
    const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].map(p=>[keys[p[0]],keys[p[1]],keys[p[2]]]);
    const res=perms.map(p=>gt(p));
    if(res.every(r=>r&&r.n)&&res.every(r=>r.n===res[0].n)) trOk++;
    else { process.stdout.write(`  ✗ triade ${keys.join('+')}\n`); failed++; failures.push(`gt([${keys}])`); }
  }
  if(trOk===15) { process.stdout.write(`  ✓ 15/15 triades OK\n`); passed++; }
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 5 — Scoring V3 : échelle 0-5 · 78 items masques + 7 SPA
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 5 — Scoring V3 : échelle 0-5 · MASQUE_ITEMS + SPA_ITEMS');

const MASQUE_ITEMS = vm.runInContext('typeof MASQUE_ITEMS !== "undefined" ? MASQUE_ITEMS : null', ctxI);
const SPA_ITEMS    = vm.runInContext('typeof SPA_ITEMS    !== "undefined" ? SPA_ITEMS    : null', ctxI);
const MASK_MAX     = vm.runInContext('typeof MASK_MAX     !== "undefined" ? MASK_MAX     : null', ctxI);
const SPA_MAX      = vm.runInContext('typeof SPA_MAX      !== "undefined" ? SPA_MAX      : null', ctxI);

if(!MASQUE_ITEMS || !MASK_MAX) {
  console.log('  ⚠ MASQUE_ITEMS ou MASK_MAX absent de index.html');
} else {
  // adj(item, raw) = inv ? 5−raw : raw  (échelle 0-5)
  function adjLocal(it, raw) { return it.inv ? (5 - raw) : raw; }

  const groups = {};
  for(const it of MASQUE_ITEMS) {
    if(!groups[it.mask]) groups[it.mask] = [];
    groups[it.mask].push(it);
  }

  function calcMask(mask, rawVal) {
    const items = groups[mask] || [];
    if(!items.length) return 0;
    const sum = items.reduce((a, it) => a + adjLocal(it, rawVal), 0);
    return Math.round(sum / MASK_MAX[mask] * 100);
  }

  // ── Avec raw=5 (max de l'échelle 0-5) ───────────────────────────────
  // Masques sans inversé → 100%
  // Masques avec inversés → (n_direct×5 + n_inv×(5-5)) / max × 100
  //   JAUNE  (1 inv J6)  : 8×5 / 45 × 100 = 89%
  //   VERT   (2 inv V5,V11): 9×5 / 55 × 100 = 82%
  //   BLEU   (1 inv B8)  : 10×5 / 55 × 100 = 91%
  test('Rouge  tous=5 → 100%', calcMask('rouge',  5), 100);
  test('Orange tous=5 → 100%', calcMask('orange', 5), 100);
  test('Indigo tous=5 → 100%', calcMask('indigo', 5), 100);
  test('Violet tous=5 → 100%', calcMask('violet', 5), 100);
  test('Jaune  tous=5 → 89% (1 inversé J6)',    calcMask('jaune',  5), 89);
  test('Vert   tous=5 → 82% (2 inversés V5,V11)', calcMask('vert', 5), 82);
  test('Bleu   tous=5 → 91% (1 inversé B8)',    calcMask('bleu',   5), 91);

  // ── Avec raw=0 (min) ─────────────────────────────────────────────────
  // Masques sans inversé → 0%
  // Masques avec inversés → n_inv×5 / max × 100
  //   JAUNE  (1 inv J6)  : 1×5 / 45 × 100 = 11%
  //   VERT   (2 inv V5,V11): 2×5 / 55 × 100 = 18%
  //   BLEU   (1 inv B8)  : 1×5 / 55 × 100 = 9%
  test('Rouge  tous=0 → 0%',  calcMask('rouge',  0), 0);
  test('Orange tous=0 → 0%',  calcMask('orange', 0), 0);
  test('Indigo tous=0 → 0%',  calcMask('indigo', 0), 0);
  test('Violet tous=0 → 0%',  calcMask('violet', 0), 0);
  test('Jaune  tous=0 → 11% (1 inversé)',  calcMask('jaune', 0), 11);
  test('Vert   tous=0 → 18% (2 inversés)', calcMask('vert',  0), 18);
  test('Bleu   tous=0 → 9%  (1 inversé)',  calcMask('bleu',  0), 9);

  // ── Items count ───────────────────────────────────────────────────────
  test('Items ROUGE   = 10', (groups['rouge']  ||[]).length, 10);
  test('Items ORANGE  = 13', (groups['orange'] ||[]).length, 13);
  test('Items JAUNE   =  9', (groups['jaune']  ||[]).length,  9);
  test('Items VERT    = 11', (groups['vert']   ||[]).length, 11);
  test('Items BLEU    = 11', (groups['bleu']   ||[]).length, 11);
  test('Items INDIGO  = 12', (groups['indigo'] ||[]).length, 12);
  test('Items VIOLET  = 12', (groups['violet'] ||[]).length, 12);
  test('Total MASQUE_ITEMS = 78', MASQUE_ITEMS.length, 78);

  // ── MASK_MAX V3 (0-5 scale) ───────────────────────────────────────────
  test('MASK_MAX rouge  = 50', MASK_MAX.rouge,  50);
  test('MASK_MAX orange = 65', MASK_MAX.orange, 65);
  test('MASK_MAX jaune  = 45', MASK_MAX.jaune,  45);
  test('MASK_MAX vert   = 55', MASK_MAX.vert,   55);
  test('MASK_MAX bleu   = 55', MASK_MAX.bleu,   55);
  test('MASK_MAX indigo = 60', MASK_MAX.indigo, 60);
  test('MASK_MAX violet = 60', MASK_MAX.violet, 60);

  // ── SPA items ─────────────────────────────────────────────────────────
  if(!SPA_ITEMS) {
    console.log('  ⚠ SPA_ITEMS absent de index.html');
  } else {
    test('SPA_ITEMS = 7', SPA_ITEMS.length, 7);
    test('SPA_MAX = 35',  SPA_MAX,          35);
    // Tous les items SPA sont directs (aucune inversion)
    test('SPA : 0 items inversés', SPA_ITEMS.filter(it=>it.inv).length, 0);
    // Masque de tous les SPA = 'spa'
    test('SPA : mask = "spa"', SPA_ITEMS.every(it=>it.mask==='spa'), true);
  }

  // ── Inversés ─────────────────────────────────────────────────────────
  const invIds = MASQUE_ITEMS.filter(it=>it.inv).map(it=>it.id).sort();
  test('4 items inversés au total', invIds.length, 4);
  test('Inversés = J6, V11, V5, B8', invIds, ['B8','J6','V11','V5']);

  // ── Pas de champ scale ───────────────────────────────────────────────
  test('Aucun item avec champ scale', MASQUE_ITEMS.every(it=>!('scale' in it)), true);
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 6 — Lexique interdit
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 6 — Lexique interdit');
const htmlAll = htmlIndex + htmlRes;
const INTERDIT = ['pathologie','trouble','diagnostic','narcissisme','toxique','psychiatrique'];
let lexOk = true;
for(const m of INTERDIT) {
  if(htmlAll.toLowerCase().includes(m.toLowerCase())) {
    process.stdout.write(`  ✗ Mot interdit: "${m}"\n`); failed++; failures.push(m); lexOk=false;
  }
}
if(lexOk) { process.stdout.write(`  ✓ Aucun mot interdit\n`); passed++; }

const MASQUE_ITEMS_LEX = vm.runInContext('typeof MASQUE_ITEMS !== "undefined" ? MASQUE_ITEMS : null', ctxI);
const SPA_ITEMS_LEX    = vm.runInContext('typeof SPA_ITEMS    !== "undefined" ? SPA_ITEMS    : null', ctxI);
const allItems = [...(MASQUE_ITEMS_LEX||[]), ...(SPA_ITEMS_LEX||[])];
const itemTexts = allItems.map(it=>it.text||'');
const tuChecks = [/\btoi\b/, / tes /, /\btu\b/];
let tuOk = true;
for(const pat of tuChecks) {
  const found = itemTexts.some(t => pat.test(t));
  if(found) { process.stdout.write(`  ✗ Tutoiement: ${pat}\n`); failed++; failures.push(`Tutoiement ${pat}`); tuOk=false; }
}
if(tuOk) { process.stdout.write(`  ✓ Aucun tutoiement dans les 85 items\n`); passed++; }

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 7 — computeSPA V3 : lecture directe de sc.spa
// Formule : score_SPA% = (Σ7 items / 35) × 100  — indépendant des masques
// Dans resultats.html : computeSPA(sc) retourne sc.spa si présent
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 7 — computeSPA V3 (sc.spa direct)');
const computeSPA = vm.runInContext('typeof computeSPA !== "undefined" ? computeSPA : null', ctxI);
const computeSPA_r = ctxR.computeSPA;
const fn = computeSPA_r || computeSPA;

if(!fn) {
  console.log('  ⚠ computeSPA absent des deux fichiers');
} else {
  // V3 : sc.spa direct (résultat pré-calculé dans index.html)
  test('SPA sc.spa=50  → 50',  fn({rouge:50,orange:50,jaune:50,vert:50,bleu:50,indigo:50,violet:50,spa:50}),  50);
  test('SPA sc.spa=0   → 0',   fn({rouge:0, orange:0, jaune:0, vert:0, bleu:0, indigo:0, violet:0, spa:0}),   0);
  test('SPA sc.spa=100 → 100', fn({rouge:100,orange:100,jaune:100,vert:100,bleu:100,indigo:100,violet:100,spa:100}), 100);
  test('SPA sc.spa=77  → 77',  fn({rouge:80,orange:0, jaune:0, vert:0, bleu:0, indigo:0, violet:0, spa:77}),  77);
  test('SPA sc.spa=43  → 43',  fn({rouge:35,orange:28,jaune:58,vert:82,bleu:44,indigo:68,violet:30,spa:43}),  43);

  // Fallback V1/V2 (sans champ spa) — formule ancienne 100−Σ/7
  test('SPA fallback tous=50 → 50',
    fn({rouge:50,orange:50,jaune:50,vert:50,bleu:50,indigo:50,violet:50}), 50);
  test('SPA fallback tous=0  → 100',
    fn({rouge:0, orange:0, jaune:0, vert:0, bleu:0, indigo:0, violet:0}),  100);
  test('SPA fallback tous=100 → 0',
    fn({rouge:100,orange:100,jaune:100,vert:100,bleu:100,indigo:100,violet:100}), 0);
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 8 — SÉCURITÉ : vérifications pré-déploiement
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 8 — SÉCURITÉ : vérifications pré-déploiement');

testNotIn('resultats.html — aucun "praticien"',        htmlRes, 'praticien');
testNotIn('resultats.html — aucun "VALEUR-CABINET"',   htmlRes, 'VALEUR-CABINET');
testNotIn('resultats.html — aucun "template_xp8cfww"', htmlRes, 'template_xp8cfww');

testIn('resultats.html — mode admin VALEUR-ADMIN-2025', htmlRes, 'VALEUR-ADMIN-2025');
const adminCount = (htmlRes.match(/VALEUR-ADMIN-2025/g)||[]).length;
test('VALEUR-ADMIN-2025 présent ≥ 1×', adminCount >= 1, true);

testIn('callbackUrl Stripe contient les scores', htmlRes, 'scoreParams');
testIn('callbackUrl Stripe contient le SPA',     htmlRes, 'spaParam');

testIn('STRIPE_LINKS_RAPPORT présent', htmlRes, 'STRIPE_LINKS_RAPPORT');
testIn('VALEUR_API déclaré',           htmlRes, "const VALEUR_API=");
testIn('fetchWithTimeout défini',      htmlRes, 'async function fetchWithTimeout(');
testIn('html2pdf.js CDN chargé',       htmlRes, 'html2pdf.bundle.min.js');
testIn('V_downloadPDF est async',      htmlRes, 'async function V_downloadPDF()');
testIn('document.fonts.ready',        htmlRes, 'document.fonts.ready');
testIn('FORCES_PAYWALL défini',        htmlRes, 'const FORCES_PAYWALL');
testIn('Bloc #pw-force-liberee',       htmlRes, 'id="pw-force-liberee"');

// V3 — 85 items (plus 129)
testNotIn('resultats.html ne cite pas "129 affirmations"', htmlRes, '129 affirmations');

// Instruments V3
testIn('instruments V3 dans footer', htmlRes, 'Wood et al.');

// GitHub absent
testNotIn('resultats.html — aucune référence GitHub', htmlRes, 'github.com');
testNotIn('index.html    — aucune référence GitHub',  htmlIndex, 'github.com');

// index.html écrit valeur_scores (clé lue par resultats.html)
testIn('index.html écrit valeur_scores', htmlIndex, "localStorage.setItem('valeur_scores'");

// localStorage V3 : plus de clé v3 orpheline
testNotIn('index.html : plus de valeur_scores_v3', htmlIndex, 'valeur_scores_v3');

// Print
testIn('@media print configuré',            htmlRes, '@media print');
testIn('.page min-height (pas height fixe)', htmlRes, 'min-height:297mm');
testNotIn('Pas de "height:297mm;margin"',   htmlRes, ';height:297mm;margin');

// ─────────────────────────────────────────────────────────────────────────
// RÉSULTAT FINAL
// ─────────────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RÉSULTAT : ${passed}/${total} tests passés`);
if(failures.length) {
  console.log('\n  ❌ Échecs — NE PAS DÉPLOYER :');
  failures.forEach(f => console.log(`    ✗ ${f}`));
  console.log('\n  Corriger les erreurs avant tout déploiement IONOS.');
  process.exit(1);
} else {
  console.log('  ✅ Tous les tests passés — V.A.L.E.U.R© V3 prêt pour IONOS');
  process.exit(0);
}

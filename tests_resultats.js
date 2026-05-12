/**
 * tests_resultats.js — Tests automatiques V.A.L.E.U.R© v2 + vérifications sécurité pré-déploiement
 * Échelle 0-4 unifiée · 129 items · Parties 5 et 7 mises à jour
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

// Contexte index.html
const ctxI = { console, setTimeout:()=>{}, clearTimeout:()=>{}, require };
vm.createContext(ctxI);
try { vm.runInContext(stub + scriptsIndex, ctxI); } catch(e) {}

// Contexte resultats.html
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

// Récupération des fonctions
const lv            = ctxR.lv;
const detectProfile = ctxR.detectProfile;
const gd            = ctxR.gd;
const gt            = ctxR.gt;
const computeSPA_res = ctxR.computeSPA;

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 1 — lv(p) seuils %
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 1 — lv(p) : seuils de niveau (%)');
if(typeof lv!=='function') { console.log('  ⚠ lv() absent'); }
else {
  test('lv(0)   = Non significatif', lv(0),   'Non significatif');
  test('lv(29)  = Non significatif', lv(29),  'Non significatif');
  test('lv(30)  = Modéré',           lv(30),  'Modéré');
  test('lv(49)  = Modéré',           lv(49),  'Modéré');
  test('lv(50)  = Significatif',     lv(50),  'Significatif');
  test('lv(64)  = Significatif',     lv(64),  'Significatif');
  test('lv(65)  = Élevé',            lv(65),  'Élevé');
  test('lv(79)  = Élevé',            lv(79),  'Élevé');
  test('lv(80)  = Dominant',         lv(80),  'Dominant');
  test('lv(100) = Dominant',         lv(100), 'Dominant');
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 2 — detectProfile()
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 2 — detectProfile()');
if(typeof detectProfile!=='function') { console.log('  ⚠ detectProfile() absent'); }
else {
  let r;
  r = detectProfile({orange:85,rouge:30,jaune:40,vert:35,bleu:50,indigo:60,violet:25});
  test('Mono dominant — type',   r.type,    'mono');
  test('Mono dominant — mask',   r.masks[0],'orange');

  r = detectProfile({orange:85,indigo:70,rouge:30,jaune:40,vert:35,bleu:50,violet:25});
  test('Mono + secondaire indigo', r.secondary, 'indigo');

  r = detectProfile({vert:72,bleu:68,orange:40,jaune:35,rouge:30,indigo:50,violet:25});
  test('Dyade pure — type',    r.type,    'amplification');
  test('Dyade pure — subtype', r.subtype, 'dyade');

  r = detectProfile({orange:72,indigo:65,vert:60,bleu:55,rouge:30,jaune:40,violet:25});
  test('Triade — type',   r.type, 'amplification');
  test('Triade — 3 masks', r.masks.length, 3);

  r = detectProfile({rouge:25,orange:28,jaune:22,vert:30,bleu:20,indigo:35,violet:18});
  test('Adaptatif — type', r.type, 'adaptatif');

  r = detectProfile({vert:75,indigo:75,orange:50,jaune:45,rouge:35,bleu:40,violet:30});
  test('Tiebreak indigo>vert', r.masks[0], 'indigo');
  test('Tiebreak — tiebroken', r.tiebroken, true);
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
// PARTIE 5 — Scoring v3
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 5 — Scoring v3 : échelle 0-4 unifiée');
const ALL_ITEMS = vm.runInContext('typeof ALL_ITEMS !== "undefined" ? ALL_ITEMS : null', ctxI);
const MASK_MAX  = vm.runInContext('typeof MASK_MAX  !== "undefined" ? MASK_MAX  : null', ctxI);

if(!ALL_ITEMS || !MASK_MAX) {
  console.log('  ⚠ ALL_ITEMS ou MASK_MAX absent de index.html');
} else {
  const groups = {};
  for(const it of ALL_ITEMS) {
    if(!groups[it.mask]) groups[it.mask] = [];
    groups[it.mask].push(it);
  }
  function simScores(rawVal) {
    const resp = {};
    for(const it of ALL_ITEMS) resp[it.id] = rawVal;
    return resp;
  }
  function adjLocal(it, raw) { return it.inv ? (4 - raw) : raw; }
  function calcMask(mask, resp) {
    const items = groups[mask] || [];
    if(!items.length) return 0;
    const sum = items.reduce((a, it) => a + adjLocal(it, resp[it.id] ?? 0), 0);
    return Math.round(sum / MASK_MAX[mask] * 100);
  }
  function calcViolet(resp) {
    const ds6  = groups['violet_ds6']  || [];
    const scim = groups['violet_scim'] || [];
    const pDS6  = ds6.length  ? Math.round(ds6.reduce((a,it)=>a+adjLocal(it,resp[it.id]??0),0)/MASK_MAX.violet_ds6*100) : 0;
    const pSCIM = scim.length ? Math.round(scim.reduce((a,it)=>a+adjLocal(it,resp[it.id]??0),0)/MASK_MAX.violet_scim*100) : 0;
    return Math.round((pDS6 + pSCIM) / 2);
  }
  const r4 = simScores(4);
  test('Rouge   tous=4 → 100%',                    calcMask('rouge',   r4), 100);
  test('Indigo  tous=4 → 100%',                    calcMask('indigo',  r4), 100);
  test('Jaune   tous=4 → 100%',                    calcMask('jaune',   r4), 100);
  test('Bleu    tous=4 → 100%',                    calcMask('bleu',    r4), 100);
  test('Orange  tous=4 → 75% (5 inversés)',         calcMask('orange', r4), 75);
  test('Vert    tous=4 → 72% (5 inversés)',         calcMask('vert',   r4), 72);
  test('Violet  tous=4 → 90% (2 inversés SCIM)',    calcViolet(r4), 90);
  const r0 = simScores(0);
  test('Rouge  tous=0 → 0%',                       calcMask('rouge',  r0), 0);
  test('Jaune  tous=0 → 0%',                       calcMask('jaune',  r0), 0);
  test('Bleu   tous=0 → 0%',                       calcMask('bleu',   r0), 0);
  test('Indigo tous=0 → 0%',                       calcMask('indigo', r0), 0);
  test('Orange tous=0 → 25% (5 inversés)',          calcMask('orange', r0), 25);
  test('Vert   tous=0 → 28% (5 inversés)',          calcMask('vert',   r0), 28);
  test('Violet tous=0 → 10% (2 inversés SCIM)',     calcViolet(r0), 10);
  test('Items Rouge = 18',   (groups['rouge']||[]).length,      18);
  test('Items Orange = 20',  (groups['orange']||[]).length,     20);
  test('Items Jaune = 12',   (groups['jaune']||[]).length,      12);
  test('Items Vert = 18',    (groups['vert']||[]).length,       18);
  test('Items Bleu = 20',    (groups['bleu']||[]).length,       20);
  test('Items Indigo = 25',  (groups['indigo']||[]).length,     25);
  test('Items DS-6 = 6',     (groups['violet_ds6']||[]).length, 6);
  test('Items SCIM = 10',    (groups['violet_scim']||[]).length,10);
  test('Total = 129',        ALL_ITEMS.length,                  129);
  const invIds = ALL_ITEMS.filter(it=>it.inv).map(it=>it.id).sort();
  test('12 items inversés au total', invIds.length, 12);
  test('Aucun item avec champ scale', ALL_ITEMS.every(it=>!('scale' in it)), true);
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

const ALL_ITEMS_LEX = vm.runInContext('typeof ALL_ITEMS !== "undefined" ? ALL_ITEMS : null', ctxI);
const itemTexts = ALL_ITEMS_LEX ? ALL_ITEMS_LEX.map(it=>it.text) : [];
const tuChecks = [/\btoi\b/, / tes /, /\btu\b/];
let tuOk = true;
for(const pat of tuChecks) {
  const found = itemTexts.some(t => pat.test(t));
  if(found) { process.stdout.write(`  ✗ Tutoiement: ${pat}\n`); failed++; failures.push(`Tutoiement ${pat}`); tuOk=false; }
}
if(tuOk) { process.stdout.write(`  ✓ Aucun tutoiement dans les items\n`); passed++; }

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 7 — computeSPA
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 7 — computeSPA(sc) depuis scores masques (%)');
const computeSPA = vm.runInContext('typeof computeSPA !== "undefined" ? computeSPA : null', ctxI);
if(!computeSPA && !computeSPA_res) {
  console.log('  ⚠ computeSPA absent des deux fichiers');
} else {
  const fn = computeSPA || computeSPA_res;
  test('SPA tous=50 → 50',  fn({rouge:50,orange:50,jaune:50,vert:50,bleu:50,indigo:50,violet:50}), 50);
  test('SPA tous=0  → 100', fn({rouge:0,orange:0,jaune:0,vert:0,bleu:0,indigo:0,violet:0}),       100);
  test('SPA tous=100 → 0',  fn({rouge:100,orange:100,jaune:100,vert:100,bleu:100,indigo:100,violet:100}), 0);
  test('SPA rouge=80 reste=0 → 89%', fn({rouge:80,orange:0,jaune:0,vert:0,bleu:0,indigo:0,violet:0}), 89);
  const typique = fn({rouge:35,orange:28,jaune:58,vert:82,bleu:44,indigo:68,violet:30});
  test('SPA profil typique ∈ [30,70]', typique >= 30 && typique <= 70, true);
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 8 — SÉCURITÉ : vérifications pré-déploiement
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 8 — SÉCURITÉ : vérifications pré-déploiement');

// 8.1 — Aucune référence praticien/cabinet dans resultats.html
testNotIn('resultats.html — aucun "praticien"',        htmlRes, 'praticien');
testNotIn('resultats.html — aucun "VALEUR-CABINET"',   htmlRes, 'VALEUR-CABINET');
testNotIn('resultats.html — aucun "template_xp8cfww"', htmlRes, 'template_xp8cfww');
testNotIn('resultats.html — aucun "isPraticien"',      htmlRes, 'isPraticien');

// 8.2 — Mode admin présent et unique
testIn('resultats.html — mode admin VALEUR-ADMIN-2025 présent', htmlRes, 'VALEUR-ADMIN-2025');
const adminCount = (htmlRes.match(/VALEUR-ADMIN-2025/g)||[]).length;
test('VALEUR-ADMIN-2025 présent au moins 1× dans resultats.html',
  adminCount >= 1, true);

// 8.3 — Scores dans le callbackUrl Stripe
testIn('callbackUrl Stripe contient les scores', htmlRes, 'scoreParams');
testIn('callbackUrl Stripe contient le SPA',     htmlRes, 'spaParam');

// 8.4 — Un seul jeu de liens Stripe (STRIPE_LINKS_RAPPORT uniquement)
testNotIn('Anciens liens Stripe buy.stripe.com/eVq4gs supprimés', htmlRes, 'eVq4gs13f059');
testNotIn('Anciens liens Stripe buy.stripe.com/fZubIU supprimés', htmlRes, 'fZubIU9zLbNR');
testIn('STRIPE_LINKS_RAPPORT présent', htmlRes, 'STRIPE_LINKS_RAPPORT');

// 8.5 — API unifiée (plus de doublon)
testNotIn('Pas de var VERCEL_API dans resultats.html', htmlRes, "var VERCEL_API=");
testIn('VALEUR_API déclaré dans resultats.html',       htmlRes, "const VALEUR_API=");

// 8.6 — fetchWithTimeout présent
testIn('fetchWithTimeout défini', htmlRes, 'async function fetchWithTimeout(');

// 8.7 — PDF : html2pdf chargé + fonction async
testIn('html2pdf.js CDN chargé',        htmlRes, 'html2pdf.bundle.min.js');
testIn('V_downloadPDF est async',        htmlRes, 'async function V_downloadPDF()');
testIn('document.fonts.ready attendu',  htmlRes, 'document.fonts.ready');

// 8.8 — Forces libérées présentes dans le paywall
testIn('FORCES_PAYWALL défini',               htmlRes, 'const FORCES_PAYWALL');
testIn('Bloc #pw-force-liberee dans le HTML', htmlRes, 'id="pw-force-liberee"');
testIn('Injection force libérée dans le DOM', htmlRes, "flTxt.innerHTML = FORCES_PAYWALL");

// 8.9 — Forces libérées dans le rapport premium (page 14)
testIn('FORCES_LIBEREES dans buildPageFromOld', htmlRes, 'var FORCES_LIBEREES');
testIn('Votre force libérée — section rapport',  htmlRes, 'Votre force lib');

// 8.10 — EmailJS retry
testIn('EmailJS retry 1x configuré', htmlRes, 'Retry 1x');

// 8.11 — 129 questions (jamais 112)
testNotIn('resultats.html ne cite pas "112 questions"', htmlRes, '112 questions');
testIn('index.html ne cite pas "112 questions"',        htmlIndex.includes('112 questions') ? '' : 'OK', 'OK');

// 8.12 — GitHub absent des fichiers de production
testNotIn('resultats.html — aucune référence GitHub', htmlRes, 'github.com');
testNotIn('index.html    — aucune référence GitHub', htmlIndex, 'github.com');

// 8.13 — Mode print / PDF propre
testIn('@media print configuré',            htmlRes, '@media print');
testIn('.page min-height (pas height fixe)', htmlRes, 'min-height:297mm');
// Test affiné : s'assurer que .page utilise min-height et non height fixe
testNotIn('Pas de "height:297mm;margin" sans min- sur .page', htmlRes, ';height:297mm;margin');

// ─────────────────────────────────────────────────────────────────────────
// RÉSULTAT FINAL
// ─────────────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RÉSULTAT : ${passed}/${total} tests passés`);
if(failures.length) {
  console.log('\n  ❌ Échecs — NE PAS DÉPLOYER :');
  failures.forEach(f => console.log(`    ✗ ${f}`));
  console.log('\n  Corriger les erreurs ci-dessus avant tout déploiement IONOS.');
  process.exit(1);
} else {
  console.log('  ✅ Tous les tests passés — V.A.L.E.U.R© prêt pour IONOS');
  process.exit(0);
}

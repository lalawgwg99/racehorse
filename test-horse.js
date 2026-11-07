const fs = require('fs');
const html = fs.readFileSync('/home/hatch/workspace/horse-racing/index.html', 'utf-8');
const m = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.log('NO INLINE SCRIPT'); process.exit(1); }
const script = m[1];

class El {
  constructor() {
    this._h = {}; this._t = ''; this._html = ''; this.children = []; this.parentElement = this;
    this.style = {}; this.dataset = {}; this.value = '';
    this._cls = new Set();
    this.classList = { add: c => this._cls.add(c), remove: c => this._cls.delete(c),
      toggle: (c, f) => { if (f === undefined) { this._cls.has(c) ? this._cls.delete(c) : this._cls.add(c); } else if (f) this._cls.add(c); else this._cls.delete(c); },
      contains: c => this._cls.has(c) };
  }
  addEventListener(t, f) { (this._h[t] = this._h[t] || []).push(f); }
  appendChild(c) { this.children.push(c); return c; }
  remove() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; }
  scrollIntoView() {}
  select() {}
  focus() {}
  set textContent(v) { this._t = v; }
  get textContent() { return this._t; }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html; }
  closest() { return null; }
  getAttribute() { return null; }
}
const els = new Map();
function getEl(id) { if (!els.has(id)) els.set(id, new El()); return els.get(id); }
const store = new Map();
global.document = { getElementById: getEl, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => new El(), body: new El(),
  addEventListener: (t, f) => {}, execCommand: () => true };
global.localStorage = { getItem: k => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); } };
global.window = { addEventListener: (t, f) => {}, confirm: () => true, scrollTo: () => {} };
global.requestAnimationFrame = fn => { fn(); return 0; };
global.navigator = {};

let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL: ' + name + (extra !== undefined ? ' | ' + extra : '')); }
}

eval(script + ';globalThis.__T={createDefaultState,newHorse,genShopHorse,genEquipment,genJockey,jockeyBonus,activeJockey,effStats,equipItem,unequipItem,buyEquipment,hireJockey,breed,previewOdds,setBet,cancelBet,migrateState,doTrain,doRest,doWalk,doFeed,calcPower,calcRaceOutcome,finishRace,raceEligible,advanceWeek,buyHorse,sellHorse,refreshShop,saveState,loadState,RACES,STAT_KEYS,EQUIP_TIERS,JOCKEY_GRADES,BREED_COST,MAX_STABLE,genSpectateField,finishSpectateRace,trainFailRate,sfx,setMuted,personaOf,weakPenalty,spendLegacy,lossTip,raceCommentAt,skipRace,genPersona,redeemCode,drawGacha,genGachaItem,gachaHigh,doWork,get state(){return state},set state(v){state=v},get specField(){return specField},set specField(v){specField=v}};');
const T = globalThis.__T;
const realRandom = Math.random;
function mockRandom(v) { Math.random = () => v; }
function unmock() { Math.random = realRandom; }

// --- T1 預設狀態 ---
T.state = T.createDefaultState();
t('T1 money=100000', T.state.money === 100000, T.state.money);
t('T1 1 starter horse', T.state.horses.length === 1);
t('T1 starter age 2', T.state.horses[0].age === 2);
t('T1 starter 良血', T.state.horses[0].rarity === 'good');
t('T1 shop 3', T.state.shop.length === 3);
t('T1 active set', T.state.activeHorseId === T.state.horses[0].id);
t('T1 week 1 year 1', T.state.week === 1 && T.state.year === 1);

// --- T2 訓練 ---
mockRandom(0.5);
let h = T.state.horses[0];
const spd0 = h.stats.spd, en0 = h.energy, wk0 = T.state.week;
T.doTrain('spd');
t('T2 spd +2 (rand .5, 遞減)', h.stats.spd === spd0 + 2, spd0 + '->' + h.stats.spd);
t('T2 energy -22', h.energy === en0 - 22, h.energy);
t('T2 week +1', T.state.week === wk0 + 1, T.state.week);
// 體力不足不訓練
h.energy = 10; const wk1 = T.state.week; const spd1 = h.stats.spd;
T.doTrain('spd');
t('T2 energy<22 不訓練', h.stats.spd === spd1 && T.state.week === wk1);
unmock();

// --- T3 休息/散步/飼料 ---
mockRandom(0.5); // 鎖住隨機事件，避免每週事件干擾能量斷言
h.energy = 50; const wk2 = T.state.week;
T.doRest();
t('T3 rest +35', h.energy === 85, h.energy);
t('T3 rest week+1', T.state.week === wk2 + 1);
h.mood = 2; h.energy = 50; const wk3 = T.state.week;
T.doWalk();
t('T3 walk mood+1', h.mood === 3, h.mood);
t('T3 walk energy+12', h.energy === 62, h.energy);
unmock();
const money0 = T.state.money; h.energy = 50;
mockRandom(0.5);
T.doFeed();
t('T3 feed -800', T.state.money === money0 - 800, T.state.money);
t('T3 feed energy+25', h.energy === 75, h.energy);
unmock();

// --- T4 成長上限 ---
const common = T.newHorse({ rarity: 'common' });
common.stats.spd = 70; T.state.horses.push(common); T.state.activeHorseId = common.id;
common.energy = 100; mockRandom(0.5);
T.doTrain('spd');
t('T4 普通馬上限70不超', common.stats.spd === 70, common.stats.spd);
unmock();
const legend = T.newHorse({ rarity: 'legend' });
t('T4 傳奇上限99', legend.stats.spd <= 75);

// --- T5 戰力適性 ---
function mkHorse(stats, turf, dist, mood) {
  const x = T.newHorse({ rarity: 'legend' });
  x.stats = Object.assign({}, stats); x.turf = turf; x.dist = dist; x.mood = mood;
  return x;
}
const S = { spd: 80, sta: 80, pow: 80, gut: 80, wis: 80 };
const raceG = T.RACES[0]; // 新馬戰 草地 短
const pGrass = T.calcPower(mkHorse(S, '草', '短', 2), raceG);
const pMud = T.calcPower(mkHorse(S, '泥', '短', 2), raceG);
const pLong = T.calcPower(mkHorse(S, '草', '長', 2), raceG);
t('T5 草地馬>泥地馬(草地賽)', pGrass > pMud, pGrass + ' vs ' + pMud);
t('T5 短距離適性>長距離', pGrass > pLong, pGrass + ' vs ' + pLong);
const pMood4 = T.calcPower(mkHorse(S, '草', '短', 4), raceG);
const pMood0 = T.calcPower(mkHorse(S, '草', '短', 0), raceG);
t('T5 絕好調>極差', pMood4 > pMood0, pMood4 + ' vs ' + pMood0);

// --- T6 比賽資格 ---
T.state = T.createDefaultState();
h = T.state.horses[0]; h.energy = 100;
t('T6 新馬戰可報', T.raceEligible(h, T.RACES[0]) === null, T.raceEligible(h, T.RACES[0]));
t('T6 條件戰需1勝', T.raceEligible(h, T.RACES[1]) !== null);
t('T6 G1需5勝', T.raceEligible(h, T.RACES[5]) !== null);
h.energy = 10;
t('T6 體力不足不可報', T.raceEligible(h, T.RACES[0]) !== null);
h.energy = 100;

// --- T7 比賽結果(確定性隨機) ---
mockRandom(0.5);
const strong = mkHorse({ spd: 95, sta: 95, pow: 95, gut: 95, wis: 95 }, '草', '短', 4);
const out1 = T.calcRaceOutcome(strong, T.RACES[0]);
t('T7 強馬新馬戰第1', out1.myRank === 1, 'rank=' + out1.myRank);
t('T7 8匹參賽', out1.runners.length === 8);
const weak = mkHorse({ spd: 25, sta: 25, pow: 25, gut: 25, wis: 25 }, '泥', '長', 0);
const out2 = T.calcRaceOutcome(weak, T.RACES[5]);
t('T7 弱馬G1最後', out2.myRank === 8, 'rank=' + out2.myRank);
unmock();

// --- T8 完賽結算 ---
T.state = T.createDefaultState();
h = T.state.horses[0]; h.energy = 100;
mockRandom(0.5);
const strong2 = mkHorse({ spd: 95, sta: 95, pow: 95, gut: 95, wis: 95 }, '草', '短', 4);
strong2.name = h.name;
const out3 = T.calcRaceOutcome(strong2, T.RACES[0]);
const money1 = T.state.money, wins0 = h.wins;
T.finishRace(h, T.RACES[0], out3);
t('T8 冠軍獎金30000', T.state.money === money1 + 30000, T.state.money - money1);
t('T8 wins+1', h.wins === wins0 + 1, h.wins);
t('T8 races+1', h.races === 1, h.races);
t('T8 完賽推進一週', T.state.week === 2, T.state.week);
unmock();

// --- T9 商店買賣 ---
T.state = T.createDefaultState();
T.state.money = 1000000;
const shopH = T.state.shop[0];
const price = shopH.price;
const money2 = T.state.money;
T.buyHorse(0);
t('T9 買馬扣錢', T.state.money === money2 - price, T.state.money);
t('T9 馬房+1', T.state.horses.length === 2);
t('T9 商店-1', T.state.shop.length === 2);
t('T9 買的馬成主力', T.state.activeHorseId === T.state.horses[1].id);
T.state.money = 100;
const before = T.state.horses.length;
T.buyHorse(0);
t('T9 錢不夠買不成', T.state.horses.length === before);
T.state.money = 1000000;
t('T9 傳奇馬可能貴過10萬起手金', price <= 1000000, price);
while (T.state.horses.length < 6) { T.state.shop = [T.genShopHorse()]; T.buyHorse(0); }
t('T9 馬房滿6匹', T.state.horses.length === 6);
T.state.shop = [T.genShopHorse()];
T.buyHorse(0);
t('T9 滿了買不成', T.state.horses.length === 6);
const sold = T.state.horses[1];
const money3 = T.state.money;
T.sellHorse(sold.id);
t('T9 賣馬拿錢', T.state.money > money3, T.state.money - money3);
t('T9 賣馬-1', T.state.horses.length === 5);

// --- T10 老化與引退 ---
T.state = T.createDefaultState();
h = T.state.horses[0];
h.age = 9; h.stats.spd = 50; T.state.week = 52;
T.advanceWeek();
t('T10 跨年 year+1 week=1', T.state.year === 2 && T.state.week === 1);
t('T10 10歲引退', h.retired === true, 'age=' + h.age + ' retired=' + h.retired);
T.state = T.createDefaultState();
h = T.state.horses[0];
h.age = 6; h.stats.spd = 50; T.state.week = 52;
T.advanceWeek();
t('T10 7歲全屬性-3', h.stats.spd === 47, h.stats.spd);
t('T10 7歲還沒引退', h.retired === false);

// --- T11 存檔往返 ---
T.state = T.createDefaultState();
T.state.money = 123456;
T.saveState();
const loaded = T.loadState();
t('T11 存檔讀回 money', loaded && loaded.money === 123456, loaded && loaded.money);
t('T11 存檔讀回馬匹', loaded && loaded.horses.length === 1);

// --- T12 走查回歸 ---
T.state = T.createDefaultState();
const st = T.state.horses[0];
t('T12 起手馬草地', st.turf === '草', st.turf);
t('T12 起手馬短距離', st.dist === '短', st.dist);
const cheap = T.newHorse({ rarity: 'common' });
const cheapPrice = (function (h) { const sum = T.STAT_KEYS.reduce((a, k) => a + h.stats[k], 0); return 15000 + sum * 300; })(cheap);
t('T12 普通馬起手買得起', cheapPrice < 100000, cheapPrice);
mockRandom(0.5);
const out4 = T.calcRaceOutcome(st, T.RACES[0]);
const oppNames = out4.runners.filter(r => !r.isPlayer).map(r => r.name);
t('T12 對手名字不重複', new Set(oppNames).size === 7, oppNames.join(','));
const stStrong = Object.assign({}, st, { stats: { spd: 50, sta: 50, pow: 50, gut: 50, wis: 50 }, mood: 2 });
const out5 = T.calcRaceOutcome(stStrong, T.RACES[0]);
t('T12 起手馬體質打新馬戰能贏', out5.myRank <= 3, 'rank=' + out5.myRank);
unmock();

// --- T13 裝備 ---
T.state = T.createDefaultState();
h = T.state.horses[0];
const eq1 = T.genEquipment('saddle', 'fine');
t('T13 精良馬鞍加成總和4', eq1.bonuses.spd + eq1.bonuses.sta === 4, JSON.stringify(eq1.bonuses));
t('T13 預設有2件裝備可買', T.state.shopEquip.length === 2);
const powBefore = T.calcPower(h, T.RACES[0]);
T.state.equipment.push(eq1);
T.equipItem(h.id, eq1.id);
t('T13 裝上後背包-1', T.state.equipment.length === 0);
t('T13 裝備提升戰力', T.calcPower(h, T.RACES[0]) > powBefore, powBefore + '->' + T.calcPower(h, T.RACES[0]));
T.unequipItem(h.id, 'saddle');
t('T13 卸下回背包', T.state.equipment.length === 1 && !h.equipment.saddle);
t('T13 卸下後戰力回落', T.calcPower(h, T.RACES[0]) === powBefore);
T.state.money = 1000000;
const eqPrice = T.state.shopEquip[0].price;
T.buyEquipment(0);
t('T13 買裝備扣錢', T.state.money === 1000000 - eqPrice);
t('T13 買裝備進背包', T.state.equipment.length === 2);

// --- T14 騎師 ---
T.state = T.createDefaultState();
const j0 = T.activeJockey();
t('T14 開局有見習騎師', j0 && j0.grade === 'rookie', j0 && j0.grade);
const jb0 = T.jockeyBonus(j0);
t('T14 見習騎師速度+2', jb0.spd === 2, jb0.spd);
const elite = T.genJockey('elite');
t('T14 精英騎師比見習強', T.jockeyBonus(elite).spd > jb0.spd);
const powNoJ = T.calcPower(T.state.horses[0], T.RACES[0]);
const powWithJ = powNoJ; // 已含見習騎師
T.state.activeJockeyId = null;
const powBare = T.calcPower(T.state.horses[0], T.RACES[0]);
t('T14 有騎師比沒騎師強', powWithJ > powBare, powWithJ + ' vs ' + powBare);
T.state.activeJockeyId = j0.id;
T.state.money = 1000000;
const hireFee = T.JOCKEY_GRADES[T.state.shopJockeys[0].grade].fee;
T.hireJockey(0);
t('T14 聘用騎師扣錢', T.state.money === 1000000 - hireFee);
t('T14 聘用後成主力騎師', T.state.jockeys.length === 2);

// --- T15 配種 ---
T.state = T.createDefaultState();
const sire = T.newHorse({ rarity: 'good' });
sire.sex = '公'; sire.stats = { spd: 60, sta: 60, pow: 60, gut: 60, wis: 60 };
const dam = T.newHorse({ rarity: 'common' });
dam.sex = '母'; dam.stats = { spd: 40, sta: 40, pow: 40, gut: 40, wis: 40 };
T.state.horses.push(sire, dam);
T.state.money = 100000;
const n0 = T.state.horses.length;
mockRandom(0.5);
T.breed(sire.id, dam.id);
unmock();
t('T15 配種費30000', T.state.money === 70000, T.state.money);
t('T15 產駒+1', T.state.horses.length === n0 + 1);
const foal = T.state.horses[T.state.horses.length - 1];
t('T15 子嗣2歲', foal.age === 2);
t('T15 子嗣五圍近父母平均50', foal.stats.spd >= 47 && foal.stats.spd <= 60, foal.stats.spd);
t('T15 子嗣稀有度不低於父母較高者', ['good', 'noble', 'legend'].includes(foal.rarity), foal.rarity);
const moneyB = T.state.money;
T.breed(sire.id, sire.id);
t('T15 同馬不能配', T.state.money === moneyB && T.state.horses.length === n0 + 1);
const dam2 = T.newHorse({ rarity: 'common' });
dam2.sex = '母';
T.breed(sire.id, dam2.id);
t('T15 母馬不在馬房不能配', T.state.horses.length === n0 + 1);

// --- T16 下注 ---
T.state = T.createDefaultState();
h = T.state.horses[0]; h.energy = 100;
const odds = T.previewOdds(T.RACES[0]);
t('T16 獨贏賠率>=1.2', odds.win >= 1.2, odds.win);
t('T16 位置賠率>=1.1且低於獨贏', odds.place >= 1.1 && odds.place < odds.win, odds.place + ' vs ' + odds.win);
T.state.money = 100000;
T.setBet('maiden', 'win', 10000);
t('T16 下注扣錢', T.state.money === 90000, T.state.money);
t('T16 下注已登記', T.state.pendingBet && T.state.pendingBet.amount === 10000);
T.cancelBet();
t('T16 取消退回', T.state.money === 100000 && T.state.pendingBet === null);
T.setBet('maiden', 'win', 10000);
const betOdds = T.state.pendingBet.winOdds;
mockRandom(0.5);
const strong3 = Object.assign({}, h, { stats: { spd: 95, sta: 95, pow: 95, gut: 95, wis: 95 }, mood: 4 });
const out6 = T.calcRaceOutcome(strong3, T.RACES[0]);
T.finishRace(h, T.RACES[0], out6);
unmock();
t('T16 獨贏中獎派彩', T.state.money === 90000 + 30000 + Math.round(10000 * betOdds), T.state.money + ' expect ' + (90000 + 30000 + Math.round(10000 * betOdds)));
t('T16 結算後下注清空', T.state.pendingBet === null);
T.state.money = 100000;
T.setBet('maiden', 'place', 10000);
const placeOdds = T.state.pendingBet.placeOdds;
const fakeOut = { runners: Array.from({ length: 8 }, (_, i) => ({ rank: i + 1, name: i === 1 ? h.name : '對手' + i, isPlayer: i === 1 })), myRank: 2 };
T.finishRace(h, T.RACES[0], fakeOut);
t('T16 位置第二名派彩', T.state.money === 90000 + 12000 + Math.round(10000 * placeOdds), T.state.money + ' expect ' + (90000 + 12000 + Math.round(10000 * placeOdds)));

// --- T17b 賠率穩定 ---
T.state = T.createDefaultState();
h = T.state.horses[0]; h.energy = 100;
const o1 = T.previewOdds(T.RACES[0]);
const o2 = T.previewOdds(T.RACES[0]);
t('T17b 賠率兩次看一樣', o1.win === o2.win && o1.place === o2.place, o1.win + '/' + o2.win);
T.state.money = 100000;
T.setBet('maiden', 'win', 10000);
t('T17b 下注鎖定賠率＝顯示賠率', T.state.pendingBet.winOdds === o1.win, T.state.pendingBet.winOdds + ' vs ' + o1.win);

// --- T17 舊存檔遷移 ---
T.state = T.createDefaultState();
delete T.state.equipment; delete T.state.shopEquip; delete T.state.jockeys; delete T.state.shopJockeys; delete T.state.activeJockeyId; delete T.state.pendingBet;
delete T.state.horses[0].equipment;
T.migrateState();
t('T17 遷移補裝備欄', Array.isArray(T.state.equipment));
t('T17 遷移補裝備市場', T.state.shopEquip.length === 2);
t('T17 遷移補見習騎師', T.state.jockeys.length === 1 && T.state.jockeys[0].grade === 'rookie');
t('T17 遷移補馬匹裝備欄', T.state.horses[0].equipment && typeof T.state.horses[0].equipment === 'object');

// --- T19 觀賽下注 ---
mockRandom(0.5);
const spec = T.genSpectateField(T.RACES[0]);
t('T19 觀賽 8 匹', spec.runners.length === 8);
t('T19 觀賽名字不重複', new Set(spec.runners.map(r => r.name)).size === 8);
t('T19 獨贏賠率 1.2~12', spec.runners.every(r => r.winOdds >= 1.2 && r.winOdds <= 12));
t('T19 位置賠率 <= 獨贏', spec.runners.every(r => r.placeOdds <= r.winOdds));
unmock();
const specRunners = spec.runners.map((r, i) => ({ name: r.name, power: 50, isPlayer: false, eff: 50 - i, rank: i + 1 }));
T.specField = { raceId: 'g1', runners: spec.runners.map(r => ({ name: r.name, winOdds: 2, placeOdds: 1.2 })) };
T.state.money = 95000; let wkS = T.state.week;
mockRandom(0.5);
T.finishSpectateRace(T.RACES[5], { runners: specRunners }, 0, 'win', 5000);
t('T19 押中冠軍派彩', T.state.money === 105000, T.state.money);
t('T19 觀賽耗一週', T.state.week === wkS + 1, T.state.week);
unmock();
T.specField = { raceId: 'g1', runners: spec.runners.map(r => ({ name: r.name, winOdds: 2, placeOdds: 1.2 })) };
T.state.money = 95000; wkS = T.state.week;
mockRandom(0.5);
T.finishSpectateRace(T.RACES[5], { runners: specRunners }, 4, 'win', 5000);
t('T19 押第5名沒中', T.state.money === 95000, T.state.money);
t('T19 沒中也耗一週', T.state.week === wkS + 1, T.state.week);
unmock();

// --- T20 訓練改版：越接近上限越難練、連續同項打折 ---
mockRandom(0.5);
const th = T.newHorse({ rarity: 'good' });
th.stats.spd = 20; th.stats.sta = 72; th.energy = 100; th.mood = 2; th.lastTrain = undefined;
T.state.horses.push(th); T.state.activeHorseId = th.id;
T.doTrain('spd');
t('T20 低數值練 +3', th.stats.spd === 23, th.stats.spd);
T.doTrain('spd');
t('T20 連續同項打折 +2', th.stats.spd === 25, th.stats.spd);
t('T20 體力 -22 x2', th.energy === 56, th.energy);
T.doTrain('sta');
t('T20 高數值練 +1', th.stats.sta === 73, th.stats.sta);
t('T20 高數值失敗率近兩成', T.trainFailRate(th, 'sta') > 0.18 && T.trainFailRate(th, 'sta') <= 0.20, T.trainFailRate(th, 'sta'));
unmock();

// --- T21 音效不炸 ---
let sfxOk = true;
try { T.sfx('tap'); T.sfx('win'); T.sfx('count'); T.sfx('go'); T.setMuted(true); T.setMuted(false); } catch (e) { sfxOk = false; }
t('T21 音效呼叫不報錯', sfxOk);

// --- T22 騎師羈絆彩圈 ---
const jbLow = T.jockeyBonus({ grade: 'rookie', level: 1, bond: 0 });
const jbHigh = T.jockeyBonus({ grade: 'rookie', level: 1, bond: 80 });
t('T22 羈絆80加成翻倍', jbHigh.spd === jbLow.spd * 2, jbLow.spd + '->' + jbHigh.spd);
t('T22 羈絆79不翻倍', T.jockeyBonus({ grade: 'rookie', level: 1, bond: 79 }).spd === jbLow.spd);

// --- T23 血統點 ---
T.state = T.createDefaultState();
T.state.legacyPoints = 0;
const old1 = T.state.horses[0];
old1.age = 9; old1.wins = 6; old1.g1wins = 1; old1.retired = false;
T.state.week = 52;
T.advanceWeek();
t('T23 引退給3血統點', T.state.legacyPoints === 3, T.state.legacyPoints);
t('T23 馬已引退', old1.retired === true);
const nh = T.newHorse({ rarity: 'good' });
nh.stats.spd = 40; T.state.horses.push(nh); T.state.activeHorseId = nh.id;
T.spendLegacy('spd');
t('T23 血統點-1換速度+5', T.state.legacyPoints === 2 && nh.stats.spd === 45, T.state.legacyPoints + '/' + nh.stats.spd);

// --- T24 人設弱點 ---
const ph = T.newHorse({ rarity: 'good' });
ph.stats = { spd: 50, sta: 50, pow: 50, gut: 50, wis: 50 };
ph.turf = '草'; ph.dist = '短'; ph.mood = 2; ph.energy = 100; ph.equipment = {};
ph.persona = '萬年老三';
t('T24 大賽弱點G1扣6', T.weakPenalty(ph, T.RACES[5]) === 6);
t('T24 大賽弱點新馬戰不扣', T.weakPenalty(ph, T.RACES[0]) === 0);
ph.persona = null;
const pNoWeak = T.calcPower(ph, T.RACES[5]);
ph.persona = '萬年老三';
const pWeak = T.calcPower(ph, T.RACES[5]);
t('T24 戰力差正好6', Math.abs((pNoWeak - pWeak) - 6) < 0.001, pNoWeak + ' vs ' + pWeak);

// --- T25 失敗原因 ---
const tip1 = T.lossTip({ mood: 1, stats: { spd: 50, sta: 50, pow: 50, gut: 50, wis: 50 } }, T.RACES[0], 8);
t('T25 心情差先講心情', tip1.indexOf('心情') >= 0, tip1);
const tip2 = T.lossTip({ mood: 4, stats: { spd: 30, sta: 60, pow: 50, gut: 50, wis: 50 } }, T.RACES[0], 8);
t('T25 短距離點名速度', tip2.indexOf('速度') >= 0, tip2);

// --- T26 實況文案＋跳過 ---
t('T26 開場實況', T.raceCommentAt(0, 'A').indexOf('閘門') >= 0);
t('T26 中段實況', T.raceCommentAt(0.4, 'A').indexOf('中段') >= 0);
t('T26 最後直線藏名次', T.raceCommentAt(0.8, 'A').indexOf('藏起來') >= 0);
let skipOk = true;
try { T.skipRace(); } catch (e) { skipOk = false; }
t('T26 沒比賽時跳過不報錯', skipOk);

// --- T27 引退馬可以配種 ---
T.state = T.createDefaultState();
T.state.money = 100000;
const sire27 = T.state.horses[0];
sire27.sex = '公'; sire27.retired = true; sire27.age = 10;
const dam27 = T.newHorse({ rarity: 'good' });
dam27.sex = '母'; dam27.age = 3; T.state.horses.push(dam27);
const nBefore = T.state.horses.length;
T.breed(sire27.id, dam27.id);
t('T27 引退公馬能配種', T.state.horses.length === nBefore + 1, T.state.horses.length);

// --- T28 兌換碼 ---
T.state = T.createDefaultState();
T.state.money = 100000;
t('T28 vip9988領999998', T.redeemCode('vip9988') === 'ok' && T.state.money === 100000 + 999998, T.state.money);
t('T28 重複領不到', T.redeemCode('vip9988') === 'used' && T.state.money === 100000 + 999998, T.state.money);
t('T28 錯碼不給', T.redeemCode('nope123') === 'invalid' && T.state.money === 100000 + 999998);
T.state = T.createDefaultState();
T.state.money = 100000;
t('T28 大寫也認', T.redeemCode('VIP9988') === 'ok' && T.state.money === 100000 + 999998, T.state.money);

// --- T29 抽卡單抽 ---
T.state = T.createDefaultState();
T.state.money = 100000;
mockRandom(0.5);
const r1 = T.drawGacha(1);
t('T29 首次單抽免費', T.state.money === 100000, T.state.money);
t('T29 單抽出1個', r1 && r1.length === 1, r1 && r1.length);
t('T29 首次免費已用', T.state.gachaFreeUsed === true);
const r2 = T.drawGacha(1);
t('T29 第二次扣10000', T.state.money === 90000, T.state.money);
unmock();

// --- T30 十連抽保底 ---
T.state = T.createDefaultState();
T.state.money = 1000000;
mockRandom(0.1);
const r10 = T.drawGacha(10);
t('T30 十連出10個', r10 && r10.length === 10, r10 && r10.length);
t('T30 十連必有高稀有', r10.some(r => r.kind === 'horse' && (r.rarity === 'noble' || r.rarity === 'legend')));
t('T30 十連扣錢後有找', T.state.money > 910000, T.state.money);
t('T30 馬房不超過6匹', T.state.horses.length === 6, T.state.horses.length);
unmock();

// --- T31 馬房滿了自動出售 ---
T.state = T.createDefaultState();
T.state.money = 1000000;
while (T.state.horses.length < 6) T.state.horses.push(T.newHorse({ rarity: 'common' }));
mockRandom(0.1);
const mBefore = T.state.money;
const rF = T.drawGacha(10);
t('T31 滿房馬不增加', T.state.horses.length === 6, T.state.horses.length);
t('T31 滿房抽到的馬全賣掉換金', rF.every(r => r.kind !== 'horse' || r.kept === false) && T.state.money > mBefore - 90000, T.state.money);
unmock();

// --- T32 打工賺錢 ---
T.state = T.createDefaultState();
T.state.money = 0;
h = T.state.horses[0]; h.energy = 50;
mockRandom(0.5);
T.doWork();
t('T32 打工+10000', T.state.money === 10000, T.state.money);
t('T32 打工體力+15', h.energy === 65, h.energy);
unmock();
T.state.horses = []; T.state.activeHorseId = null; T.state.money = 0;
mockRandom(0.5);
let workOk = true;
try { T.doWork(); } catch (e) { workOk = false; }
t('T32 沒馬也能打工', workOk && T.state.money === 10000, T.state.money);
unmock();

// --- T33 破產紓困金 ---
T.state = T.createDefaultState();
T.state.money = 5000; T.state.week = 1;
T.advanceWeek();
t('T33 金低於10000補助5000', T.state.money === 10000, T.state.money);
T.state.money = 10000; T.state.week = 1;
T.advanceWeek();
t('T33 金夠不補助', T.state.money === 10000, T.state.money);
T.state.money = 0; T.state.week = 1;
T.advanceWeek();
t('T33 歸零也補助', T.state.money === 5000, T.state.money);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

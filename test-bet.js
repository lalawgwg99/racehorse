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

eval(script + ';globalThis.__T={createDefaultState,migrateState,migratedMoney,saveState,loadState,formBonus,horsePower,calcOdds,comboOdds,payoutFor,genDayRaces,currentRace,todayStats,setBetType,setBetAmount,togglePick,betOddsFor,placeBet,doWork,checkRelief,finishRace,nextRace,nextDay,showDaySummary,raceCommentAt,renderHeader,renderSchedule,renderBetSheet,renderRecords,renderAll,switchView,HORSES,HORSE_MAP,RACE_SCHEDULE,BET_TYPES,BET_AMOUNTS,COATS,SAVE_KEY,OLD_SAVE_KEY,$,get state(){return state},set state(v){state=v},get betDraft(){return betDraft},set betDraft(v){betDraft=v},get racing(){return racing},set racing(v){racing=v}};');
const T = globalThis.__T;
const realRandom = Math.random;
function mockRandom(v) { Math.random = () => v; }
function unmock() { Math.random = realRandom; }
function freshState(money) { T.state = T.createDefaultState(money || 100000); T.betDraft = { type: 'win', picks: [], amount: 10000 }; T.racing = false; }
function fakeOutcome(race, effByHid) {
  return { runners: race.runners.map(r => ({ hid: r.hid, name: T.HORSE_MAP[r.hid].name, coat: T.HORSE_MAP[r.hid].coat, eff: effByHid ? (effByHid[r.hid] || r.power) : r.power, isPicked: false })) };
}

// --- B1 預設狀態 ---
freshState();
t('B1 money=100000', T.state.money === 100000, T.state.money);
t('B1 day=1', T.state.day === 1);
t('B1 races empty', T.state.races.length === 0);
t('B1 stats zeros', T.state.stats.bets === 0 && T.state.stats.wagered === 0 && T.state.stats.bestStreak === 0);
t('B1 logs 1', T.state.logs.length === 1);

// --- B2 舊存檔本金遷移 ---
store.set(T.OLD_SAVE_KEY, JSON.stringify({ money: 5786536 }));
t('B2 舊存檔讀到錢', T.migratedMoney() === 5786536, T.migratedMoney());
store.delete(T.OLD_SAVE_KEY);
t('B2 無舊存檔=0', T.migratedMoney() === 0, T.migratedMoney());
store.set(T.OLD_SAVE_KEY, 'not json');
t('B2 舊存檔損壞=0', T.migratedMoney() === 0, T.migratedMoney());
store.delete(T.OLD_SAVE_KEY);

// --- B3 當日賽程生成 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
t('B3 每天6場', T.state.races.length === 6, T.state.races.length);
t('B3 場名照表', T.state.races[0].name === '新馬戰' && T.state.races[5].name === 'G1・天駒大賽');
t('B3 每場8匹', T.state.races.every(r => r.runners.length === 8));
t('B3 場內無重複馬', T.state.races.every(r => new Set(r.runners.map(x => x.hid)).size === 8));
t('B3 賠率都>0', T.state.races.every(r => r.runners.every(x => x.winOdds > 0 && x.placeOdds > 0)));
t('B3 戰力都>0', T.state.races.every(r => r.runners.every(x => x.power > 0)));
t('B3 未跑完', T.state.races.every(r => !r.done && r.bet === null));

// --- B4 戰力：場地距離適性 ---
freshState();
const h01 = T.HORSE_MAP['h01']; // 草・長
const pwFit = T.horsePower(h01, { turf: '草', distType: '長' });
const pwNoFit = T.horsePower(h01, { turf: '泥', distType: '短' });
t('B4 適性高戰力高', pwFit > pwNoFit, pwFit + ' vs ' + pwNoFit);
t('B4 適性加成約1.49倍', Math.abs(pwFit / pwNoFit - (1.1 * 1.1) / (0.9 * 0.9)) < 0.05, (pwFit / pwNoFit).toFixed(3));

// --- B5 近況加成 ---
freshState();
t('B5 無近況=0', T.formBonus('h01') === 0);
T.state.horseForm['h01'] = [1, 1, 1];
t('B5 三連勝+4.5', T.formBonus('h01') === 4.5, T.formBonus('h01'));
T.state.horseForm['h01'] = [8, 8, 8];
t('B5 三連敗-4.5', T.formBonus('h01') === -4.5, T.formBonus('h01'));
T.state.horseForm['h01'] = [1, 4, 7];
t('B5 混合近況=0', T.formBonus('h01') === 0, T.formBonus('h01'));

// --- B6 賠率：強馬賠率低 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const r0 = T.state.races[0];
const sortedByPower = r0.runners.slice().sort((a, b) => b.power - a.power);
t('B6 最強馬賠率最低', sortedByPower[0].winOdds <= sortedByPower[sortedByPower.length - 1].winOdds, sortedByPower[0].winOdds + ' vs ' + sortedByPower[sortedByPower.length - 1].winOdds);
t('B6 獨贏賠率在區間內', r0.runners.every(x => x.winOdds >= 1.2 && x.winOdds <= 30));
t('B6 位置賠率=獨贏x0.4下限1.1', r0.runners.every(x => Math.abs(x.placeOdds - Math.max(1.1, Math.round(x.winOdds * 0.4 * 10) / 10)) < 0.01));
t('B6 賠率隨戰力單調', r0.runners.slice().sort((a, b) => b.power - a.power).every((x, i, arr) => i === 0 || x.winOdds >= arr[i - 1].winOdds));

// --- B7-B10 派彩 ---
const ranks7 = ['h01', 'h02', 'h03', 'h04', 'h05', 'h06', 'h07', 'h08'];
t('B7 獨贏中', T.payoutFor({ type: 'win', picks: ['h01'], amount: 10000, odds: 3.4 }, ranks7) === 34000);
t('B7 獨贏不中', T.payoutFor({ type: 'win', picks: ['h02'], amount: 10000, odds: 5.0 }, ranks7) === 0);
t('B8 位置第二中', T.payoutFor({ type: 'place', picks: ['h02'], amount: 5000, odds: 1.8 }, ranks7) === 9000);
t('B8 位置第三中', T.payoutFor({ type: 'place', picks: ['h03'], amount: 5000, odds: 2.2 }, ranks7) === 11000);
t('B8 位置第四不中', T.payoutFor({ type: 'place', picks: ['h04'], amount: 5000, odds: 2.0 }, ranks7) === 0);
t('B9 連贏順序不限中', T.payoutFor({ type: 'quinella', picks: ['h02', 'h01'], amount: 10000, odds: 4.5 }, ranks7) === 45000);
t('B9 連贏一匹在外不中', T.payoutFor({ type: 'quinella', picks: ['h01', 'h04'], amount: 10000, odds: 4.5 }, ranks7) === 0);
t('B10 三重彩順序對中', T.payoutFor({ type: 'trifecta', picks: ['h01', 'h02', 'h03'], amount: 1000, odds: 120 }, ranks7) === 120000);
t('B10 三重彩順序錯不中', T.payoutFor({ type: 'trifecta', picks: ['h02', 'h01', 'h03'], amount: 1000, odds: 120 }, ranks7) === 0);

// --- B11 組合賠率 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race11 = T.state.races[0];
const a = race11.runners[0], b = race11.runners[1], c = race11.runners[2];
const qOdds = T.comboOdds('quinella', [a.hid, b.hid], race11);
const tOdds = T.comboOdds('trifecta', [a.hid, b.hid, c.hid], race11);
t('B11 連贏賠率公式', Math.abs(qOdds - Math.round(Math.max(2, Math.min(60, a.winOdds * b.winOdds / 8)) * 10) / 10) < 0.01, qOdds);
t('B11 三重彩賠率公式', Math.abs(tOdds - Math.round(Math.max(10, Math.min(300, a.winOdds * b.winOdds * c.winOdds / 40)) * 10) / 10) < 0.01, tOdds);
t('B11 三重彩比連贏高', tOdds > qOdds, tOdds + ' vs ' + qOdds);

// --- B12-B13 下注 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race12 = T.state.races[0];
const fav = race12.runners.slice().sort((x, y) => y.power - x.power)[0];
T.betDraft = { type: 'win', picks: [fav.hid], amount: 10000 };
T.placeBet();
t('B12 下注扣錢', T.state.money === 90000, T.state.money);
t('B12 注單寫入', race12.bet && race12.bet.type === 'win' && race12.bet.picks[0] === fav.hid);
t('B12 統計+1', T.state.stats.bets === 1 && T.state.stats.wagered === 10000);
T.renderBetSheet();
t('B12 下注後顯示已下注', T.$('bet-sheet').innerHTML.includes('已下注'), T.$('bet-sheet').innerHTML.slice(0, 200));
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
T.betDraft = { type: 'win', picks: [], amount: 10000 };
T.placeBet();
t('B13 沒選馬不下注', T.state.races[0].bet === null && T.state.money === 100000);
T.state.money = 500;
T.betDraft = { type: 'win', picks: [T.state.races[0].runners[0].hid], amount: 10000 };
T.placeBet();
t('B13 錢不夠不下注', T.state.races[0].bet === null && T.state.money === 500);

// --- B14 選馬邏輯 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const ids14 = T.state.races[0].runners.slice(0, 4).map(r => r.hid);
T.betDraft = { type: 'win', picks: [], amount: 10000 };
T.togglePick(ids14[0]);
T.togglePick(ids14[1]);
t('B14 獨贏換馬', T.betDraft.picks.length === 1 && T.betDraft.picks[0] === ids14[1]);
T.togglePick(ids14[1]);
t('B14 點已選的取消', T.betDraft.picks.length === 0);
T.setBetType('trifecta');
T.togglePick(ids14[0]); T.togglePick(ids14[1]); T.togglePick(ids14[2]);
t('B14 三重彩選3匹有順序', T.betDraft.picks.join() === [ids14[0], ids14[1], ids14[2]].join());
T.togglePick(ids14[3]);
t('B14 三重彩第4匹頂掉第1匹', T.betDraft.picks.join() === [ids14[1], ids14[2], ids14[3]].join());
T.setBetType('win');
t('B14 換玩法清空', T.betDraft.picks.length === 0);

// --- B15-B17 比賽結算 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race15 = T.state.races[0];
const fav15 = race15.runners.slice().sort((x, y) => y.power - x.power)[0];
T.betDraft = { type: 'win', picks: [fav15.hid], amount: 10000 };
T.placeBet();
const moneyBefore = T.state.money;
T.finishRace(race15, fakeOutcome(race15)); // eff=power，最強馬冠軍
t('B15 押中最強馬中獎', race15.bet.won === Math.round(10000 * fav15.winOdds), race15.bet.won);
t('B15 錢回來', T.state.money === moneyBefore + race15.bet.won, T.state.money);
t('B15 命中+1連勝+1', T.state.stats.hits === 1 && T.state.stats.streak === 1);
t('B15 冠軍近況=1', T.state.horseForm[fav15.hid][0] === 1);
t('B15 冠軍勝場+1', T.state.horseStats[fav15.hid].wins === 1);
t('B15 比賽標記完成', race15.done && race15.ranks[0] === fav15.hid);
T.renderBetSheet();
t('B15 跑完顯示已跑完', T.$('bet-sheet').innerHTML.includes('已跑完'));
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race16 = T.state.races[0];
const weak16 = race16.runners.slice().sort((x, y) => x.power - y.power)[0];
T.betDraft = { type: 'win', picks: [weak16.hid], amount: 10000 };
T.placeBet();
T.finishRace(race16, fakeOutcome(race16)); // 最強馬冠軍，弱馬不中
t('B16 押弱馬不中', race16.bet.won === 0);
t('B16 不中連勝歸零', T.state.stats.streak === 0 && T.state.stats.hits === 0);
t('B16 錢沒回來', T.state.money === 90000, T.state.money);
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race17 = T.state.races[0];
T.finishRace(race17, fakeOutcome(race17));
t('B17 不下注錢不變', T.state.money === 100000 && T.state.stats.bets === 0);
t('B17 不下注也更新近況', T.state.horseForm[race17.ranks[0]].length === 1);

// --- B18-B19 流程 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
T.betDraft = { type: 'win', picks: ['h01'], amount: 5000 };
T.nextRace();
t('B18 下一場raceIdx+1', T.state.raceIdx === 1);
t('B18 下一場注單清空', T.betDraft.picks.length === 0);
T.state.raceIdx = 5;
T.nextDay();
t('B19 下一天day+1', T.state.day === 2 && T.state.raceIdx === 0);
t('B19 下一天6場新賽程', T.state.races.length === 6 && T.state.races.every(r => !r.done));

// --- B20-B21 打工與救濟 ---
freshState();
T.doWork();
t('B20 打工+10000', T.state.money === 110000, T.state.money);
T.doWork();
t('B20 每天只打工一次', T.state.money === 110000, T.state.money);
T.nextDay();
T.doWork();
t('B20 隔天可再打工', T.state.money === 120000, T.state.money);
freshState();
T.state.money = 500;
T.checkRelief();
t('B21 破產發救濟5000', T.state.money === 5500, T.state.money);
T.checkRelief();
t('B21 救濟每天一次', T.state.money === 5500, T.state.money);

// --- B22 今日統計 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
const race22 = T.state.races[0];
const fav22 = race22.runners.slice().sort((x, y) => y.power - x.power)[0];
T.betDraft = { type: 'win', picks: [fav22.hid], amount: 10000 };
T.placeBet();
T.finishRace(race22, fakeOutcome(race22));
const ts22 = T.todayStats();
t('B22 今日統計', ts22.bets === 1 && ts22.hits === 1 && ts22.wagered === 10000 && ts22.returned === race22.bet.won && ts22.pnl === race22.bet.won - 10000, JSON.stringify(ts22));

// --- B23-B25 渲染 ---
freshState();
mockRandom(0.5);
T.genDayRaces();
unmock();
T.renderAll();
t('B23 下注頁8匹馬', (T.$('bet-sheet').innerHTML.match(/獨贏 [0-9.]+ 倍/g) || []).length === 8, (T.$('bet-sheet').innerHTML.match(/獨贏 [0-9.]+ 倍/g) || []).length);
t('B23 四種玩法按鈕', ['獨贏', '位置', '連贏', '三重彩'].every(x => T.$('bet-sheet').innerHTML.includes(x)));
t('B23 五種注額', [1000, 5000, 10000, 50000, 100000].every(a => T.$('bet-sheet').innerHTML.includes(a.toLocaleString('en-US'))));
t('B24 賽程6場', (T.$('schedule-strip').innerHTML.match(/未開賽|進行中/g) || []).length === 6);
T.renderRecords();
t('B25 紀錄有6格生涯數據', (T.$('career-stats').innerHTML.match(/bg-\[#f4ede0\]/g) || []).length === 6);
t('B25 圖鑑24匹', (T.$('collection-grid').innerHTML.match(/還沒出賽/g) || []).length === 24);
T.switchView('records');
t('B26 切到紀錄頁', T.$('view-records').classList.contains('hidden') === false && T.$('view-race').classList.contains('hidden') === true);
T.switchView('race');
t('B26 切回賽程頁', T.$('view-race').classList.contains('hidden') === false);

// --- B27-B28 原始碼檢查 ---
t('B27 標題是天駒賽馬', html.includes('天駒賽馬') && html.includes('<title>天駒賽馬｜下注競猜</title>'));
t('B27 舊育成系統已移除', !html.includes('育成') && !html.includes('配種') && !html.includes('抽卡') && !html.includes('馬房'));
t('B27 比賽動畫修正保留', html.includes('void tok.offsetWidth'));
t('B27 救濟與打工在', html.includes('破產救濟金') && html.includes('打工'));
t('B28 賽況文字', T.raceCommentAt(0, 'A') === '閘門開了！各馬衝出起跑線！' && T.raceCommentAt(0.65, 'A').includes('彎道') && T.raceCommentAt(0.8, 'A').includes('最後直線'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');

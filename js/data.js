/* ==== 面包与角色数据 ==== */
const BREADS = [
  { id: 'b_croissant', name: '牛角面包', cost: 0 },
  { id: 'b_star',      name: '星星面包', cost: 0 },
  { id: 'b_snail',     name: '蜗牛卷',   cost: 0 },
  { id: 'b_dino',      name: '恐龙面包', cost: 0 },
  { id: 'b_flower',    name: '花朵面包', cost: 5 },
  { id: 'b_toast',     name: '吐司',     cost: 5 },
  { id: 'b_baguette',  name: '长法棍',   cost: 8 },
  { id: 'b_crow',      name: '乌鸦面包', cost: 8 },
  { id: 'b_penguin',   name: '企鹅面包', cost: 10 },
  { id: 'b_hippo',     name: '河马面包', cost: 10 },
  { id: 'b_turtle',    name: '乌龟面包', cost: 12 },
  { id: 'b_plane',     name: '飞机面包', cost: 15 },
];

const CUSTOMERS = ['cust1', 'cust2', 'cust3', 'choco', 'apple', 'lemon', 'mochi'];

const S = id => `assets/sprites/${id}.png`;
const BGI = id => `assets/bg/${id}.jpg`;

/* 存档 */
const SAVE_KEY = 'crowBakery.v1';
function loadSave() {
  try { return Object.assign({ coins: 0, molds: ['b_croissant','b_star','b_snail','b_dino'], found: [], inv: {}, introDone: false, served: 0 }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch { return { coins: 0, molds: ['b_croissant','b_star','b_snail','b_dino'], found: [], inv: {}, introDone: false, served: 0 }; }
}
function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
let G = loadSave();

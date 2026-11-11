// Easter eggs: XD (心動), TapTap and Cindy hidden around Golden Dragon Street.
// This file is content only, so the wording is easy to change:
// - the shops are assigned to units in level.js,
// - the chalkboards on the pavement are placed in dressing.js,
// - menus and posters are painted by signs.menu / signs.eggPoster.
// Anything painted from here uses its own random seed, so editing it never reshuffles the street.

// Shop identities in the same shape as SHOPS: [name, trade, english, look].
// look overrides the colours the sign would otherwise pick; mixed draws Latin letters in the
// condensed display face and the Chinese in the sign serif.
export const EGG_SHOPS = {
  xd: ["心動", "冰室", "XD CAFE", { color: "#ff5c9a", trim: "#ffd23a" }],
  taptap: [
    "TapTap",
    "遊戲機中心",
    "TAPTAP GAME CENTRE",
    { color: "#2ee6d6", trim: "#f2fffd", mixed: true },
  ],
  cindy: [
    "Cindy",
    "士多",
    "CINDY 24H STORE",
    { bg: "#173a36", fg: "#ffe3a6", mixed: true },
  ],
};
// The arcade's blade sign is a lightbox: dark teal letters on a pale face.
export const TAPTAP_BLADE = { color: "#0b8f86", face: "#eafffb" };

// Menus. items: [name, price, tag?]; ["#", text] is a section heading.
export const MENUS = {
  // 心動冰室 chalkboard, side facing the street
  xdChalk: {
    style: "chalk",
    seed: 101,
    w: 0.69,
    h: 1.02,
    accent: "#ff9ec7",
    title: "心動冰室",
    sub: "XD CAFE · 茶餐廳",
    items: [
      ["心動奶茶", "$18", "招牌"],
      ["火炬鴛鴦", "$20"],
      ["麥芬餐蛋治", "$28"],
      ["香腸派對炒麵", "$34"],
      ["鈴蘭蜜檸茶", "$24"],
      ["小鎮西多士", "$26"],
      ["波利布甸", "$18", "新"],
      ["Cindy 特飲", "時價"],
    ],
    foot: "TapTap 會員 九折",
  },
  // the other side of the same board, facing the café
  xdChalkBack: {
    style: "chalk",
    seed: 102,
    w: 0.69,
    h: 1.02,
    accent: "#ffe28a",
    title: "下午茶",
    sub: "2:30 – 5:30 PM",
    items: [
      ["#", "A 餐"],
      ["心動菠蘿油 + 熱飲", "$26"],
      ["#", "B 餐"],
      ["TapTap 雙蛋撈丁", "$30"],
      ["#", "C 餐"],
      ["Cindy 推介", "問店員"],
    ],
    foot: "凍飲另加 $3",
  },
  // paper menu taped inside the 心動冰室 window
  xdWindow: {
    style: "paper",
    seed: 103,
    w: 0.56,
    h: 0.8,
    accent: "#b3140f",
    title: "心動冰室",
    sub: "MENU",
    items: [
      ["#", "早餐 7:00–11:00"],
      ["麥芬餐蛋治 + 奶茶", "$32"],
      ["火炬豬扒包", "$30"],
      ["#", "常餐"],
      ["香腸派對炒麵", "$34"],
      ["小鎮咖喱飯", "$38", "推介"],
      ["#", "飲品"],
      ["心動奶茶", "$18"],
      ["TapTap 檸樂", "$18"],
    ],
    foot: "Cindy 話：今日飲心動奶茶",
  },
  // chalkboard outside 金龍酒家, side facing the street
  cindyChalk: {
    style: "chalk",
    seed: 104,
    w: 0.69,
    h: 1.02,
    accent: "#ffe28a",
    title: "今日推介",
    sub: "CINDY RECOMMENDS",
    items: [
      ["#", "Cindy 話你知"],
      ["蜜汁叉燒飯", "$42"],
      ["乾炒牛河", "$48"],
      ["鹹魚雞粒炒飯", "$52"],
      ["#", "唔知食咩？"],
      ["問 Cindy", "免費", "AI"],
    ],
    foot: "有問必答 · 24 小時",
  },
  // its back, facing the TapTap arcade along the pavement
  taptapChalk: {
    style: "chalk",
    seed: 105,
    w: 0.69,
    h: 1.02,
    accent: "#8ff0e6",
    title: "TapTap 熱玩榜",
    sub: "發現好遊戲",
    items: [
      ["1. 心動小鎮", "熱玩"],
      ["2. 出發吧麥芬", "熱玩"],
      ["3. 火炬之光：無限", "必玩"],
      ["4. 香腸派對", "必玩"],
      ["5. 鈴蘭之劍", "推介"],
      ["6. 仙境傳說", "經典"],
    ],
    foot: "遊戲機中心 · 隔籬",
  },
};

// Posters pinned to shutters: { kind, at (metres from the left of the opening), y }.
export const POSTERS = {
  taptap: [
    { kind: "taptap", at: 0.35, y: 1.25 },
    { kind: "xd", at: 1.05, y: 1.3 },
  ],
  cindy: [{ kind: "cindy", at: 0.3, y: 1.5 }],
};

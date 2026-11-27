
// @ts-check

import { additionalOwnerArtworks } from "./owner-artwork-additions.js";



import { normalizeArtworkCategory } from "./drawing-settings-data.js";



import { compareArtworkNewest } from "./artwork-order.js";



import {

  AUCTION_PRICE_LIMIT,

  getAuctionView,

  isReadableAuctionPrice,

  isValidArtworkDescription,

  isValidBuyNowPrice,

  normalizeAuctionState,

} from "./auction-policy.js";



export { AUCTION_PRICE_LIMIT, getAuctionView };



/** @typedef {import("./drawing-settings-data.js").DrawingDuration} DrawingDuration */
/** @typedef {{
  id: string;
  title: string;
  artist: string;
  price: number;
  image: string;
  category: string;
  prompt: string;
  createdAt: string;
  bids: number;
  buyNowPrice?: number;
  description?: string;
  drawnAt?: string;
  sold?: boolean;
  status?: string;
  soldAt?: string;
  soldReason?: string;
  previousPrice?: number;
  cancelledAt?: string;
  drawingDurationSeconds?: DrawingDuration;
  drawingDurationSource?: "assigned";
}} UserArtwork */
/** @typedef {import("./auction-policy.js").AuctionRecord} AuctionRecord */
/** @typedef {Record<string, AuctionRecord>} AuctionState */
// One owner-requested random split, frozen on 2026-10-02. This is a display
// classification, not a claim about the originals' actual drawing duration.
const existingDurationCutoff = Date.parse("2026-10-02T02:19:34Z");



const existingDurationSplit = {

  "collection-20260930-07-goriko": 30,



  "collection-20260930-05-rose": 30,



  "collection-20260930-10-my-artwork": 30,



  "collection-20260930-09-curry": 30,



  "collection-20260930-03-stitch": 30,



  "collection-20260930-01-sandwich": 60,



  "collection-20260930-06-top": 60,



  "collection-20260930-02-enoden": 60,



  "collection-20260930-04-mushroom": 60,



  "collection-20260930-08-camel": 60,

};



function assignExistingDuration(art) {

  if (art.cancelledAt) return art;



  const preset = Object.prototype.hasOwnProperty.call(

    existingDurationSplit,



    art.id,

  )

    ? existingDurationSplit[art.id]

    : undefined;



  const createdAt = Date.parse(art.createdAt);



  const listedAt = Number.isFinite(createdAt)

    ? createdAt

    : /^\d{13}$/.test(art.id)

      ? Number(art.id)

      : NaN;



  if (

    preset === undefined &&

    (!Number.isFinite(listedAt) || listedAt > existingDurationCutoff)

  )

    return art;



  // Keep other pre-existing device-local listings stable independently of
  // ordering, later additions, or withdrawals. Never rewrite stored records.
  let hash = 2021541847;



  for (let i = 0; i < art.id.length; i++)

    hash = Math.imul(hash ^ art.id.charCodeAt(i), 16777619);



  const seconds = preset ?? (((hash >>> 16) & 1) === 0 ? 30 : 60);



  return {

    ...art,



    drawingDurationSeconds: seconds,



    drawingDurationSource: "assigned",

  };

}



// Owner-supplied collection. Ship the records with their original images so a
// new browser and the downloaded ZIP do not depend on another browser's storage.
const originalBundledArtworks = [

  ["01-sandwich", "わたしのさんどいっち", "金屋さくら", "食べ物"],



  ["02-enoden", "えのでん", "すずは", "乗り物"],



  ["03-stitch", "す、て、ぃ、っち", "すずは", "キャラクター"],



  ["04-mushroom", "きのこ", "佐伯祐介", "食べ物"],



  ["05-rose", "バラ", "佐伯祐介", "植物"],



  ["06-top", "こま", "おかもと", "free"],



  ["07-goriko", "ごリコ", "みゆう", "動物"],



  ["08-camel", "ラクダ", "しばやま", "動物"],



  ["09-curry", "たぶんカレー", "じゅんう", "食べ物"],



  ["10-my-artwork", "わたしの作品", "長谷部", "食べ物"],

]



  .map(([key, title, artist, category]) => ({

    id: `collection-20260930-${key}`,



    title,



    artist,



    category,



    image: `/saved-artworks/${key}.jpg`,



    price: 1000,



    bids: 0,



    // The original creation date is unknown; do not invent one.
    createdAt: "",



    prompt: category,

  }))



  .map(assignExistingDuration);




export const bundledArtworks = [

  ...originalBundledArtworks,



  ...additionalOwnerArtworks,

];



export const storageKeys = {

  account: "kakushon-account",



  session: "kakushon-session",



  artworks: "kakushon-user-artworks",



  auctions: "kakushon-auctions",



  favorites: "kakushon-favorites",



  lastDrawing: "kakushon-last-drawing",



  lastTheme: "kakushon-last-theme",



  lastDrawingDuration: "kakushon-last-drawing-duration",

};



export function readStorage(key, fallback) {

  try {

    const raw = localStorage.getItem(key);



    return raw ? JSON.parse(raw) : fallback;

  } catch {

    return fallback;

  }

}



function isArtwork(value) {

  if (!value || typeof value !== "object") return false;



  const art = value;



  return (

    [

      "id",



      "title",



      "artist",



      "image",



      "category",



      "prompt",



      "createdAt",

    ].every((key) => typeof art[key] === "string") &&

    !!art.id &&

    Number.isFinite(art.price) &&

    art.price >= 0 &&

    Number.isSafeInteger(art.bids) &&

    art.bids >= 0 &&

    (art.cancelledAt === undefined || typeof art.cancelledAt === "string")

  );

}




function isAuctionRecord(value) {

  return (

    value &&

    typeof value === "object" &&

    !Array.isArray(value) &&

    isReadableAuctionPrice(value.price) &&

    Number.isSafeInteger(value.bids) &&

    value.bids >= 0 &&

    (value.sold === undefined || typeof value.sold === "boolean") &&

    (value.status === undefined ||

      value.status === "open" ||

      value.status === "sold") &&

    (value.buyNowPrice === undefined ||

      (typeof value.buyNowPrice === "number" &&

        isValidBuyNowPrice(value.buyNowPrice, 1)))

  );

}




export function readAuctions() {

  const saved = readStorage(storageKeys.auctions, {});



  if (!saved || typeof saved !== "object" || Array.isArray(saved))

    return {};



  return Object.fromEntries(

    Object.entries(saved)



      .filter(([, value]) => isAuctionRecord(value))



      .map(([slug, value]) => [slug, normalizeAuctionState(slug, value)]),

  );

}



// Read without writing a seed on every page load. Local records (including
// withdrawals) override the corresponding bundled ID; unrelated works survive.
export function readArtworks() {

  const saved = readStorage(storageKeys.artworks, []);



  const merged = new Map(bundledArtworks.map((art) => [art.id, art]));



  if (Array.isArray(saved)) {

    for (const art of saved) {

      if (isArtwork(art)) merged.set(art.id, art);

    }

  }




  const auctions = readAuctions();



  return Array.from(merged.values(), (art) => {


    const category = normalizeArtworkCategory(art.category);



    const current =

      category === art.category

        ? art

        : {

            ...art,



            category,

          };



    const assigned = assignExistingDuration(current);



    const view = getAuctionView(

      "custom-" + art.id,



      assigned,



      auctions["custom-" + art.id],

    );



    return view.sold

      ? {

          ...assigned,



          ...view,

        }

      : assigned;

  }).sort(compareArtworkNewest);

}



// A write must not treat unreadable saved data as an empty collection.
export function saveArtworkListing(artwork) {


  if (

    !isArtwork(artwork) ||

    !Number.isSafeInteger(artwork.price) ||

    artwork.price < 1 ||

    artwork.price > AUCTION_PRICE_LIMIT

  ) {

    throw new Error("開始価格は1C以上・1億C以下の整数で入力してください。");

  }



  if (!isValidBuyNowPrice(artwork.buyNowPrice, artwork.price)) {

    throw new Error(

      "即決価格は開始価格以上・1億C以下の整数で入力してください。",

    );

  }



  if (!isValidArtworkDescription(artwork.description)) {

    throw new Error("商品については100文字以内で入力してください。");

  }



  let saved;



  try {

    const raw = localStorage.getItem(storageKeys.artworks);



    saved = raw === null ? [] : JSON.parse(raw);



    if (!Array.isArray(saved))

      throw new Error("Invalid artwork collection");

  } catch {

    throw new Error(

      "保存済みの作品データを確認できないため、上書きせずに出品を中止しました。今回の作品は「画像を保存」から保存できます。",

    );

  }



  try {

    localStorage.setItem(

      storageKeys.artworks,



      JSON.stringify([artwork, ...saved]),

    );

  } catch {

    throw new Error(

      "作品を保存できませんでした。保存容量とブラウザの保存設定を確認してください。既存の作品は残っています。「画像を保存」から今回の作品を保存できます。",

    );

  }

}




function readListingForBid(slug) {

  if (!slug.startsWith("custom-")) return undefined;



  try {

    const raw = localStorage.getItem(storageKeys.artworks);



    const saved = raw === null ? [] : JSON.parse(raw);



    if (!Array.isArray(saved))

      throw new Error("Invalid artwork collection");



    const id = slug.slice("custom-".length);



    const stored = saved.find((art) => art?.id === id);



    if (stored && !isArtwork(stored)) throw new Error("Invalid artwork");



    return stored ?? bundledArtworks.find((art) => art.id === id);

  } catch {

    throw new Error(

      "保存済みの出品情報を確認できないため、入札を中止しました。",

    );

  }

}




export function saveAuctionBid(

  slug,



  amount,



  initialPrice,



  initialBids,



  buyNowPrice = undefined,

) {

  if (!Number.isSafeInteger(amount) || amount < 1) {

    throw new Error(

      "入札金額は正確に扱える範囲の正の整数で入力してください。",

    );

  }



  if (amount > AUCTION_PRICE_LIMIT)

    throw new Error("入札金額の上限は1億Cです。");



  let auctions;



  try {

    const raw = localStorage.getItem(storageKeys.auctions);



    auctions = raw === null ? {} : JSON.parse(raw);



    if (

      !auctions ||

      typeof auctions !== "object" ||

      Array.isArray(auctions)

    )

      throw new Error("Invalid auctions");

  } catch {

    throw new Error(

      "保存済みの入札データを確認できないため、入札を中止しました。ブラウザの保存設定を確認してください。",

    );

  }




  const artwork = readListingForBid(slug);



  if (artwork?.cancelledAt)

    throw new Error("この作品は出品が取り消されています。");



  const initial = artwork ?? {

    price: initialPrice,



    bids: initialBids,



    ...(buyNowPrice === undefined

      ? {}

      : {

          buyNowPrice,

        }),

  };



  const latest = Object.prototype.hasOwnProperty.call(auctions, slug)

    ? auctions[slug]

    : initial;



  if (!isAuctionRecord(latest)) {

    throw new Error(

      "現在の価格または入札件数を確認できないため、入札を中止しました。",

    );

  }



  if (!isValidBuyNowPrice(initial.buyNowPrice, initial.price))

    throw new Error("即決価格を確認できませんでした。");



  const view = getAuctionView(slug, initial, latest);



  if (view.sold) throw new Error("この作品は落札済みです。");



  const closesByBuyNow =

    view.buyNowPrice !== undefined && amount >= view.buyNowPrice;



  const closesByLimit = amount === AUCTION_PRICE_LIMIT;



  const minimum = view.price + 100;



  if (

    !Number.isSafeInteger(minimum) ||

    !Number.isSafeInteger(view.bids + 1)

  ) {

    throw new Error(

      "正確に扱える金額または入札件数の上限に達したため、これ以上入札できません。",

    );

  }



  if (!closesByBuyNow && !closesByLimit && amount < minimum) {

    throw new Error(

      `現在価格より100C以上高い金額（${formatYen(minimum)}以上）を入力してください。`,

    );

  }




  const sold = closesByBuyNow || closesByLimit;



  const next = {

    price: closesByBuyNow ? (view.buyNowPrice ?? amount) : amount,



    bids: view.bids + 1,



    ...(sold

      ? {

          sold: true,



          status: "sold",



          soldAt: new Date().toISOString(),



          soldReason: closesByBuyNow ? "buy-now" : "limit",



          submittedAmount: amount,



          ...(view.buyNowPrice === undefined

            ? {}

            : {

                buyNowPrice: view.buyNowPrice,

              }),

        }

      : {}),

  };



  try {

    localStorage.setItem(

      storageKeys.auctions,



      JSON.stringify({

        ...auctions,



        [slug]: next,

      }),

    );

  } catch {

    throw new Error(

      "入札内容を保存できませんでした。価格と入札件数は変更していません。保存容量とブラウザの保存設定を確認してください。",

    );

  }



  return next;

}



// Withdraw the listing without deleting its drawing or historical auction data.
export function cancelArtworkListing(id) {

  const raw = localStorage.getItem(storageKeys.artworks);



  const saved = raw ? JSON.parse(raw) : [];



  if (!Array.isArray(saved))

    throw new Error("作品データを読み込めませんでした。");



  const storedTarget = saved.find((art) => art?.id === id);



  const target =

    storedTarget ?? bundledArtworks.find((art) => art.id === id);



  if (!target) throw new Error("作品が見つかりません。");




  if (!isArtwork(target))

    throw new Error("作品データを読み込めませんでした。");



  if (target.cancelledAt) return target;




  if (

    getAuctionView(

      "custom-" + target.id,



      target,



      readAuctions()["custom-" + target.id],

    ).sold

  ) {

    throw new Error("落札済みの作品は出品を取り消せません。");

  }



  const cancelled = {

    ...target,



    cancelledAt: new Date().toISOString(),

  };



  const next = storedTarget

    ? saved.map((art) => (art?.id === id ? cancelled : art))

    : [...saved, cancelled];



  localStorage.setItem(storageKeys.artworks, JSON.stringify(next));



  return cancelled;

}




export function formatYen(value) {

  return `${value.toLocaleString("ja-JP")}C`;

}



export function parseYen(value) {

  return Number(value.replace(/[^0-9]/g, "")) || 0;

}

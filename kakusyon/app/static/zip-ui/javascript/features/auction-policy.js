
// @ts-check


export const AUCTION_PRICE_LIMIT = 100_000_000;



export const LEGACY_SOLD_PRICE_MIN = 90_000_000;



export const ARTWORK_DESCRIPTION_LIMIT = 100;



/** @typedef {{price:number,bids:number,buyNowPrice?:number,sold?:boolean,status?:string,soldAt?:string,soldReason?:string,previousPrice?:number}} AuctionRecord */
/** @typedef {{price:number,bids:number,buyNowPrice?:number,sold:boolean,status:"open"|"sold",soldAt?:string,soldReason?:string,previousPrice?:number}} AuctionView */


export function countDescriptionCharacters(value = "") {

  const text = typeof value === "string" ? value : "";



  if (typeof Intl.Segmenter === "function") {

    return Array.from(

      new Intl.Segmenter("ja", {

        granularity: "grapheme",

      }).segment(text),

    ).length;

  }



  return Array.from(text).length;

}




export function isValidArtworkDescription(value) {

  return (

    value === undefined ||

    (typeof value === "string" &&

      countDescriptionCharacters(value.trim()) <= ARTWORK_DESCRIPTION_LIMIT)

  );

}




export function artworkDescription(value) {

  return typeof value === "string" && value.trim()

    ? value.trim()

    : "特になし";

}




export function isValidBuyNowPrice(value, startingPrice) {

  return (

    value === undefined ||

    value === null ||

    value === "" ||

    (typeof value === "number" &&

      Number.isSafeInteger(value) &&

      Number.isFinite(startingPrice) &&

      value >= Math.max(1, startingPrice) &&

      value <= AUCTION_PRICE_LIMIT)

  );

}




export function legacySoldPrice(slug) {

  let hash = 2166136261;



  for (const character of String(slug))

    hash = Math.imul(hash ^ character.codePointAt(0), 16777619);



  return (

    LEGACY_SOLD_PRICE_MIN +

    ((hash >>> 0) % (AUCTION_PRICE_LIMIT - LEGACY_SOLD_PRICE_MIN + 1))

  );

}




export function isReadableAuctionPrice(value) {

  return (

    typeof value === "number" &&

    Number.isFinite(value) &&

    value >= 1 &&

    (Number.isSafeInteger(value) || value > AUCTION_PRICE_LIMIT)

  );

}



/**
 * slugは保存キー、initialは作品の開始情報、savedは最新の入札情報です。
 * 元データへ書き込まず、全画面で共用する価格・即決価格・落札状態を返します。
 * 新規出品の開始価格と即決価格が同じ場合、初回の入札・即決操作までは出品中です。
 * @param {string} slug
 * @param {AuctionRecord} initial
 * @param {AuctionRecord | undefined} saved
 * @returns {AuctionView}
 */
export function getAuctionView(slug, initial, saved = undefined) {

  const initialSold = initial.sold === true || initial.status === "sold";



  const savedSold = saved?.sold === true || saved?.status === "sold";



  const latest =

    saved &&

    isReadableAuctionPrice(saved.price) &&

    Number.isSafeInteger(saved.bids) &&

    saved.bids >= 0 &&

    (!initialSold || savedSold)

      ? saved

      : initial;



  const price = isReadableAuctionPrice(latest.price) ? latest.price : 1;



  const bids =

    Number.isSafeInteger(latest.bids) && latest.bids >= 0 ? latest.bids : 0;



  const selectedBuyNow = initial.buyNowPrice ?? latest.buyNowPrice;



  const buyNowPrice =

    typeof selectedBuyNow === "number" &&

    isValidBuyNowPrice(selectedBuyNow, initial.price)

      ? selectedBuyNow

      : undefined;



  const base = {

    price,



    bids,



    ...(buyNowPrice === undefined

      ? {}

      : {

          buyNowPrice,

        }),

  };



  const prior = isReadableAuctionPrice(latest.previousPrice)

    ? latest.previousPrice

    : undefined;




  if (price > AUCTION_PRICE_LIMIT) {

    return {

      ...base,



      price: legacySoldPrice(slug),



      sold: true,



      status: "sold",



      soldReason: "legacy-limit",



      previousPrice: prior ?? price,

    };

  }



  if (

    latest.sold === true ||

    latest.status === "sold" ||

    initial.sold === true ||

    initial.status === "sold"

  ) {

    return {

      ...base,



      sold: true,



      status: "sold",



      soldReason: latest.soldReason ?? initial.soldReason,



      ...((latest.soldAt ?? initial.soldAt)

        ? {

            soldAt: latest.soldAt ?? initial.soldAt,

          }

        : {}),



      ...(prior === undefined

        ? {}

        : {

            previousPrice: prior,

          }),

    };

  }



  if (buyNowPrice !== undefined && bids > 0 && price >= buyNowPrice) {

    return {

      ...base,



      price: buyNowPrice,



      sold: true,



      status: "sold",



      soldReason: "buy-now",



      ...(price > buyNowPrice

        ? {

            previousPrice: price,

          }

        : {}),

    };

  }



  if (price === AUCTION_PRICE_LIMIT)

    return {

      ...base,



      sold: true,



      status: "sold",



      soldReason: "limit",

    };



  return {

    ...base,



    sold: false,



    status: "open",

  };

}




export function normalizeAuctionState(slug, record) {

  const view = getAuctionView(slug, record);



  return view.sold

    ? {

        ...record,



        ...view,

      }

    : {

        ...record,

      };

}

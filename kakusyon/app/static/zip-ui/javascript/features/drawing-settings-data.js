
// @ts-check

/** @typedef {(typeof drawingThemes)[number]["id"]} DrawingTheme */
/** @typedef {(typeof drawingTimes)[number]["seconds"]} DrawingDuration */
export const drawingThemes = [

  {

    id: "free",



    label: "free",



    image: "/static/zip-ui/images/auth-art-bg.png",

  },



  {

    id: "vehicle",



    label: "乗り物",



    image: "/static/zip-ui/images/drawing-theme-vehicle.png",

  },



  {

    id: "animal",



    label: "動物",



    image: "/static/zip-ui/images/drawing-theme-animal.png",

  },



  {

    id: "insect",



    label: "昆虫",



    image: "/static/zip-ui/images/drawing-theme-insect.png",

  },



  {

    id: "plant",



    label: "植物",



    image: "/static/zip-ui/images/art-botanical.png",

  },



  {

    id: "food",



    label: "食べ物",



    image: "/static/zip-ui/images/drawing-theme-food.png",

  },



  {

    id: "character",



    label: "キャラクター",



    image: "/static/zip-ui/images/art-monster.png",

  },



  {

    id: "doumae",



    label: "堂前和希",



    image: "/static/zip-ui/images/drawing-live.png",

  },

];



export const drawingTimes = [
  {seconds: 10, label: "10秒"},
  {seconds: 30, label: "30秒"},
  {seconds: 60, label: "1分"},
  {seconds: 300, label: "5分"},
];

export function getDrawingDuration(value) {

  return drawingTimes.find((time) => time.seconds === value)?.seconds;

}



export function matchesDrawingDuration(value, selected) {

  return selected === null || getDrawingDuration(value) === selected;

}



export function drawingFingerprint(image) {

  let hash = 2166136261;



  for (let index = 0; index < image.length; index++)

    hash = Math.imul(hash ^ image.charCodeAt(index), 16777619);



  return `${image.length}:${hash >>> 0}`;

}



export function encodeDraftDuration(image, seconds) {

  return JSON.stringify({

    seconds,



    imageFingerprint: drawingFingerprint(image),

  });

}



export function readDraftDuration(image, metadata) {

  try {

    const record = JSON.parse(metadata ?? "null");



    return image && record?.imageFingerprint === drawingFingerprint(image)

      ? getDrawingDuration(record.seconds)

      : undefined;

  } catch {

    return undefined;

  }

}



export function getDrawingTheme(id) {

  return (

    drawingThemes.find((theme) => theme.id === id) ??

    drawingThemes.find((theme) => theme.id === "food")

  );

}



export function randomDrawingTheme(random = Math.random) {

  return drawingThemes[

    Math.min(

      drawingThemes.length - 1,



      Math.max(0, Math.floor(random() * drawingThemes.length)),

    )

  ];

}



export function drawingClock(now, startsAt, duration) {

  const untilStart = startsAt - now;



  return {

    countdown:

      untilStart > 0 ? Math.min(3, Math.ceil(untilStart / 1000) - 1) : null,



    remaining:

      untilStart > 0

        ? duration

        : Math.max(0, Math.ceil((startsAt + duration * 1000 - now) / 1000)),

  };

}



export function isValidStartingPrice(price) {

  return Number.isInteger(price) && price >= 1 && price <= 1000;

}



// Reclassify drawings already listed when the owner requested the free collection.
// Keep the original record and drawing prompt intact; future works retain their theme.
const freeCollectionCutoff = Date.parse("2026-09-28T03:18:20Z");



/**
 * 旧版の保存分類とURLの分類名を、現在の分類名にそろえます。
 * @template {string | null} T
 * @param {T} category 保存済みまたはURLから取得した分類です。
 */
export function normalizeArtworkCategory(category) {

  return category === "堂前" ? "堂前和希" : category;

}




export function artworkCategory(artwork) {

  const normalized = normalizeArtworkCategory(artwork.category);



  if (normalized === "堂前和希") return normalized;



  if (

    artwork.createdAt &&

    Date.parse(artwork.createdAt) <= freeCollectionCutoff

  )

    return "free";



  const category = drawingThemes.find(

    (theme) => theme.label === normalized,

  );



  if (category) return category.label;



  return (

    drawingThemes.find((theme) => theme.label === artwork.prompt)?.label ??

    "free"

  );

}

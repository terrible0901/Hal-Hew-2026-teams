
// @ts-check


/** @typedef {{data: Uint8Array | Uint8ClampedArray, width: number, height: number}} PixelBuffer */
/** @typedef {{x: number, y: number}} PixelPoint */
/** @typedef {{x: number, y: number, width: number, height: number}} PixelRectangle */
/** @typedef {{mask: Uint8Array, count: number, bounds: PixelRectangle}} FillRegion */


const MAX_TOOL_PIXELS = 4_194_304;



/**
 * 幅と高さが整数で、処理用メモリーの上限に収まるかを確認します。
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
function validDimensions(width, height) {

  const area = width * height;



  return (

    Number.isSafeInteger(width) &&

    Number.isSafeInteger(height) &&

    width > 0 &&

    height > 0 &&

    Number.isSafeInteger(area) &&

    area <= MAX_TOOL_PIXELS

  );

}



/**
 * 画素の並びは左上からRGBAの4要素ずつです。途中で欠けた配列は扱いません。
 * @param {PixelBuffer} image
 * @returns {boolean}
 */
function validImage(image) {

  return (

    image !== null &&

    typeof image === "object" &&

    validDimensions(image.width, image.height) &&

    (image.data instanceof Uint8Array ||

      image.data instanceof Uint8ClampedArray) &&

    image.data.length === image.width * image.height * 4

  );

}



/**
 * 有限のキャンバス内座標を、対応する整数の画素番号へ変換します。
 * 枠の外を押した場合は、端の画素へ丸めずに処理を取り消します。
 * @param {PixelBuffer} image
 * @param {number} x
 * @param {number} y
 * @returns {number | null}
 */
function pixelIndex(image, x, y) {

  if (

    !Number.isFinite(x) ||

    !Number.isFinite(y) ||

    x < 0 ||

    y < 0 ||

    x >= image.width ||

    y >= image.height

  ) {

    return null;

  }



  return Math.floor(y) * image.width + Math.floor(x);

}



/**
 * 紙の白色を背景に、色の1成分を合成します。
 * 透明画素の内部RGBが黒でも、見た目どおり白として扱います。
 * @param {number} channel
 * @param {number} alpha
 * @returns {number}
 */
function overWhite(channel, alpha) {

  return Math.round((channel * alpha + 255 * (255 - alpha)) / 255);

}



/**
 * スポイトで選んだ画素を、色設定に渡せる小文字の16進表記へ変換します。
 * 半透明の画素は白い紙の上に見えている色を抽出し、入力画像は変更しません。
 * @param {PixelBuffer} image
 * @param {number} x
 * @param {number} y
 * @returns {string | null}
 */
export function colorAt(image, x, y) {

  if (!validImage(image)) return null;



  const index = pixelIndex(image, x, y);



  if (index === null) return null;



  const offset = index * 4;



  const alpha = image.data[offset + 3];



  const red = overWhite(image.data[offset], alpha);



  const green = overWhite(image.data[offset + 1], alpha);



  const blue = overWhite(image.data[offset + 2], alpha);



  return (

    "#" +

    [red, green, blue]



      .map((channel) => channel.toString(16).padStart(2, "0"))



      .join("")

  );

}



/**
 * 押した画素とつながった同系色の範囲を、1のマスクとして返します。
 * RGBの各成分を白背景へ合成して比較し、最大の差がtolerance以内なら同色です。
 * 上下左右の4方向だけをたどり、斜めだけで接する領域へは進みません。
 * 再帰を使わず、各画素を一度だけキューへ入れるため、大きい領域でも処理できます。
 * @param {PixelBuffer} image
 * @param {number} x
 * @param {number} y
 * @param {number} [tolerance=24]
 * @returns {FillRegion | null}
 */
export function createFillMask(image, x, y, tolerance = 24) {

  if (

    !validImage(image) ||

    !Number.isFinite(tolerance) ||

    tolerance < 0 ||

    tolerance > 255

  ) {

    return null;

  }



  const seed = pixelIndex(image, x, y);



  if (seed === null) return null;




  const seedOffset = seed * 4;



  const seedAlpha = image.data[seedOffset + 3];



  const red = overWhite(image.data[seedOffset], seedAlpha);



  const green = overWhite(image.data[seedOffset + 1], seedAlpha);



  const blue = overWhite(image.data[seedOffset + 2], seedAlpha);



  const area = image.width * image.height;



  const mask = new Uint8Array(area);



  const queue = new Uint32Array(area);



  let readIndex = 0;



  let writeIndex = 1;



  let left = Math.floor(x);



  let right = left;



  let top = Math.floor(y);



  let bottom = top;



  mask[seed] = 1;



  queue[0] = seed;



  /**
   * 未登録で色が一致する隣接画素だけを、後で調べるキューへ追加します。
   * 先にマスクを立てるので、同じ画素が重複登録されることはありません。
   * @param {number} index
   */
  function enqueue(index) {

    if (mask[index] !== 0) return;



    const offset = index * 4;



    const alpha = image.data[offset + 3];



    const difference = Math.max(

      Math.abs(overWhite(image.data[offset], alpha) - red),



      Math.abs(overWhite(image.data[offset + 1], alpha) - green),



      Math.abs(overWhite(image.data[offset + 2], alpha) - blue),

    );



    if (difference > tolerance) return;



    mask[index] = 1;



    queue[writeIndex++] = index;

  }




  while (readIndex < writeIndex) {

    const index = queue[readIndex++];



    const currentX = index % image.width;



    const currentY = Math.floor(index / image.width);



    left = Math.min(left, currentX);



    right = Math.max(right, currentX);



    top = Math.min(top, currentY);



    bottom = Math.max(bottom, currentY);



    if (currentX > 0) enqueue(index - 1);



    if (currentX + 1 < image.width) enqueue(index + 1);



    if (currentY > 0) enqueue(index - image.width);



    if (currentY + 1 < image.height) enqueue(index + image.width);

  }




  return {

    mask,



    count: writeIndex,



    bounds: {

      x: left,



      y: top,



      width: right - left + 1,



      height: bottom - top + 1,

    },

  };

}



/**
 * ドラッグの始点・終点を、キャンバス内の整数の範囲へ変換します。
 * 左上は切り下げ、右下は切り上げた半開区間です。右下の座標自体は含みません。
 * 幅または高さがないクリック、完全に画面外の範囲、不正な数値はnullを返します。
 * @param {PixelPoint} start
 * @param {PixelPoint} end
 * @param {number} width
 * @param {number} height
 * @returns {PixelRectangle | null}
 */
export function normalizedRectangle(start, end, width, height) {

  if (

    !validDimensions(width, height) ||

    !start ||

    !end ||

    !Number.isFinite(start.x) ||

    !Number.isFinite(start.y) ||

    !Number.isFinite(end.x) ||

    !Number.isFinite(end.y) ||

    start.x === end.x ||

    start.y === end.y

  ) {

    return null;

  }



  const left = Math.max(

    0,



    Math.min(width, Math.floor(Math.min(start.x, end.x))),

  );



  const top = Math.max(

    0,



    Math.min(height, Math.floor(Math.min(start.y, end.y))),

  );



  const right = Math.max(

    0,



    Math.min(width, Math.ceil(Math.max(start.x, end.x))),

  );



  const bottom = Math.max(

    0,



    Math.min(height, Math.ceil(Math.max(start.y, end.y))),

  );



  if (right <= left || bottom <= top) return null;



  return {

    x: left,



    y: top,



    width: right - left,



    height: bottom - top,

  };

}

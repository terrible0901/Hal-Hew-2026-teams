
// @ts-check

/** @typedef {"pencil" | "crayon"} PaperKind */
function grain(x, y, seed) {

  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;



  value = Math.imul(value ^ (value >>> 13), 1274126177);



  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;

}



// Fixed paper coordinates keep the same gaps transparent on repeated strokes.
export function paperAlpha(x, y, kind) {

  const fine = grain(x, y, 173);



  if (kind === "pencil")

    return fine < 0.2 ? 0 : Math.round(180 + fine * 75);



  const wax = grain(Math.floor(x / 3), Math.floor(y / 3), 937);



  const tooth = grain(Math.floor(x / 7), Math.floor(y / 5), 3571);



  if (fine < 0.16 + (1 - wax) * 0.2 || tooth < 0.06) return 0;



  return Math.round(175 + 80 * (0.45 * fine + 0.55 * wax));

}



export function createPaperTexture(kind) {

  const canvas = document.createElement("canvas");



  canvas.width = canvas.height = 256;



  const context = canvas.getContext("2d");



  const image = context.createImageData(256, 256);



  for (let y = 0; y < 256; y++)

    for (let x = 0; x < 256; x++) {

      const index = (y * 256 + x) * 4;



      image.data[index] =

        image.data[index + 1] =

        image.data[index + 2] =

          255;



      image.data[index + 3] = paperAlpha(x, y, kind);

    }



  context.putImageData(image, 0, 0);



  return canvas;

}



const MAX_INNER_SIZE = 1200;



const JPEG_QUALITY = 0.88;







export function getFramedImageLayout(width, height) {

  if (

    !Number.isFinite(width) ||

    !Number.isFinite(height) ||

    width <= 0 ||

    height <= 0

  ) {

    throw new Error("作品画像のサイズを確認できませんでした。");

  }



  const scale = Math.min(1, MAX_INNER_SIZE / Math.max(width, height));



  const innerWidth = Math.max(1, Math.round(width * scale));



  const innerHeight = Math.max(1, Math.round(height * scale));



  const border = Math.max(

    2,



    Math.round(Math.min(innerWidth, innerHeight) * 0.037),

  );



  return {

    innerWidth,



    innerHeight,



    border,



    width: innerWidth + border * 2,



    height: innerHeight + border * 2,

  };

}







export function paintFramedDrawing(context, image, layout) {

  const { width, height, border, innerWidth, innerHeight } = layout;




  context.fillStyle = "#b78631";



  context.fillRect(0, 0, width, height);



  const edge = Math.max(1, Math.round(border * 0.065));



  context.fillStyle = "#e8c486";



  context.fillRect(0, 0, edge, height);



  context.fillRect(0, 0, width, edge);



  context.fillStyle = "#9b702d";



  context.fillRect(width - edge, 0, edge, height);



  context.fillRect(0, height - edge, width, edge);



  const inset = Math.round(border * 0.7);



  context.fillStyle = "#d9ad68";



  context.fillRect(inset, inset, width - inset * 2, height - inset * 2);




  context.fillStyle = "#ffffff";



  context.fillRect(border, border, innerWidth, innerHeight);



  context.drawImage(image, border, border, innerWidth, innerHeight);

}







function loadDrawingImage(source, signal) {

  return new Promise((resolve, reject) => {

    signal?.throwIfAborted();



    const image = new Image();



    function cleanup() {

      image.onload = null;



      image.onerror = null;



      signal?.removeEventListener("abort", abort);

    }



    function abort() {

      cleanup();



      image.src = "";



      reject(

        signal.reason ??

          new DOMException("保存を中断しました。", "AbortError"),

      );

    }



    image.onload = () => {

      cleanup();



      resolve(image);

    };



    image.onerror = () => {

      cleanup();



      reject(new Error("作品画像を読み込めませんでした。"));

    };



    signal?.addEventListener("abort", abort, {

      once: true,

    });



    image.src = source;

  });

}







export async function createFramedDrawingImage(source, { signal } = {}) {

  if (!source) {

    throw new Error("保存できる作品がありません。");

  }



  const image = await loadDrawingImage(source, signal);



  signal?.throwIfAborted();



  const layout = getFramedImageLayout(

    image.naturalWidth,



    image.naturalHeight,

  );



  const canvas = document.createElement("canvas");



  canvas.width = layout.width;



  canvas.height = layout.height;



  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("額縁付き画像を作成できませんでした。");

  }



  paintFramedDrawing(context, image, layout);



  const result = canvas.toDataURL("image/jpeg", JPEG_QUALITY);



  if (!result.startsWith("data:image/jpeg;base64,")) {

    throw new Error("JPEG画像を作成できませんでした。");

  }



  return result;

}


import QRCode from "../common/qr-code.js";




export const QR_IMAGE_MAX_EDGE = 480;



export const QR_IMAGE_MAX_BYTES = 100 * 1024;



export const QR_IMAGE_QUALITIES = [0.78, 0.65, 0.5, 0.35];



export const QR_OWNER_STORAGE_KEY = "kakushon-qr-save-owner-tokens";



const UUID_PATTERN =

  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



const TOKEN_PATTERN = /^[0-9a-f]{64}$/;




export function jpegDataBytes(image) {

  if (

    typeof image !== "string" ||

    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)

  ) {

    throw new Error("JPEG画像を確認できませんでした。");

  }



  const decoded = atob(image.slice(image.indexOf(",") + 1));



  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));

}




export function getQrImageLayout(width, height) {

  if (

    !Number.isFinite(width) ||

    !Number.isFinite(height) ||

    width <= 0 ||

    height <= 0

  ) {

    throw new Error("QR用画像のサイズを確認できませんでした。");

  }



  const scale = Math.min(1, QR_IMAGE_MAX_EDGE / Math.max(width, height));



  return {

    width: Math.max(1, Math.round(width * scale)),



    height: Math.max(1, Math.round(height * scale)),

  };

}




function loadImage(source, signal) {

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



      reject(new Error("QR用画像を読み込めませんでした。"));

    };



    signal?.addEventListener("abort", abort, {

      once: true,

    });



    image.src = source;

  });

}







export async function prepareQrImage(image, { signal } = {}) {

  jpegDataBytes(image);



  const decoded = await loadImage(image, signal);



  signal?.throwIfAborted();



  const layout = getQrImageLayout(

    decoded.naturalWidth,



    decoded.naturalHeight,

  );



  const canvas = document.createElement("canvas");



  canvas.width = layout.width;



  canvas.height = layout.height;



  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("QR用画像を作成できませんでした。");

  }



  context.fillStyle = "#ffffff";



  context.fillRect(0, 0, layout.width, layout.height);



  context.drawImage(decoded, 0, 0, layout.width, layout.height);



  for (const quality of QR_IMAGE_QUALITIES) {

    signal?.throwIfAborted();



    const resized = canvas.toDataURL("image/jpeg", quality);



    if (jpegDataBytes(resized).byteLength <= QR_IMAGE_MAX_BYTES) {

      return resized;

    }

  }



  throw new Error(

    "画像を100KB以内にできませんでした。端末への保存をご利用ください。",

  );

}




export function validateQrImageUrl(downloadUrl, id, origin) {

  if (!UUID_PATTERN.test(id) || typeof downloadUrl !== "string") {

    throw new Error("保存用リンクを作成できませんでした。");

  }



  let url;



  try {

    url = new URL(downloadUrl);

  } catch {

    throw new Error("安全な画像保存リンクを作成できませんでした。");

  }



  const localHost = ["127.0.0.1", "localhost", "[::1]"].includes(

    url.hostname,

  );



  const localHttp =

    url.protocol === "http:" && localHost && url.origin === origin;



  if (

    (url.protocol !== "https:" && !localHttp) ||

    url.username ||

    url.password ||

    url.search ||

    url.hash ||

    url.pathname !== `/api/qr-images/${id}/image`

  ) {

    throw new Error("安全な画像保存リンクを作成できませんでした。");

  }



  return url.href;

}




function hexadecimal(bytes) {

  return Array.from(bytes, (value) =>

    value.toString(16).padStart(2, "0"),

  ).join("");

}




async function responseData(response) {

  const payload = await response.json().catch(() => null);



  if (!response.ok) {

    throw new Error(

      typeof payload?.error === "string"

        ? payload.error

        : "QR共有を処理できませんでした。端末への保存は引き続き使えます。",

    );

  }



  return payload;

}







export function createQrSaveClient({

  prepareImage = prepareQrImage,



  fetchRequest = (...args) => fetch(...args),



  cryptoApi = globalThis.crypto,



  storage = () => globalThis.localStorage,



  origin = () => globalThis.location?.origin,



  makeQr = (url) =>

    QRCode.toDataURL(url, {

      width: 320,



      margin: 4,



      errorCorrectionLevel: "M",

    }),

} = {}) {

  const images = new Map();



  const entries = new Map();




  function persistToken(id, token) {

    try {

      const target = storage();



      const raw = target.getItem(QR_OWNER_STORAGE_KEY);



      const tokens = raw ? JSON.parse(raw) : {};



      if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {

        throw new Error("保存データの形式が不正です。");

      }



      tokens[id] = token;



      const serialized = JSON.stringify(tokens);



      target.setItem(QR_OWNER_STORAGE_KEY, serialized);



      if (target.getItem(QR_OWNER_STORAGE_KEY) !== serialized) {

        throw new Error("保存内容を確認できませんでした。");

      }

    } catch {

      throw new Error(

        "取消用の情報をこのブラウザーに保存できません。端末への保存をご利用ください。",

      );

    }

  }




  async function getEntry(image, signal) {

    signal?.throwIfAborted();



    if (!cryptoApi?.subtle || !cryptoApi?.randomUUID) {

      throw new Error(

        "QR保存にはHTTPSのサイト、またはローカル起動が必要です。",

      );

    }



    let prepared = images.get(image);



    if (!prepared) {

      prepared = await prepareImage(image, {

        signal,

      });



      signal?.throwIfAborted();



      images.set(image, prepared);

    }



    const digest = await cryptoApi.subtle.digest(

      "SHA-256",



      jpegDataBytes(prepared),

    );



    signal?.throwIfAborted();



    const key = hexadecimal(new Uint8Array(digest));



    let entry = entries.get(key);



    if (!entry) {

      entry = {

        id: cryptoApi.randomUUID(),



        token: hexadecimal(cryptoApi.getRandomValues(new Uint8Array(32))),



        image: prepared,



        result: null,



        link: null,



        pending: null,



        revoked: false,

      };



      entries.set(key, entry);

    }



    return entry;

  }




  async function save(image, { signal } = {}) {

    const entry = await getEntry(image, signal);



    if (entry.revoked) {

      throw new Error(

        "この画像のQR共有は取り消し済みです。端末への保存をご利用ください。",

      );

    }



    if (entry.result) {

      return entry.result;

    }



    if (entry.pending) {

      return entry.pending;

    }



    entry.pending = (async () => {

      persistToken(entry.id, entry.token);



      if (!entry.link) {

        const response = await fetchRequest("/api/qr-images", {

          method: "POST",



          headers: {

            "Content-Type": "application/json",

          },



          body: JSON.stringify({

            id: entry.id,



            token: entry.token,



            image: entry.image,

          }),



          signal,

        });



        const result = await responseData(response);



        signal?.throwIfAborted();



        if (result?.id !== entry.id) {

          throw new Error("保存用リンクの識別番号が一致しませんでした。");

        }



        entry.link = validateQrImageUrl(

          result.downloadUrl,



          result.id,



          origin(),

        );

      }



      const qr = await makeQr(entry.link);



      signal?.throwIfAborted();



      entry.result = {

        id: entry.id,



        image,



        qr,



        link: entry.link,



        revoked: false,

      };



      return entry.result;

    })();



    try {

      return await entry.pending;

    } finally {

      entry.pending = null;

    }

  }







  async function revoke(id, { signal } = {}) {

    if (!UUID_PATTERN.test(id)) {

      throw new Error("取消対象の画像を確認できませんでした。");

    }



    let token;



    try {

      token = JSON.parse(storage().getItem(QR_OWNER_STORAGE_KEY) ?? "{}")[

        id

      ];

    } catch {

      token = null;

    }



    if (!TOKEN_PATTERN.test(token ?? "")) {

      throw new Error("このブラウザーに取消用の情報がありません。");

    }



    await responseData(

      await fetchRequest(`/api/qr-images/${id}`, {

        method: "DELETE",



        headers: {

          Authorization: `Bearer ${token}`,

        },



        signal,

      }),

    );



    for (const entry of entries.values()) {

      if (entry.id === id) {

        entry.revoked = true;



        if (entry.result) {

          entry.result.revoked = true;

        }

      }

    }

  }



  return {

    save,



    revoke,

  };

}




export const qrSaveClient = createQrSaveClient();

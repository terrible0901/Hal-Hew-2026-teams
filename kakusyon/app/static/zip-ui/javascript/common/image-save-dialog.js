
import { createFramedDrawingImage } from "../features/framed-image-export.js";



import { qrSaveClient } from "../features/qr-save-client.js";







export async function saveDrawing(

  image,



  { signal, prepared = false } = {},

) {

  if (!image) {

    throw new Error("保存できる作品がありません。");

  }



  const framed = prepared

    ? image

    : await createFramedDrawingImage(image, {

        signal,

      });



  return qrSaveClient.save(framed, {

    signal,

  });

}




export async function downloadDrawing(image, { prepared = false } = {}) {

  if (!image) {

    return;

  }



  const savedImage = prepared

    ? image

    : await createFramedDrawingImage(image);



  const anchor = document.createElement("a");



  anchor.href = savedImage;



  anchor.download = `kakushon-${Date.now()}.jpg`;



  document.body.append(anchor);



  anchor.click();



  anchor.remove();

}








export function createDrawingSaveDialog({

  dialog,



  trigger,



  getImage,



  client = qrSaveClient,

}) {

  const select = (name) => dialog.querySelector(`[data-save-${name}]`);



  const area = select("area");



  const busy = select("busy");



  const busyText = select("busy-text");



  const preview = select("preview");



  const qrImage = select("qr");



  const qrDownload = select("qr-download");



  const errorBox = select("error-box");



  const errorText = select("error");



  const status = select("status");



  const createQr = select("create-qr");



  const revoke = select("revoke");



  const pageLink = select("link");



  const download = select("download");



  const localNote = select("local-note");



  const closeButton = select("close");



  const events = new AbortController();



  let request = null;



  let pending = false;



  let destroyed = false;



  let saved = null;



  let activeImage = "";



  let preparedSource = "";



  let previousFocus = null;




  localNote.hidden = !["localhost", "127.0.0.1", "[::1]"].includes(

    globalThis.location?.hostname,

  );




  function setBusy(value, message = "額縁付き画像を準備しています…") {

    pending = value;



    busy.hidden = !value;



    busyText.textContent = message;



    area.setAttribute("aria-busy", String(value));



    createQr.disabled = value || !activeImage || saved?.revoked === true;



    revoke.disabled = value;



    download.disabled = !activeImage;

  }




  function hideSharedImage() {

    for (const element of [qrImage, qrDownload, pageLink, revoke]) {

      element.hidden = true;

    }



    qrImage.removeAttribute("src");



    qrDownload.removeAttribute("href");



    pageLink.removeAttribute("href");

  }




  function setStatus(message = "") {

    status.textContent = message;



    status.hidden = message.length === 0;

  }




  function displaySaved(result) {

    if (result.revoked) {

      hideSharedImage();



      setStatus("QR共有を取り消しました。");



      return;

    }



    qrImage.src = result.qr;



    qrImage.hidden = false;



    qrDownload.href = result.qr;



    qrDownload.download = `kakushon-qr-${result.id}.png`;



    qrDownload.hidden = false;



    pageLink.href = result.link;



    pageLink.hidden = false;



    revoke.hidden = false;



    setStatus();

  }




  function displayError(cause) {

    errorText.textContent =

      cause instanceof Error

        ? cause.message

        : "保存操作を完了できませんでした。";



    errorBox.hidden = false;

  }




  async function open() {

    if (destroyed) {

      return;

    }



    if (!dialog.open) {

      previousFocus = document.activeElement;



      dialog.showModal();

    }



    if (pending) {

      return;

    }



    errorBox.hidden = true;



    errorText.textContent = "";



    setStatus();



    request = new AbortController();



    setBusy(true);




    download.disabled = true;



    try {

      const source = await getImage();



      if (destroyed) {

        return;

      }



      if (!source) {

        throw new Error("保存できる作品がありません。");

      }



      if (preparedSource !== source) {

        activeImage = "";



        saved = null;



        preview.hidden = true;



        hideSharedImage();



        activeImage = await createFramedDrawingImage(source, {

          signal: request.signal,

        });



        preparedSource = source;

      }



      if (destroyed) {

        return;

      }



      preview.src = activeImage;



      preview.hidden = false;



      if (saved) {

        displaySaved(saved);

      }

    } catch (cause) {

      if (!destroyed) {

        displayError(cause);

      }

    } finally {

      request = null;



      if (!destroyed) {

        setBusy(false);

      }

    }

  }




  async function share() {

    if (destroyed || pending || !activeImage || saved?.revoked) {

      return;

    }



    errorBox.hidden = true;



    request = new AbortController();



    setBusy(true, "QR共有用の画像を送信しています…");



    try {

      const result = await client.save(activeImage, {

        signal: request.signal,

      });



      if (!destroyed) {

        saved = result;



        displaySaved(result);

      }

    } catch (cause) {

      if (!destroyed) {

        displayError(cause);

      }

    } finally {

      request = null;



      if (!destroyed) {

        setBusy(false);

      }

    }

  }




  async function revokeShare() {

    if (destroyed || pending || !saved || saved.revoked) {

      return;

    }



    errorBox.hidden = true;



    request = new AbortController();



    setBusy(true, "QR共有を取り消しています…");



    try {

      await client.revoke(saved.id, {

        signal: request.signal,

      });



      if (!destroyed) {

        saved.revoked = true;



        displaySaved(saved);

      }

    } catch (cause) {

      if (!destroyed) {

        displayError(cause);

      }

    } finally {

      request = null;



      if (!destroyed) {

        setBusy(false);

      }

    }

  }




  function close() {

    if (dialog.open) {

      dialog.close();

    }

  }



  trigger?.addEventListener("click", open, {

    signal: events.signal,

  });



  createQr.addEventListener("click", share, {

    signal: events.signal,

  });



  revoke.addEventListener("click", revokeShare, {

    signal: events.signal,

  });



  closeButton.addEventListener("click", close, {

    signal: events.signal,

  });



  dialog.addEventListener(

    "click",



    (event) => {

      if (event.target !== dialog) {

        return;

      }



      const bounds = dialog.getBoundingClientRect();



      if (

        event.clientX < bounds.left ||

        event.clientX > bounds.right ||

        event.clientY < bounds.top ||

        event.clientY > bounds.bottom

      ) {

        close();

      }

    },



    {

      signal: events.signal,

    },

  );



  download.addEventListener(

    "click",



    async () => {

      if (!activeImage || destroyed || download.disabled) {

        return;

      }



      try {

        await downloadDrawing(activeImage, {

          prepared: true,

        });

      } catch (cause) {

        displayError(cause);

      }

    },



    {

      signal: events.signal,

    },

  );



  dialog.addEventListener(

    "close",



    () => {

      const focusTarget = trigger ?? previousFocus;



      if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {

        focusTarget.focus();

      }

    },



    {

      signal: events.signal,

    },

  );



  return {

    open,



    close,



    share,



    revokeShare,



    destroy() {

      destroyed = true;



      close();



      events.abort();



      request?.abort();



      activeImage = "";



      preparedSource = "";



      saved = null;

    },

  };

}

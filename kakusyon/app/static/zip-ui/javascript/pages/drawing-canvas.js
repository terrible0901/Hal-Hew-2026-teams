
import {

  drawingClock,

  encodeDraftDuration,

  getDrawingDuration,

  getDrawingTheme,

} from "../features/drawing-settings-data.js";



import { storageKeys } from "../features/local-storage.js";




import {

  draftCreationStorageKey,

  encodeDraftCreation,

} from "../features/listing-metadata.js";



import { createDrawingSelectionControls } from "../features/drawing-selection-ui.js";



import {

  brushDiameter,

  brushWidths,

  diffusionTypes,

  DrawingEngine,

  penTypes,

} from "../features/drawing-engine.js";



import {

  drawingPanelAfterSwipe,

  mobileDrawingQuery,

} from "../features/drawing-swipe-navigation.js";




const palette = [

  ["#ef3f46", "赤"],



  ["#f28c28", "オレンジ"],



  ["#f5c542", "黄"],



  ["#7ebd3e", "黄緑"],



  ["#129c72", "緑"],



  ["#21a6a1", "青緑"],



  ["#2379c9", "水色"],



  ["#214ea3", "青"],



  ["#7045a8", "紫"],



  ["#e0529c", "ピンク"],



  ["#8a5738", "茶"],



  ["#171d20", "黒"],

];




export function hsvToHex(hue, saturation, value) {

  const chroma = value * saturation;



  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));



  const m = value - chroma;



  const channels =

    hue < 60

      ? [chroma, x, 0]

      : hue < 120

        ? [x, chroma, 0]

        : hue < 180

          ? [0, chroma, x]

          : hue < 240

            ? [0, x, chroma]

            : hue < 300

              ? [x, 0, chroma]

              : [chroma, 0, x];



  return (

    "#" +

    channels



      .map((channel) =>

        Math.round((channel + m) * 255)



          .toString(16)



          .padStart(2, "0"),

      )



      .join("")

  );

}




export function hexToHsv(hex) {

  const [r, g, b] = [1, 3, 5].map(

    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,

  );



  const max = Math.max(r, g, b);



  const min = Math.min(r, g, b);



  const delta = max - min;



  let hue = !delta

    ? 0

    : max === r

      ? 60 * (((g - b) / delta) % 6)

      : max === g

        ? 60 * ((b - r) / delta + 2)

        : 60 * ((r - g) / delta + 4);



  if (hue < 0) hue += 360;



  return {

    hue,



    saturation: max ? delta / max : 0,



    value: max,

  };

}




function formatTime(value) {

  return (

    Math.floor(value / 60)



      .toString()



      .padStart(2, "0") +

    ":" +

    (value % 60).toString().padStart(2, "0")

  );

}








export function initDrawingPage() {

  const shell = document.getElementById("drawing-shell");



  if (!shell || shell.dataset.initialized === "true") return null;



  shell.dataset.initialized = "true";



  const element = (id) => {

    const found = document.getElementById(id);



    if (!found) throw new Error("描画画面の要素が見つかりません: " + id);



    return found;

  };



  const all = (selector) => [...shell.querySelectorAll(selector)];



  const clone = (id) =>

    element(id).content.firstElementChild.cloneNode(true);



  const pressed = (button, selected) =>

    button.setAttribute("aria-pressed", String(selected));



  const canvas = element("drawing-canvas");



  const cursor = element("drawing-cursor");



  const ring = element("cursor-ring");



  const colorField = element("color-field");



  const marker = element("color-marker");



  const hueInput = element("color-hue");



  const amountInput = element("ink-amount");



  const opacityInput = element("layer-opacity");



  const layerList = element("layer-list");



  const dropLine = element("layer-drop-line");



  const layersDetails = element("pro-layers");



  const navigation = element("mobile-navigation");



  const engine = new DrawingEngine(canvas);



  const params = new URLSearchParams(window.location.search);



  const duration = getDrawingDuration(({short: 30, mid: 60, long: 3600}[params.get("time")] ?? Number(params.get("time")))) ?? 60;



  const theme = getDrawingTheme({chara: "character", domae: "doumae"}[params.get("theme")] ?? params.get("theme"));



  const pro = params.get("mode") === "pro";



  const settings = {

    tool: "pen",



    pen: "pencil",



    width: 8,



    color: palette[0][0],



    diffusion: "cloud",



    ink: "dye",



    amount: 50,

  };



  let clock = {

    countdown: 3,



    remaining: null,

  };



  let mobile = false;



  let panel = "canvas";



  let selectionControls = null;



  let lastPaintingTool = "pen";



  let desktopLayersOpen = true;



  let dialogKind = null;



  let drawingPointer = null;



  let colorPointer = null;



  let swipe = null;



  let layerDrag = null;



  let suppressLayerClick = false;



  let pickerHue = hexToHsv(settings.color).hue;



  let countdownNumber = element("countdown-number");



  let lastFrame = 0;



  const startsAt = Date.now() + 4000;



  const media = window.matchMedia(mobileDrawingQuery);




  shell.classList.toggle("draw-pro", pro);



  element("theme-background").src = theme.image;



  all("[data-theme-label]").forEach((node) => {

    node.textContent = theme.label;

  });



  element("desktop-topic").textContent =

    (pro ? "プロモード ｜ " : "") + "お題：" + theme.label;



  element("mobile-mode").textContent = (pro ? "プロ" : "通常") + "モード";



  element("pro-settings").hidden = !pro;



  element("normal-settings").hidden = pro;



  element("normal-clear-button").hidden = pro;



  element("normal-theme-card").hidden = pro;



  layersDetails.hidden = !pro;




  element(pro ? "pro-edit-slot" : "normal-edit-slot").append(

    element("drawing-edit-tools"),

  );



  element(pro ? "pro-eyedropper-slot" : "normal-eyedropper-slot").append(

    element("eyedropper-button"),

  );




  function sessionEnabled() {

    return (

      clock.countdown === null &&

      clock.remaining !== null &&

      clock.remaining > 0 &&

      dialogKind === null

    );

  }




  function drawingEnabled() {

    return (

      sessionEnabled() &&

      (!mobile || panel === "canvas") &&

      (settings.tool === "eyedropper" || engine.canDraw())

    );

  }




  function brush() {

    return {

      ...settings,



      pen: pro ? settings.pen : "plain",



      width: pro ? settings.width : 8,

    };

  }




  function hideCursor() {

    cursor.hidden = true;



    canvas.classList.remove("draw-canvas-custom-cursor");

  }




  function finishStroke() {


    selectionControls?.cancel();



    const id = drawingPointer;



    drawingPointer = null;



    engine.end();



    if (id !== null && canvas.hasPointerCapture(id))

      canvas.releasePointerCapture(id);

  }




  function finishColorPick() {

    const id = colorPointer;



    colorPointer = null;



    if (id !== null && colorField.hasPointerCapture(id))

      colorField.releasePointerCapture(id);

  }




  function changeTools(change) {

    finishStroke();



    hideCursor();



    change();



    if (["pen", "ink", "eraser"].includes(settings.tool))

      lastPaintingTool = settings.tool;



    element("drawing-tool-status").textContent = "";



    renderBrush();

  }




  function buildOptions() {

    for (const item of penTypes) {

      const button = clone("pen-option-template");



      button.dataset.pen = item.id;



      button



        .querySelector(".pro-pen-sample")



        .classList.add("pro-pen-" + item.id);



      button.querySelector("[data-option-label]").textContent = item.label;



      button.addEventListener("click", () =>

        changeTools(() => {

          settings.pen = item.id;



          settings.tool = "pen";

        }),

      );



      element("pen-options").append(button);

    }



    for (const item of brushWidths) {

      const button = clone("width-option-template");



      button.dataset.width = String(item.width);



      button.setAttribute("aria-label", "太さ：" + item.label);



      button.querySelector("[data-option-label]").textContent = item.label;



      button



        .querySelector("[data-width-preview]")



        .style.setProperty(

          "--preview-size",



          Math.max(3, item.width * 0.65) + "px",

        );



      button.addEventListener("click", () =>

        changeTools(() => {

          settings.width = item.width;

        }),

      );



      element("width-options").append(button);

    }



    for (const item of diffusionTypes) {

      const button = clone("diffusion-option-template");



      button.dataset.diffusion = item.id;



      button.querySelector("[data-option-label]").textContent = item.label;



      button.querySelector("[data-option-detail]").textContent =

        item.detail;



      button.addEventListener("click", () =>

        changeTools(() => {

          settings.diffusion = item.id;



          settings.tool = "ink";

        }),

      );



      element("diffusion-options").append(button);

    }



    for (const [color, label] of palette) {

      const button = clone("palette-option-template");



      button.dataset.color = color;



      button.style.setProperty("--swatch-color", color);



      button.setAttribute("aria-label", label + "のペン");



      button.addEventListener("click", () =>

        changeTools(() => {

          settings.color = color;



          settings.tool = "pen";



          pickerHue = hexToHsv(color).hue;

        }),

      );



      element("color-palette").append(button);

    }

  }




  function renderBrush() {

    all("[data-pen]").forEach((node) =>

      pressed(

        node,



        settings.tool === "pen" && settings.pen === node.dataset.pen,

      ),

    );



    all("[data-width]").forEach((node) =>

      pressed(node, settings.width === Number(node.dataset.width)),

    );



    all("[data-diffusion]").forEach((node) =>

      pressed(

        node,



        settings.tool === "ink" &&

          settings.diffusion === node.dataset.diffusion,

      ),

    );



    all("[data-ink-kind]").forEach((node) =>

      pressed(node, settings.ink === node.dataset.inkKind),

    );



    all("[data-color]").forEach((node) =>

      pressed(

        node,



        settings.tool !== "eraser" && settings.color === node.dataset.color,

      ),

    );



    pressed(element("eraser-button"), settings.tool === "eraser");



    all("[data-edit-tool]").forEach((button) =>

      pressed(button, settings.tool === button.dataset.editTool),

    );



    canvas.classList.toggle(

      "draw-canvas-action-tool",



      ["bucket", "select", "eyedropper"].includes(settings.tool),

    );



    amountInput.value = String(settings.amount);



    element("ink-amount-text").textContent = settings.amount + "%";



    renderPicker();

  }




  function renderPicker() {

    const hsv = hexToHsv(settings.color);



    colorField.style.setProperty("--hue-color", hsvToHex(pickerHue, 1, 1));



    marker.style.setProperty(

      "--saturation-position",



      hsv.saturation * 100 + "%",

    );



    marker.style.setProperty(

      "--value-position",



      (1 - hsv.value) * 100 + "%",

    );



    hueInput.value = String(pickerHue);



    element("color-hue-text").textContent = Math.round(pickerHue) + "°";

  }




  function pickColor(event) {

    const rect = colorField.getBoundingClientRect();



    if (!sessionEnabled() || rect.width <= 0 || rect.height <= 0) return;



    const saturation = Math.max(

      0,



      Math.min(1, (event.clientX - rect.left) / rect.width),

    );



    const value =

      1 -

      Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));



    changeTools(() => {

      settings.color = hsvToHex(pickerHue, saturation, value);

    });

  }




  function openMobilePanel(next) {


    if (!pro && next === "layers") return;



    if (!sessionEnabled()) return;



    finishStroke();



    finishColorPick();



    engine.commitLayerOpacity();



    cancelLayerDrag();



    swipe = null;



    hideCursor();



    panel = next;



    shell.dataset.panel = panel;



    element("panel-swipe-description").textContent =

      panel === "tools" ? "右へスワイプで戻る" : "左へスワイプで戻る";



    all("[data-panel-button]").forEach((node) =>

      pressed(node, node.dataset.panelButton === panel),

    );



    navigation.focus({

      preventScroll: true,

    });

  }




  function updateLayout() {

    finishStroke();



    finishColorPick();



    engine.commitLayerOpacity();



    cancelLayerDrag();



    swipe = null;



    hideCursor();



    mobile = media.matches;



    panel = "canvas";



    shell.classList.toggle("draw-mobile", mobile);



    shell.dataset.panel = panel;



    layersDetails.open = mobile || desktopLayersOpen;



    all("[data-panel-button]").forEach((node) =>

      pressed(node, node.dataset.panelButton === panel),

    );

  }




  function layerAction(action) {

    if (!sessionEnabled()) return;



    finishStroke();



    hideCursor();



    action(engine);



    renderLayers();

  }




  function cancelLayerDrag() {

    const drag = layerDrag;



    layerDrag = null;



    if (drag?.moving) suppressLayerClick = true;



    if (drag?.button.hasPointerCapture(drag.pointerId))

      drag.button.releasePointerCapture(drag.pointerId);



    layerList.classList.remove("pro-layer-list-dragging");



    layerList



      .querySelectorAll(".pro-layer-dragging")



      .forEach((node) => node.classList.remove("pro-layer-dragging"));



    dropLine.hidden = true;

  }




  function renderLayers() {

    cancelLayerDrag();



    const layers = engine.getLayerInfo();



    const active = engine.getActiveId();



    const fragment = document.createDocumentFragment();



    for (const layer of [...layers].reverse()) {

      const row = clone("layer-row-template");



      row.dataset.layerId = String(layer.id);



      row.classList.toggle("pro-layer-active", active === layer.id);



      row.querySelector("[data-layer-number]").textContent = String(

        layer.id,

      );



      row.querySelector("[data-layer-name]").textContent = layer.name;



      const select = row.querySelector("[data-layer-select]");



      const visibility = row.querySelector("[data-layer-visibility]");



      select.setAttribute("aria-label", layer.name + "を選択");



      pressed(select, active === layer.id);



      visibility.setAttribute(

        "aria-label",



        layer.name + "を" + (layer.visible ? "非表示" : "表示") + "にする",

      );



      pressed(visibility, layer.visible);



      row



        .querySelector("[data-visibility-icon]")



        .setAttribute(

          "href",



          layer.visible ? "#icon-eye" : "#icon-eye-off",

        );



      select.addEventListener("pointerdown", (event) =>

        beginLayerDrag(event, layer.id, row, select),

      );



      select.addEventListener("pointermove", moveLayerDrag);



      select.addEventListener("pointerup", (event) => endLayerDrag(event));



      select.addEventListener("pointercancel", (event) =>

        endLayerDrag(event, true),

      );



      select.addEventListener("lostpointercapture", (event) =>

        endLayerDrag(event, true),

      );



      select.addEventListener("click", (event) => {

        const suppress = suppressLayerClick && event.detail !== 0;



        suppressLayerClick = false;



        if (!suppress)

          layerAction((drawing) => drawing.selectLayer(layer.id));

      });



      select.addEventListener("keydown", (event) => {

        if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key))

          return;



        event.preventDefault();



        const index = engine



          .getLayerInfo()



          .findIndex((item) => item.id === layer.id);



        layerAction((drawing) =>

          drawing.moveLayerTo(

            layer.id,



            index + (event.key === "ArrowUp" ? 1 : -1),

          ),

        );

      });



      visibility.addEventListener("click", () =>

        layerAction((drawing) => drawing.toggleLayer(layer.id)),

      );



      fragment.append(row);

    }



    layerList.replaceChildren(fragment, dropLine);



    const selected = layers.find((layer) => layer.id === active);



    const opacity = Math.round((selected?.opacity ?? 1) * 100);



    opacityInput.value = String(opacity);



    element("layer-opacity-text").textContent = opacity + "%";



    element("layer-count").textContent = layers.length + "/4";



    element("mobile-layer-label").textContent = pro

      ? "レイヤー " + layers.length + "/4"

      : "操作";



    element("layer-warning").hidden = selected?.visible !== false;



    renderAvailability();

  }




  function layerDestination(id, x, y) {

    const bounds = layerList.getBoundingClientRect();



    const rows = [...layerList.querySelectorAll("[data-layer-id]")].filter(

      (row) => Number(row.dataset.layerId) !== id,

    );



    if (

      !rows.length ||

      x < bounds.left ||

      x > bounds.right ||

      y < bounds.top - 12 ||

      y > bounds.bottom + 12

    )

      return {

        index: null,



        top: null,

      };



    const index = rows.filter((row) => {

      const rect = row.getBoundingClientRect();



      return y > rect.top + rect.height / 2;

    }).length;



    const target = rows[index]?.getBoundingClientRect();



    return {

      index: engine.getLayerInfo().length - 1 - index,



      top: target

        ? target.top - bounds.top - 3

        : rows.at(-1).getBoundingClientRect().bottom - bounds.top + 2,

    };

  }




  function beginLayerDrag(event, id, row, button) {

    suppressLayerClick = false;



    if (

      !sessionEnabled() ||

      engine.getLayerInfo().length < 2 ||

      !event.isPrimary ||

      event.button !== 0

    )

      return;



    layerDrag = {

      id,



      row,



      button,



      pointerId: event.pointerId,



      startY: event.clientY,



      moving: false,

    };



    button.setPointerCapture(event.pointerId);

  }




  function moveLayerDrag(event) {

    const drag = layerDrag;



    if (!drag || drag.pointerId !== event.pointerId) return;



    if (!drag.moving && Math.abs(event.clientY - drag.startY) < 5) return;



    drag.moving = true;



    event.preventDefault();



    drag.row.classList.add("pro-layer-dragging");



    layerList.classList.add("pro-layer-list-dragging");



    const target = layerDestination(drag.id, event.clientX, event.clientY);



    dropLine.hidden = target.top === null;



    if (target.top !== null)

      dropLine.style.setProperty("--drop-top", target.top + "px");

  }




  function endLayerDrag(event, cancelled = false) {

    const drag = layerDrag;



    if (!drag || drag.pointerId !== event.pointerId) return;



    const target = layerDestination(drag.id, event.clientX, event.clientY);



    const reorder =

      !cancelled &&

      drag.moving &&

      sessionEnabled() &&

      target.index !== null;



    if (drag.moving) event.preventDefault();



    cancelLayerDrag();



    if (reorder)

      layerAction((drawing) => drawing.moveLayerTo(drag.id, target.index));

  }




  function renderAvailability() {

    const enabled = sessionEnabled();



    layerList.querySelectorAll("button").forEach((button) => {

      button.disabled = !enabled;

    });



    opacityInput.disabled = !enabled;



    amountInput.disabled = !enabled;



    hueInput.disabled = !enabled;



    element("add-layer").disabled =

      !enabled || engine.getLayerInfo().length >= 4;



    element("remove-layer").disabled =

      !enabled || engine.getLayerInfo().length <= 1;



    element("clear-layer").disabled = !enabled;



    element("undo-button").disabled = !enabled;



    all("[data-edit-tool]").forEach((button) => {

      button.disabled = !enabled;

    });



    selectionControls?.setEnabled(enabled);

  }




  function point(event) {

    const rect = canvas.getBoundingClientRect();



    return {

      x: ((event.clientX - rect.left) * canvas.width) / rect.width,



      y: ((event.clientY - rect.top) * canvas.height) / rect.height,



      pressure: event.pressure,



      time: event.timeStamp,

    };

  }




  function updateCursor(event) {

    if (["bucket", "select", "eyedropper"].includes(settings.tool))

      return hideCursor();



    if (

      !drawingEnabled() ||

      event.pointerType === "touch" ||

      !event.isPrimary

    )

      return hideCursor();



    const rect = canvas.getBoundingClientRect();



    const x = event.clientX - rect.left;



    const y = event.clientY - rect.top;



    if (

      rect.width <= 0 ||

      rect.height <= 0 ||

      x < 0 ||

      y < 0 ||

      x > rect.width ||

      y > rect.height

    )

      return hideCursor();



    const diameter = brushDiameter(brush());



    cursor.style.setProperty("--cursor-x", (x / rect.width) * 100 + "%");



    cursor.style.setProperty("--cursor-y", (y / rect.height) * 100 + "%");



    cursor.style.setProperty("--brush-color", settings.color);



    ring.style.setProperty(

      "--ring-width",



      (diameter * rect.width) / canvas.width + "px",

    );



    ring.style.setProperty(

      "--ring-height",



      (diameter * rect.height) / canvas.height + "px",

    );



    const eraser = settings.tool === "eraser";



    cursor.classList.toggle("draw-cursor-eraser", eraser);



    cursor.classList.toggle("draw-cursor-pen", !eraser);



    const icon = eraser

      ? "eraser"

      : settings.tool === "ink"

        ? "ink"

        : pro && settings.pen === "spray"

          ? "spray"

          : "pencil";



    element("cursor-icon").setAttribute("href", "#icon-" + icon);



    cursor.hidden = false;



    canvas.classList.add("draw-canvas-custom-cursor");

  }




  function beginDrawing(event) {

    if (

      !drawingEnabled() ||

      !event.isPrimary ||

      event.button !== 0 ||

      drawingPointer !== null

    )

      return;




    if (["bucket", "select", "eyedropper"].includes(settings.tool)) {

      event.preventDefault();



      canvas.focus({

        preventScroll: true,

      });



      const position = point(event);



      if (settings.tool === "select") {

        selectionControls.begin(event, position);

      } else if (settings.tool === "bucket") {

        const changed = engine.bucketFill(position, settings.color);



        element("drawing-tool-status").textContent = changed

          ? "選択レイヤーへ塗りつぶしました。"

          : "色の変更はありません。閉じた領域を選んでください。";

      } else {

        const sampled = engine.pickColor(position);



        if (sampled) {

          settings.color = sampled;



          pickerHue = hexToHsv(sampled).hue;



          settings.tool =

            lastPaintingTool === "eraser" ? "pen" : lastPaintingTool;



          renderBrush();



          element("drawing-tool-status").textContent = "選択色：" + sampled;

        }

      }



      return;

    }



    if (!engine.begin(brush(), point(event))) return;



    event.preventDefault();



    canvas.focus({

      preventScroll: true,

    });



    canvas.setPointerCapture(event.pointerId);



    drawingPointer = event.pointerId;



    updateCursor(event);

  }




  function moveDrawing(event) {

    if (selectionControls.isDragging(event.pointerId)) {

      selectionControls.move(event, point(event));



      return;

    }



    if (drawingPointer !== null && drawingPointer !== event.pointerId)

      return;



    updateCursor(event);



    if (drawingPointer !== null && drawingEnabled())

      engine.move(point(event));

  }




  function endDrawing(event) {

    if (selectionControls.end(event)) {

      hideCursor();



      return;

    }



    if (drawingPointer === event.pointerId) finishStroke();



    if (event.type === "pointercancel" || event.pointerType === "touch")

      hideCursor();

  }




  function beginPanelSwipe(event) {

    swipe = null;



    if (!mobile || !sessionEnabled() || event.touches.length !== 1) return;



    if (

      event.target instanceof Element &&

      event.target.closest(

        'canvas,button,a,input,select,textarea,[role="slider"],[data-slot="slider"],.pro-color-field,.pro-layer-list,summary,dialog',

      )

    )

      return;



    const touch = event.touches[0];



    swipe = {

      x: touch.clientX,



      y: touch.clientY,



      time: event.timeStamp,

    };

  }




  function endPanelSwipe(event) {

    const start = swipe;



    swipe = null;



    if (

      !start ||

      event.touches.length !== 0 ||

      event.changedTouches.length !== 1

    )

      return;



    const touch = event.changedTouches[0];



    const next = drawingPanelAfterSwipe(

      panel,



      touch.clientX - start.x,



      touch.clientY - start.y,



      event.timeStamp - start.time,

    );



    if (next !== panel) openMobilePanel(next);

  }




  function openDialog(kind) {

    finishStroke();



    finishColorPick();



    engine.commitLayerOpacity();



    cancelLayerDrag();



    hideCursor();



    if (dialogKind) element(dialogKind + "-dialog").close();



    dialogKind = kind;



    if (kind === "finish") {

      const expired = clock.remaining === 0;



      element("finish-title").textContent = expired

        ? "制限時間が終了しました"

        : "描画を終了しますか？";



      element("continue-drawing").hidden = expired;



      element("confirm-finish").classList.toggle(

        "draw-dialog-full",



        expired,

      );

    }



    element(kind + "-dialog").showModal();



    renderAvailability();

  }




  function closeDialog() {

    if (!dialogKind || (dialogKind === "finish" && clock.remaining === 0))

      return;



    const current = element(dialogKind + "-dialog");



    dialogKind = null;



    current.close();



    renderAvailability();

  }







  function complete() {

    finishStroke();



    engine.commitLayerOpacity();



    engine.compose();



    const exported = document.createElement("canvas");



    exported.width = exported.height = 600;



    const context = exported.getContext("2d");



    try {

      if (!context) throw new Error("画像の保存を準備できませんでした。");



      context.fillStyle = "#ffffff";



      context.fillRect(0, 0, 600, 600);



      context.drawImage(canvas, 0, 0, 600, 600);



      const image = exported.toDataURL("image/jpeg", 0.88);



      sessionStorage.setItem(storageKeys.lastDrawing, image);



      sessionStorage.setItem(

        draftCreationStorageKey,



        encodeDraftCreation(image, new Date().toISOString()),

      );



      sessionStorage.setItem(

        storageKeys.lastDrawingDuration,



        encodeDraftDuration(image, duration),

      );



      sessionStorage.setItem(storageKeys.lastTheme, theme.id);



      window.location.href = "/draw/complete";

    } catch (error) {

      element("drawing-save-error").textContent =

        error instanceof Error

          ? error.message

          : "画像を保存できませんでした。保存設定と容量を確認してください。";



      element("drawing-save-error").hidden = false;

    }

  }




  function tick() {

    const next = drawingClock(Date.now(), startsAt, duration);



    const countdownChanged = clock.countdown !== next.countdown;



    clock = next;



    all("[data-countdown-inert]").forEach((node) => {

      node.inert = clock.countdown !== null;

    });



    element("drawing-countdown").hidden = clock.countdown === null;



    if (clock.countdown !== null && countdownChanged) {

      const replacement = countdownNumber.cloneNode(false);



      replacement.textContent = String(clock.countdown);



      countdownNumber.replaceWith(replacement);



      countdownNumber = replacement;

    }



    element("countdown-message").textContent =

      clock.countdown === 0 ? "まもなくスタート！" : "準備はいいですか？";



    all("[data-time-text]").forEach((node) => {

      node.textContent = formatTime(clock.remaining);

    });



    all("[data-timer-card]").forEach((node) =>

      node.classList.toggle("draw-timer-urgent", clock.remaining <= 10),

    );



    if (clock.remaining === 0 && dialogKind !== "finish")

      openDialog("finish");



    renderAvailability();

  }




  function animate(now) {

    if (!sessionEnabled() || document.hidden) lastFrame = 0;

    else if (!lastFrame) lastFrame = now;

    else if (now - lastFrame >= 33) {

      engine.update(Math.min(0.05, (now - lastFrame) / 1000));



      lastFrame = now;

    }



    requestAnimationFrame(animate);

  }




  selectionControls = createDrawingSelectionControls({

    root: document,



    canvas,



    engine,



    isEnabled: drawingEnabled,

  });



  buildOptions();




  all("[data-edit-tool]").forEach((button) =>

    button.addEventListener("click", () => {

      if (!sessionEnabled()) return;



      const tool = button.dataset.editTool;



      changeTools(() => {

        settings.tool = tool;

      });



      if (mobile) openMobilePanel("canvas");



      element("drawing-tool-status").textContent =

        tool === "bucket"

          ? "塗りたい閉じた領域を押してください。"

          : tool === "eyedropper"

            ? "色を取りたい場所を押してください。"

            : "ドラッグで範囲を指定し、移動・回転したら適用してください。";

    }),

  );




  function undoDrawing() {

    if (!sessionEnabled()) return;




    const hadSelection = engine.selectionInfo() !== null;



    finishStroke();



    if (hadSelection) return;



    engine.undo();



    renderLayers();

  }



  element("undo-button").addEventListener("click", undoDrawing);



  all("[data-ink-kind]").forEach((button) =>

    button.addEventListener("click", () =>

      changeTools(() => {

        settings.ink = button.dataset.inkKind;



        settings.tool = "ink";

      }),

    ),

  );



  all("[data-panel-button]").forEach((button) =>

    button.addEventListener("click", () => {

      const selected = button.dataset.panelButton;



      openMobilePanel(

        selected !== "canvas" && selected === panel ? "canvas" : selected,

      );

    }),

  );



  element("eraser-button").addEventListener("click", () =>

    changeTools(() => {

      settings.tool = "eraser";

    }),

  );



  element("normal-clear-button").addEventListener("click", () => {


    if (sessionEnabled() && engine.canDraw())

      layerAction((drawing) => drawing.clear());

  });



  amountInput.addEventListener("input", () =>

    changeTools(() => {

      settings.amount = Number(amountInput.value);

    }),

  );



  hueInput.addEventListener("input", () =>

    changeTools(() => {

      const hsv = hexToHsv(settings.color);



      pickerHue = Number(hueInput.value);



      settings.color = hsvToHex(pickerHue, hsv.saturation, hsv.value);

    }),

  );



  colorField.addEventListener("pointerdown", (event) => {

    if (!sessionEnabled() || !event.isPrimary || event.button !== 0) return;



    event.preventDefault();



    colorField.focus({

      preventScroll: true,

    });



    colorPointer = event.pointerId;



    colorField.setPointerCapture(event.pointerId);



    pickColor(event);

  });



  colorField.addEventListener("pointermove", (event) => {

    if (colorPointer === event.pointerId) pickColor(event);

  });



  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])

    colorField.addEventListener(name, (event) => {

      if (colorPointer === event.pointerId) finishColorPick();

    });



  colorField.addEventListener("keydown", (event) => {

    if (

      !sessionEnabled() ||

      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(

        event.key,

      )

    )

      return;



    event.preventDefault();



    const hsv = hexToHsv(settings.color);



    const step = event.shiftKey ? 0.1 : 0.02;



    const saturation = Math.max(

      0,



      Math.min(

        1,



        hsv.saturation +

          (event.key === "ArrowRight"

            ? step

            : event.key === "ArrowLeft"

              ? -step

              : 0),

      ),

    );



    const value = Math.max(

      0,



      Math.min(

        1,



        hsv.value +

          (event.key === "ArrowUp"

            ? step

            : event.key === "ArrowDown"

              ? -step

              : 0),

      ),

    );



    changeTools(() => {

      settings.color = hsvToHex(pickerHue, saturation, value);

    });

  });



  opacityInput.addEventListener("input", () =>

    layerAction((drawing) =>

      drawing.setLayerOpacity(

        engine.getActiveId(),



        Number(opacityInput.value) / 100,

      ),

    ),

  );



  for (const name of ["change", "pointerup", "pointercancel"])

    opacityInput.addEventListener(name, () => engine.commitLayerOpacity());



  element("add-layer").addEventListener("click", () =>

    layerAction((drawing) => drawing.addLayer()),

  );



  element("remove-layer").addEventListener("click", () =>

    layerAction((drawing) => drawing.removeLayer(engine.getActiveId())),

  );



  element("clear-layer").addEventListener("click", () =>

    layerAction((drawing) => drawing.clear(engine.getActiveId())),

  );



  layersDetails



    .querySelector("summary")



    .addEventListener("click", (event) => {

      if (mobile) event.preventDefault();

    });



  layersDetails.addEventListener("toggle", () => {

    if (!mobile) desktopLayersOpen = layersDetails.open;

  });



  canvas.addEventListener("pointerdown", beginDrawing);



  canvas.addEventListener("pointermove", moveDrawing);



  canvas.addEventListener("pointerenter", updateCursor);



  canvas.addEventListener("pointerleave", hideCursor);



  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])

    canvas.addEventListener(name, endDrawing);



  shell.addEventListener("touchstart", beginPanelSwipe, {

    passive: true,

  });



  shell.addEventListener("touchend", endPanelSwipe, {

    passive: true,

  });



  shell.addEventListener(

    "touchcancel",



    () => {

      swipe = null;

    },



    {

      passive: true,

    },

  );



  all("[data-open-dialog]").forEach((button) =>

    button.addEventListener("click", () =>

      openDialog(button.dataset.openDialog),

    ),

  );



  document



    .querySelectorAll("[data-close-dialog]")



    .forEach((button) => button.addEventListener("click", closeDialog));



  element("confirm-retire").addEventListener("click", () => {

    window.location.href = "/";

  });



  element("confirm-finish").addEventListener("click", complete);



  for (const kind of ["finish", "retire"]) {

    const dialog = element(kind + "-dialog");



    dialog.addEventListener("cancel", (event) => {

      event.preventDefault();



      closeDialog();

    });



    dialog.addEventListener("close", () => {

      if (dialogKind === kind) {

        dialogKind = null;



        renderAvailability();

      }

    });



    dialog.addEventListener("click", (event) => {

      const rect = dialog.getBoundingClientRect();



      if (

        event.target === dialog &&

        (event.clientX < rect.left ||

          event.clientX > rect.right ||

          event.clientY < rect.top ||

          event.clientY > rect.bottom)

      )

        closeDialog();

    });

  }



  window.addEventListener("keydown", (event) => {

    if (

      !sessionEnabled() ||

      event.isComposing ||

      event.altKey ||

      event.shiftKey ||

      !(event.ctrlKey || event.metaKey) ||

      event.key.toLowerCase() !== "z"

    )

      return;



    const target = event.target;



    if (

      target instanceof HTMLElement &&

      (target.isContentEditable ||

        target.closest(

          'input,textarea,select,[contenteditable]:not([contenteditable="false"])',

        ))

    )

      return;



    event.preventDefault();



    undoDrawing();

  });



  media.addEventListener("change", updateLayout);



  if (typeof ResizeObserver !== "undefined")

    new ResizeObserver(hideCursor).observe(canvas);



  window.addEventListener("blur", () => {

    finishStroke();



    finishColorPick();



    engine.commitLayerOpacity();



    cancelLayerDrag();



    hideCursor();

  });



  window.addEventListener("pagehide", finishStroke);



  renderBrush();



  renderLayers();



  updateLayout();



  tick();



  window.setInterval(tick, 100);



  requestAnimationFrame(animate);



  return {

    engine,



    openMobilePanel,

  };

}




if (

  typeof document !== "undefined" &&

  document.getElementById("drawing-shell")

)

  initDrawingPage();

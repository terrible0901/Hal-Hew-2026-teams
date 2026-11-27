
// @ts-check

import { normalizedRectangle } from "./drawing-pixel-tools.js";



/** @typedef {import("./drawing-engine.js").DrawingEngine} DrawingEngine */
/** @typedef {{x:number; y:number}} SelectionPoint */
/** @typedef {{x:number; y:number; width:number; height:number}} SelectionRectangle */
/** @typedef {{rect:SelectionRectangle; dx:number; dy:number; angle:number; layerId:number}} SelectionInfo */
/** @typedef {{root:Document; canvas:HTMLCanvasElement; engine:DrawingEngine; isEnabled:()=>boolean}} SelectionOptions */
/** @typedef {{kind:"new"|"move"|"rotate"; pointerId:number; start:SelectionPoint; last:SelectionPoint; base:SelectionInfo|null; startBearing:number}} SelectionDrag */

/**
 * 角度を-180度から180度へ揃えます。正負180度は操作した方向を保ちます。
 * @param {number} angle
 */
function normalizedAngle(angle) {

  let result = angle % 360;



  if (result > 180) result -= 360;



  if (result < -180) result += 360;



  return Object.is(result, -0) ? 0 : result;

}



/** @param {SelectionPoint} point 有限なキャンバス座標だけを受け付けます。 */
function validPoint(point) {

  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);

}



/**
 * テキストや数値を入力中のEnterは、選択の確定へ横取りしません。
 * HTMLElementが存在しないテスト環境でも、入力欄の意味を同じように判定します。
 * @param {EventTarget|null} target
 */
function editingTarget(target) {

  if (!target || typeof target !== "object") return false;



  const tag =

    "tagName" in target ? String(target.tagName).toLowerCase() : "";



  return (

    ["input", "textarea", "select"].includes(tag) ||

    ("isContentEditable" in target && target.isContentEditable === true)

  );

}



/**
 * キャンバス座標を、移動・回転前の矩形と比較できる局所座標へ戻します。
 * @param {SelectionPoint} point
 * @param {SelectionInfo} info
 */
function localPoint(point, info) {

  const centerX = info.rect.x + info.rect.width / 2 + info.dx;



  const centerY = info.rect.y + info.rect.height / 2 + info.dy;



  const radians = (-info.angle * Math.PI) / 180;



  const deltaX = point.x - centerX;



  const deltaY = point.y - centerY;



  return {

    x: deltaX * Math.cos(radians) - deltaY * Math.sin(radians),



    y: deltaX * Math.sin(radians) + deltaY * Math.cos(radians),

  };

}



/**
 * 既存HTMLのSVGと操作部品へ、範囲選択のイベントを登録します。
 * begin/move/endはページ側のPointerイベントから呼び、キー・ボタンはこの関数で登録します。
 * isEnabledは残り時間やダイアログを含むページ側の最新状態を返してください。
 * @param {SelectionOptions} options
 */
export function createDrawingSelectionControls({

  root,



  canvas,



  engine,



  isEnabled,

}) {

  const overlay = root.querySelector("#selection-overlay");



  const group = root.querySelector("#selection-outline-group");



  const outline = root.querySelector("#selection-outline");



  const rotationLine = root.querySelector("#selection-rotation-line");



  const rotationHandle = root.querySelector("#selection-rotation-handle");



  const controls = root.querySelector("#selection-controls");



  const angleInput = /** @type {HTMLInputElement|null} */ (

    root.querySelector("#selection-angle")

  );



  const angleText = root.querySelector("#selection-angle-text");



  const rotateLeft = /** @type {HTMLButtonElement|null} */ (

    root.querySelector("#rotate-left")

  );



  const rotateRight = /** @type {HTMLButtonElement|null} */ (

    root.querySelector("#rotate-right")

  );



  const applyButton = /** @type {HTMLButtonElement|null} */ (

    root.querySelector("#selection-apply")

  );



  const cancelButton = /** @type {HTMLButtonElement|null} */ (

    root.querySelector("#selection-cancel")

  );



  const status = root.querySelector("#drawing-tool-status");



  const inputControls = [

    angleInput,



    rotateLeft,



    rotateRight,



    applyButton,



    cancelButton,

  ];



  /** @type {SelectionDrag|null} */
  let drag = null;



  /** @type {SelectionRectangle|null} */
  let draft = null;



  let enabled = true;




  function canEdit() {

    return enabled && isEnabled();

  }



  /** @param {string} text 操作の案内はHTML文字列ではなく、文字として表示します。 */
  function announce(text) {


    if (status && status.textContent !== text) status.textContent = text;

  }



  /** @param {Element|null} element @param {boolean} hidden SVGにも有効なhidden属性を切り替えます。 */
  function hide(element, hidden) {

    element?.toggleAttribute("hidden", hidden);

  }



  /**
   * 所有するPointerだけを一度解放します。lostpointercaptureが同期してもドラッグは既に解除済みです。
   * @param {number} pointerId
   */
  function release(pointerId) {

    try {

      if (canvas.hasPointerCapture(pointerId))

        canvas.releasePointerCapture(pointerId);

    } catch {



    }

  }




  function refresh() {

    const info = engine.selectionInfo();



    const rectangle = drag?.kind === "new" ? draft : (info?.rect ?? null);



    hide(overlay, !rectangle);



    hide(controls, !info);



    const disabled = !info || !canEdit();



    for (const control of inputControls) {

      if (control) control.disabled = disabled;

    }



    if (angleInput)

      angleInput.value = String(

        Math.round(normalizedAngle(info?.angle ?? 0)),

      );



    if (angleText)

      angleText.textContent =

        Math.round(normalizedAngle(info?.angle ?? 0)) + "°";



    if (!rectangle) return;




    const centerX = rectangle.x + rectangle.width / 2;



    const centerY = rectangle.y + rectangle.height / 2;



    outline?.setAttribute("x", String(rectangle.x));



    outline?.setAttribute("y", String(rectangle.y));



    outline?.setAttribute("width", String(rectangle.width));



    outline?.setAttribute("height", String(rectangle.height));



    group?.setAttribute(

      "transform",



      "translate(" +

        (info?.dx ?? 0) +

        " " +

        (info?.dy ?? 0) +

        ") rotate(" +

        (info?.angle ?? 0) +

        " " +

        centerX +

        " " +

        centerY +

        ")",

    );



    rotationLine?.setAttribute("x1", String(centerX));



    rotationLine?.setAttribute("y1", String(rectangle.y));



    rotationLine?.setAttribute("x2", String(centerX));



    rotationLine?.setAttribute("y2", String(rectangle.y - 32));



    rotationHandle?.setAttribute("cx", String(centerX));



    rotationHandle?.setAttribute("cy", String(rectangle.y - 32));



    hide(rotationLine, !info);



    hide(rotationHandle, !info);



    if (info) {

      announce(

        "範囲の内側をドラッグして移動、上の丸で回転できます。確定または取消を選んでください。",

      );

    } else {

      announce("選択する範囲の反対側までドラッグしてください。");

    }

  }




  function cancel() {

    const current = drag;



    const hadSelection = !!engine.selectionInfo();



    drag = null;



    draft = null;



    if (current) release(current.pointerId);



    if (hadSelection) engine.cancelSelection();



    refresh();



    if (current || hadSelection)

      announce("範囲選択を取り消しました。元の絵は変更していません。");



    return !!current || hadSelection;

  }




  function apply() {

    if (!canEdit() || !engine.selectionInfo() || drag) return false;



    const changed = engine.commitSelection();



    draft = null;



    refresh();



    announce(

      changed

        ? "選択範囲の変更を確定しました。元に戻す操作で取り消せます。"

        : "変更がないため、選択を解除しました。",

    );



    return true;

  }



  /**
   * 範囲の内側は移動、上の丸の近くは回転、それ以外は新しい範囲の選択を始めます。
   * @param {PointerEvent} event
   * @param {SelectionPoint} point
   */
  function begin(event, point) {

    if (

      !canEdit() ||

      drag ||

      !validPoint(point) ||

      !Number.isInteger(event.pointerId) ||

      event.pointerId < 0 ||

      event.button > 0 ||

      event.isPrimary === false

    ) {

      return false;

    }



    const info = engine.selectionInfo();



    /** @type {"new"|"move"|"rotate"} */
    let kind = "new";



    let bearing = 0;



    if (info) {

      const local = localPoint(point, info);



      const inside =

        Math.abs(local.x) <= info.rect.width / 2 &&

        Math.abs(local.y) <= info.rect.height / 2;




      const screenWidth = canvas.getBoundingClientRect().width;



      const hitRadius = Math.max(

        24,



        Math.min(66, screenWidth > 0 ? (22 * 1024) / screenWidth : 24),

      );



      const handleDistance = Math.hypot(

        local.x,



        local.y + info.rect.height / 2 + 32,

      );



      if (inside) kind = "move";

      else if (handleDistance <= hitRadius) kind = "rotate";



      const centerX = info.rect.x + info.rect.width / 2 + info.dx;



      const centerY = info.rect.y + info.rect.height / 2 + info.dy;



      bearing =

        (Math.atan2(point.y - centerY, point.x - centerX) * 180) / Math.PI;

    }




    try {

      canvas.setPointerCapture(event.pointerId);

    } catch {

      return false;

    }



    if (kind === "new" && info) engine.cancelSelection();



    drag = {

      kind,



      pointerId: event.pointerId,



      start: {

        ...point,

      },



      last: {

        ...point,

      },



      base: kind === "new" ? null : info,



      startBearing: bearing,

    };



    draft = null;



    refresh();



    return true;

  }



  /**
   * 選択中はSVGだけを更新し、移動・回転中は元画像からのプレビューだけを更新します。
   * @param {PointerEvent} event
   * @param {SelectionPoint} point
   */
  function move(event, point) {

    if (!drag || drag.pointerId !== event.pointerId) return false;



    if (!canEdit()) {

      cancel();



      return true;

    }



    if (!validPoint(point)) return true;



    drag.last = {

      ...point,

    };



    if (drag.kind === "new") {

      draft = normalizedRectangle(drag.start, point, 1024, 1024);

    } else if (drag.base) {

      const { base } = drag;



      if (drag.kind === "move") {

        engine.previewSelection({

          dx: base.dx + point.x - drag.start.x,



          dy: base.dy + point.y - drag.start.y,



          angle: base.angle,

        });

      } else {

        const centerX = base.rect.x + base.rect.width / 2 + base.dx;



        const centerY = base.rect.y + base.rect.height / 2 + base.dy;



        const bearing =

          (Math.atan2(point.y - centerY, point.x - centerX) * 180) /

          Math.PI;



        engine.previewSelection({

          dx: base.dx,



          dy: base.dy,



          angle: normalizedAngle(base.angle + bearing - drag.startBearing),

        });

      }

    }



    refresh();



    return true;

  }



  /**
   * 正常なPointer終了ではプレビューを残します。取消・予期しない捕捉喪失では選択全体を戻します。
   * @param {PointerEvent} event
   */
  function end(event) {

    if (!drag || drag.pointerId !== event.pointerId) return false;



    const current = drag;



    drag = null;



    if (

      event.type === "pointercancel" ||

      event.type === "lostpointercapture" ||

      !canEdit()

    ) {

      draft = null;



      if (engine.selectionInfo()) engine.cancelSelection();



      release(current.pointerId);



      refresh();



      announce("操作が中断されたため、範囲選択を取り消しました。");



      return true;

    }



    if (current.kind === "new") {

      const rectangle = normalizedRectangle(

        current.start,



        current.last,



        1024,



        1024,

      );



      if (rectangle) engine.createSelection(rectangle);

    }



    draft = null;



    release(current.pointerId);



    refresh();



    if (!engine.selectionInfo())

      announce("範囲をドラッグして指定してください。");



    return true;

  }



  /** @param {number} difference 90度ボタンも、現在の移動量を維持して角度だけを変えます。 */
  function rotateBy(difference) {

    const info = engine.selectionInfo();



    if (!canEdit() || !info || drag) return;



    engine.previewSelection({

      dx: info.dx,



      dy: info.dy,



      angle: normalizedAngle(info.angle + difference),

    });



    refresh();

  }



  rotateLeft?.addEventListener("click", () => rotateBy(-90));



  rotateRight?.addEventListener("click", () => rotateBy(90));



  applyButton?.addEventListener("click", apply);



  cancelButton?.addEventListener("click", cancel);



  angleInput?.addEventListener("input", () => {

    const info = engine.selectionInfo();



    const angle = Number(angleInput.value);



    if (

      !canEdit() ||

      !info ||

      drag ||

      !angleInput.value.trim() ||

      !Number.isFinite(angle)

    )

      return;



    engine.previewSelection({

      dx: info.dx,



      dy: info.dy,



      angle: Math.max(-180, Math.min(180, angle)),

    });



    refresh();

  });




  root.addEventListener("keydown", (event) => {

    if (

      event.defaultPrevented ||

      event.ctrlKey ||

      event.metaKey ||

      event.altKey ||

      event.shiftKey

    )

      return;



    if (event.key === "Escape") {

      if (cancel()) event.preventDefault();

    } else if (event.key === "Enter" && !editingTarget(event.target)) {

      if (apply()) event.preventDefault();

    }

  });



  refresh();



  return {

    begin,



    move,



    end,



    cancel,



    refresh,



    /** @param {number} pointerId このPointerのドラッグだけを管理しているかを返します。 */
    isDragging: (pointerId) => drag?.pointerId === pointerId,



    /** @param {boolean} value 部品の有効状態だけを切り替え、選択は自動では取消しません。 */
    setEnabled(value) {

      enabled = value === true;



      refresh();

    },

  };

}

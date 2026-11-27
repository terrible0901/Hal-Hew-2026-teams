
// @ts-check

/** @typedef {import("./ink-diffusion.js").DiffusionKind} DiffusionKind */
/** @typedef {import("./ink-diffusion.js").InkKind} InkKind */
/** @typedef {import("./ink-diffusion.js").InkSnapshot} InkSnapshot */
/** @typedef {import("./pen-textures.js").PaperKind} PaperKind */
/** @typedef {| "plain"
  | "pencil"
  | "crayon"
  | "gpen"
  | "maru"
  | "spray"} PenKind */
/** @typedef {{
  tool: "pen" | "ink" | "eraser";
  pen: PenKind;
  width: number;
  color: string;
  diffusion: DiffusionKind;
  ink: InkKind;
  amount: number;
}} BrushSettings */
/** @typedef {{
  x: number;
  y: number;
  pressure: number;
  time: number;
}} DrawingPoint */
/** @typedef {{
  id: number;
  name: string;
  visible: boolean;
  opacity: number;
}} LayerInfo */
/** @typedef {LayerInfo & {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  ink: WaterInk;
}} Layer */
/** @typedef {{
  x: number;
  y: number;
  length: number;
  limit: number;
  speed: number;
  width: number;
  phase: number;
}} PaintDrip */
/** @typedef {{
  kind: "pixels";
  layer: Layer;
  pixels: ImageData;
  ink: InkSnapshot;
  bytes: number;
}} PixelsBefore */
/** @typedef {| PixelsBefore
  | {
      kind: "add" | "remove" | "visibility";
      layer: Layer;
      index: number;
      activeId: number;
      bytes: number;
    }
  | { kind: "order"; ids: number[]; bytes: number }
  | { kind: "opacity"; layer: Layer; opacity: number; bytes: number }} History */
/** @typedef {{x:number; y:number; width:number; height:number}} SelectionRectangle */
/** @typedef {{
  layer: Layer;
  before: PixelsBefore;
  flattened: HTMLCanvasElement;
  preview: HTMLCanvasElement;
  rect: SelectionRectangle;
  dx: number;
  dy: number;
  angle: number;
}} SelectionState */
import { WaterInk } from "./ink-diffusion.js";



import { createPaperTexture } from "./pen-textures.js";




import {

  createFillMask,

  colorAt,

  normalizedRectangle,

} from "./drawing-pixel-tools.js";




const firstSprayDripDelay = 0.2;



export const penTypes = [

  {

    id: "pencil",



    label: "鉛筆",

  },



  {

    id: "crayon",



    label: "クレヨン",

  },



  {

    id: "gpen",



    label: "Gペン",

  },



  {

    id: "maru",



    label: "丸ペン",

  },



  {

    id: "spray",



    label: "スプレー缶",

  },

];



export const brushWidths = [

  {

    width: 4,



    label: "極細",

  },



  {

    width: 8,



    label: "細",

  },



  {

    width: 16,



    label: "中",

  },



  {

    width: 28,



    label: "太",

  },

];



export const diffusionTypes = [

  {

    id: "cloud",



    label: "雲状拡散",



    detail: "クラウディ・ディフュージョン",

  },



  {

    id: "vortex",



    label: "渦・対流拡散",



    detail: "ボルテックス・リング",

  },

];



export function brushDiameter(settings) {

  if (settings.tool === "eraser") return Math.max(36, settings.width * 2);



  if (settings.tool === "ink") return 32 + settings.amount * 0.8;



  if (settings.pen === "spray") return Math.max(14, settings.width * 3.2);



  if (settings.pen === "pencil") return settings.width * 0.75;



  return settings.pen === "maru" ? settings.width * 0.55 : settings.width;

}



export class DrawingEngine {

  display;



  layers = [];



  nextId = 1;



  activeId = 1;



  history = [];



  stroke = null;



  context;



  merged;



  mergedContext;



  sprayStamp = null;



  opacityEdit = null;



  textureCanvas;



  textureContext;



  paperPatterns = new Map();



  /** @type {SelectionState | null} 未確定の選択は別Canvasで描き、レイヤー原本を変更しません。 */
  selection = null;



  constructor(display) {

    this.display = display;



    this.context = display.getContext("2d");



    this.merged = document.createElement("canvas");



    this.merged.width = this.merged.height = 900;



    this.mergedContext = this.merged.getContext("2d");



    this.textureCanvas = document.createElement("canvas");



    this.textureCanvas.width = this.textureCanvas.height = 900;



    this.textureContext = this.textureCanvas.getContext("2d");



    this.layers.push(this.createLayer());

  }



  createLayer() {

    const canvas = document.createElement("canvas");



    canvas.width = canvas.height = 900;



    const id = this.nextId++;



    return {

      id,



      name: `レイヤー${id}`,



      visible: true,



      opacity: 1,



      canvas,



      context: canvas.getContext("2d"),



      ink: new WaterInk(),

    };

  }



  getLayerInfo() {

    return this.layers.map(({ id, name, visible, opacity }) => ({

      id,



      name,



      visible,



      opacity,

    }));

  }



  getActiveId() {

    return this.activeId;

  }



  canDraw() {

    return this.layers.some(

      (layer) => layer.id === this.activeId && layer.visible,

    );

  }



  selectLayer(id) {

    this.cancelSelection();



    this.end();



    this.commitLayerOpacity();



    if (this.layers.some((layer) => layer.id === id)) this.activeId = id;

  }



  remember(item) {

    this.history.push(item);



    let bytes = this.history.reduce((sum, entry) => sum + entry.bytes, 0);



    while (this.history.length > 12 || bytes > 48 * 1024 * 1024)

      bytes -= this.history.shift().bytes;

  }



  rememberPixels(layer) {

    const pixels = layer.context.getImageData(0, 0, 900, 900);



    const ink = layer.ink.snapshot();



    this.remember({

      kind: "pixels",



      layer,



      pixels,



      ink,



      bytes: pixels.data.byteLength + ink.field.byteLength,

    });

  }



  /**
   * 筆線と拡散インクを、指定した作業用Canvasへ不透明度を掛けずに合成します。
   * @param {Layer} layer 合成する一枚のレイヤー。
   * @param {CanvasRenderingContext2D} target 900角の作業用描画先。
   */
  renderLayerTo(layer, target) {

    target.save();



    target.globalAlpha = 1;



    target.globalCompositeOperation = "source-over";



    target.clearRect(0, 0, 900, 900);



    target.drawImage(layer.canvas, 0, 0);



    target.drawImage(layer.ink.render(), 0, 0, 900, 900);



    target.restore();

  }



  /**
   * 見えている全レイヤーを境界として、選択中のレイヤーだけを塗りつぶします。
   * 同じ色の画素しかない場合は、インク状態とUndo履歴を変更しません。
   * @param {{x:number; y:number}} point 900角Canvas内の位置。
   * @param {string} color #rrggbb形式の塗る色。
   * @param {number} tolerance 色の境界を判定する許容差。
   * @returns {number} 実際に色が変わった画素数。無効な入力と無変更は0。
   */
  bucketFill(point, color, tolerance = 24) {

    if (

      !point ||

      typeof color !== "string" ||

      !/^#[0-9a-f]{6}$/i.test(color)

    )

      return 0;



    this.cancelSelection();



    this.end();



    this.commitLayerOpacity();



    const layer = this.layers.find((item) => item.id === this.activeId);



    if (!layer?.visible) return 0;



    this.compose();



    const reference = this.context.getImageData(0, 0, 900, 900);



    const region = createFillMask(reference, point.x, point.y, tolerance);



    if (!region) return 0;




    this.renderLayerTo(layer, this.mergedContext);



    const pixels = this.mergedContext.getImageData(0, 0, 900, 900);



    const channels = [1, 3, 5].map((offset) =>

      parseInt(color.slice(offset, offset + 2), 16),

    );



    let changed = 0;



    for (let index = 0; index < region.mask.length; index++) {

      if (!region.mask[index]) continue;



      const offset = index * 4;



      if (

        pixels.data[offset] === channels[0] &&

        pixels.data[offset + 1] === channels[1] &&

        pixels.data[offset + 2] === channels[2] &&

        pixels.data[offset + 3] === 255

      )

        continue;



      pixels.data[offset] = channels[0];



      pixels.data[offset + 1] = channels[1];



      pixels.data[offset + 2] = channels[2];



      pixels.data[offset + 3] = 255;



      changed++;

    }



    if (!changed) return 0;




    this.rememberPixels(layer);



    layer.context.putImageData(pixels, 0, 0);



    layer.ink.clear();



    this.compose();



    return changed;

  }



  /**
   * 表示中の全レイヤーと白い紙を含めた、見た目の色だけを読み取ります。
   * @param {{x:number; y:number}} point 900角Canvas内の位置。
   * @returns {string|null} #rrggbb形式の色。範囲外・無効値はnull。
   */
  pickColor(point) {

    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))

      return null;



    this.compose();



    return colorAt(

      this.context.getImageData(0, 0, 900, 900),



      point.x,



      point.y,

    );

  }



  /**
   * 指定矩形の選択を開始します。レイヤー原本へは一切書き込まず、別Canvasで表示します。
   * @param {SelectionRectangle} rectangle 900角座標の選択範囲。逆向きと範囲外は正規化します。
   * @returns {boolean} 有効な範囲と表示中の選択レイヤーがある場合だけtrue。
   */
  createSelection(rectangle) {

    if (!rectangle) return false;



    const rect = normalizedRectangle(

      {

        x: rectangle.x,



        y: rectangle.y,

      },



      {

        x: rectangle.x + rectangle.width,



        y: rectangle.y + rectangle.height,

      },



      900,



      900,

    );



    const layer = this.layers.find((item) => item.id === this.activeId);



    if (!rect || !layer?.visible) return false;



    this.cancelSelection();



    this.end();



    this.commitLayerOpacity();



    const pixels = layer.context.getImageData(0, 0, 900, 900);



    const ink = layer.ink.snapshot();



    const flattened = document.createElement("canvas");



    const preview = document.createElement("canvas");



    flattened.width =

      flattened.height =

      preview.width =

      preview.height =

        900;



    this.renderLayerTo(layer, flattened.getContext("2d"));



    this.selection = {

      layer,



      before: {

        kind: "pixels",



        layer,



        pixels,



        ink,



        bytes: pixels.data.byteLength + ink.field.byteLength,

      },



      flattened,



      preview,



      rect,



      dx: 0,



      dy: 0,



      angle: 0,

    };



    this.previewSelection({});



    return true;

  }



  /**
   * 元の矩形を毎回取り直して移動・回転を表示し、連続操作でも画質の劣化を重ねません。
   * @param {{dx?:number; dy?:number; angle?:number}} transform 移動量は900角座標、角度は度数。
   * @returns {boolean} 選択中かつ有限の変形値であればtrue。
   */
  previewSelection(transform = {}) {

    if (!transform || typeof transform !== "object") return false;



    const { dx = 0, dy = 0, angle = 0 } = transform;



    const selection = this.selection;



    if (!selection || ![dx, dy, angle].every(Number.isFinite)) return false;



    const { rect, flattened, preview } = selection;



    selection.dx = dx;



    selection.dy = dy;



    selection.angle = angle % 360;



    const target = preview.getContext("2d");



    target.save();



    target.globalAlpha = 1;



    target.globalCompositeOperation = "source-over";



    target.clearRect(0, 0, 900, 900);



    target.drawImage(flattened, 0, 0);



    target.clearRect(rect.x, rect.y, rect.width, rect.height);




    if (Math.abs(dx) <= 1800 && Math.abs(dy) <= 1800) {

      target.translate(

        rect.x + rect.width / 2 + dx,



        rect.y + rect.height / 2 + dy,

      );



      target.rotate((selection.angle * Math.PI) / 180);



      target.drawImage(

        flattened,



        rect.x,



        rect.y,



        rect.width,



        rect.height,



        -rect.width / 2,



        -rect.height / 2,



        rect.width,



        rect.height,

      );

    }



    target.restore();



    this.compose();



    return true;

  }



  /**
   * 実際に画素が変わった変形だけを確定し、元のRGBAとインクを一件のUndoへ残します。
   * @returns {boolean} 画素の変更を確定した場合だけtrue。空選択・同じ結果ではfalse。
   */
  commitSelection() {

    const selection = this.selection;



    if (!selection) return false;



    if (selection.dx === 0 && selection.dy === 0 && selection.angle === 0) {

      this.cancelSelection();



      return false;

    }



    const original = selection.flattened



      .getContext("2d")



      .getImageData(0, 0, 900, 900);



    const result = selection.preview



      .getContext("2d")



      .getImageData(0, 0, 900, 900);



    const changed = result.data.some(

      (value, index) => value !== original.data[index],

    );



    if (!changed) {

      this.cancelSelection();



      return false;

    }



    this.selection = null;



    this.remember(selection.before);



    selection.layer.context.putImageData(result, 0, 0);



    selection.layer.ink.clear();



    this.compose();



    return true;

  }



  /**
   * 別Canvasだけを破棄して選択前の表示へ戻します。原本もインクも履歴も変更しません。
   * @returns {boolean} 取り消す未確定選択があった場合だけtrue。
   */
  cancelSelection() {

    if (!this.selection) return false;



    this.selection = null;



    this.compose();



    return true;

  }



  /** @returns {{rect:SelectionRectangle; dx:number; dy:number; angle:number; layerId:number}|null} 外部から原本を変更できない選択情報のコピー。 */
  selectionInfo() {

    const selection = this.selection;



    return selection

      ? {

          rect: {

            ...selection.rect,

          },



          dx: selection.dx,



          dy: selection.dy,



          angle: selection.angle,



          layerId: selection.layer.id,

        }

      : null;

  }



  addLayer() {

    this.cancelSelection();



    this.commitLayerOpacity();



    if (this.layers.length >= 4) return;



    this.end();



    const layer = this.createLayer();



    this.remember({

      kind: "add",



      layer,



      index: this.layers.length,



      activeId: this.activeId,



      bytes: 0,

    });



    this.layers.push(layer);



    this.activeId = layer.id;



    this.compose();

  }



  removeLayer(id = this.activeId) {

    this.cancelSelection();



    this.commitLayerOpacity();



    if (this.layers.length <= 1) return;



    this.end();



    const index = this.layers.findIndex((layer) => layer.id === id);



    if (index < 0) return;



    const layer = this.layers[index];



    this.remember({

      kind: "remove",



      layer,



      index,



      activeId: this.activeId,



      bytes: 900 * 900 * 4 + layer.ink.memoryBytes,

    });



    this.layers.splice(index, 1);



    if (id === this.activeId)

      this.activeId = this.layers[Math.max(0, index - 1)].id;



    this.compose();

  }



  toggleLayer(id) {

    this.cancelSelection();



    this.commitLayerOpacity();



    this.end();



    const layer = this.layers.find((item) => item.id === id);



    if (!layer) return;



    this.remember({

      kind: "visibility",



      layer,



      index: 0,



      activeId: this.activeId,



      bytes: 0,

    });



    layer.visible = !layer.visible;



    this.compose();

  }



  moveLayer(id, direction) {

    const index = this.layers.findIndex((layer) => layer.id === id);



    if (index >= 0) this.moveLayerTo(id, index + direction);

  }



  // targetIndex is the final position in the bottom-to-top layer stack.
  moveLayerTo(id, targetIndex) {

    this.cancelSelection();



    const index = this.layers.findIndex((layer) => layer.id === id);



    if (

      index < 0 ||

      !Number.isInteger(targetIndex) ||

      targetIndex < 0 ||

      targetIndex >= this.layers.length ||

      index === targetIndex

    )

      return false;



    this.commitLayerOpacity();



    this.end();



    this.remember({

      kind: "order",



      ids: this.layers.map((layer) => layer.id),



      bytes: 0,

    });



    const [layer] = this.layers.splice(index, 1);



    this.layers.splice(targetIndex, 0, layer);



    this.compose();



    return true;

  }



  setLayerOpacity(id, value) {

    this.cancelSelection();



    if (!Number.isFinite(value)) return;



    this.end();



    const layer = this.layers.find((item) => item.id === id);



    if (!layer) return;



    const opacity = Math.max(0, Math.min(1, value));



    if (layer.opacity === opacity) return;



    if (this.opacityEdit?.layer !== layer) {

      this.commitLayerOpacity();



      this.opacityEdit = {

        layer,



        opacity: layer.opacity,

      };

    }



    layer.opacity = opacity;



    this.compose();

  }



  commitLayerOpacity() {

    const edit = this.opacityEdit;



    this.opacityEdit = null;



    if (edit && edit.layer.opacity !== edit.opacity)

      this.remember({

        kind: "opacity",



        ...edit,



        bytes: 0,

      });

  }



  clear(id = this.activeId) {

    this.cancelSelection();



    this.commitLayerOpacity();



    this.end();



    const layer = this.layers.find((item) => item.id === id);



    if (!layer) return;



    this.rememberPixels(layer);



    layer.context.clearRect(0, 0, 900, 900);



    layer.ink.clear();



    this.compose();

  }



  undo() {

    this.cancelSelection();



    this.commitLayerOpacity();



    this.end();



    const item = this.history.pop();



    if (!item) return;



    if (item.kind === "pixels") {

      item.layer.context.putImageData(item.pixels, 0, 0);



      item.layer.ink.restore(item.ink);



      this.activeId = item.layer.id;

    } else if (item.kind === "add") {

      this.layers = this.layers.filter(

        (layer) => layer.id !== item.layer.id,

      );



      this.activeId = item.activeId;

    } else if (item.kind === "remove") {

      this.layers.splice(item.index, 0, item.layer);



      this.activeId = item.activeId;

    } else if (item.kind === "order") {

      const byId = new Map(this.layers.map((layer) => [layer.id, layer]));



      this.layers = item.ids.map((id) => byId.get(id));

    } else if (item.kind === "opacity") {

      item.layer.opacity = item.opacity;

    } else {

      item.layer.visible = !item.layer.visible;

    }



    this.compose();

  }



  flattenInk(layer) {

    layer.context.save();



    layer.context.globalCompositeOperation = "source-over";



    layer.context.globalAlpha = 1;



    layer.context.drawImage(layer.ink.render(), 0, 0, 900, 900);



    layer.context.restore();



    layer.ink.clear();

  }



  begin(settings, point) {

    this.cancelSelection();




    if (!["pen", "ink", "eraser"].includes(settings.tool)) return false;



    this.commitLayerOpacity();



    const layer = this.layers.find((item) => item.id === this.activeId);



    if (!layer?.visible) return false;



    this.end();



    this.rememberPixels(layer);



    if (settings.tool !== "ink") this.flattenInk(layer);



    this.stroke = {

      layer,



      settings: {

        ...settings,

      },



      last: point,



      lastInk: point,



      sprayRemainder: 0,



      sprayAnchor: point,



      hold: 0,



      nextDrip: firstSprayDripDelay,



      drips: [],

    };



    if (settings.tool === "ink")

      layer.ink.add(

        point.x,



        point.y,



        settings.color,



        settings.diffusion,



        settings.ink,



        settings.amount,

      );

    else this.segment(layer.context, settings, point, point);



    this.compose();



    return true;

  }



  move(point) {

    if (!this.stroke) return;



    const { layer, settings, last, lastInk } = this.stroke;



    if (settings.tool === "ink") {

      const distance = Math.hypot(point.x - lastInk.x, point.y - lastInk.y);



      if (distance >= 26 || point.time - lastInk.time >= 180) {

        const steps = Math.min(12, Math.max(1, Math.floor(distance / 26)));



        for (let i = 1; i <= steps; i++)

          layer.ink.add(

            lastInk.x + ((point.x - lastInk.x) * i) / steps,



            lastInk.y + ((point.y - lastInk.y) * i) / steps,



            settings.color,



            settings.diffusion,



            settings.ink,



            settings.amount,

          );



        this.stroke.lastInk = point;

      }

    } else {

      if (

        settings.tool === "pen" &&

        settings.pen === "spray" &&

        Math.hypot(

          point.x - this.stroke.sprayAnchor.x,



          point.y - this.stroke.sprayAnchor.y,

        ) >

          brushDiameter(settings) * 0.2

      ) {

        this.stroke.sprayAnchor = point;



        this.stroke.hold = 0;



        this.stroke.nextDrip = firstSprayDripDelay;

      }



      this.segment(layer.context, settings, last, point);

    }



    this.stroke.last = point;



    this.compose();

  }



  end() {

    this.stroke = null;

  }



  segment(context, settings, from, to) {

    const diameter = brushDiameter(settings);



    const distance = Math.hypot(to.x - from.x, to.y - from.y);



    if (settings.pen === "spray" && settings.tool === "pen") {

      if (distance === 0 && from !== to) return;



      const steps = Math.max(

        1,



        Math.ceil(distance / Math.max(2, diameter * 0.22)),

      );



      for (let i = 1; i <= steps; i++)

        this.spray(

          context,



          settings,



          {

            ...to,



            x: from.x + ((to.x - from.x) * i) / steps,



            y: from.y + ((to.y - from.y) * i) / steps,

          },



          32,

        );



      return;

    }



    if (

      settings.tool === "pen" &&

      (settings.pen === "pencil" || settings.pen === "crayon")

    ) {

      this.texturedLine(context, settings, from, to, settings.pen);



      return;

    }



    const spacing =

      settings.pen === "gpen"

        ? Math.max(0.35, diameter * 0.035)

        : Math.max(0.8, diameter * 0.15);



    const steps = Math.max(1, Math.ceil(distance / spacing));



    context.save();



    context.globalCompositeOperation =

      settings.tool === "eraser" ? "destination-out" : "source-over";



    context.fillStyle = context.strokeStyle = settings.color;



    if (

      settings.pen === "plain" ||

      settings.tool === "eraser" ||

      settings.pen === "maru"

    ) {

      context.lineCap = context.lineJoin = "round";



      context.lineWidth = diameter;



      context.beginPath();



      context.moveTo(from.x, from.y);



      context.lineTo(to.x + 0.01, to.y + 0.01);



      context.stroke();

    } else {

      const speed = distance / Math.max(1, to.time - from.time);



      for (let i = 0; i <= steps; i++) {

        const x = from.x + ((to.x - from.x) * i) / steps,

          y = from.y + ((to.y - from.y) * i) / steps;



        if (settings.pen === "gpen") {

          const pressure =

            to.pressure !== 0.5 && to.pressure > 0

              ? to.pressure

              : Math.max(0.2, 0.95 - speed * 0.2);



          context.beginPath();



          context.ellipse(

            x,



            y,



            (diameter * pressure) / 2,



            ((diameter * pressure) / 2) * 0.7,



            -Math.PI / 4,



            0,



            Math.PI * 2,

          );



          context.fill();

        }

      }

    }



    context.restore();

  }



  texturedLine(target, settings, from, to, kind) {

    const diameter = brushDiameter(settings);



    const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - diameter)),

      top = Math.max(0, Math.floor(Math.min(from.y, to.y) - diameter));



    const right = Math.min(

        900,



        Math.ceil(Math.max(from.x, to.x) + diameter),

      ),

      bottom = Math.min(900, Math.ceil(Math.max(from.y, to.y) + diameter));



    const width = right - left,

      height = bottom - top;



    if (width <= 0 || height <= 0) return;



    const context = this.textureContext;



    let paper = this.paperPatterns.get(kind);



    if (!paper) {

      paper = context.createPattern(createPaperTexture(kind), "repeat");



      this.paperPatterns.set(kind, paper);

    }



    context.clearRect(left, top, width, height);



    context.save();



    context.globalCompositeOperation = "source-over";



    context.strokeStyle = settings.color;



    context.lineCap = context.lineJoin = "round";



    context.beginPath();



    context.moveTo(from.x, from.y);



    context.lineTo(to.x + 0.01, to.y + 0.01);



    context.globalAlpha = 0.22;



    context.lineWidth = diameter * 1.08;



    context.stroke();



    context.globalAlpha = kind === "crayon" ? 0.98 : 0.97;



    context.lineWidth = diameter * 0.92;



    context.stroke();



    context.globalAlpha = 1;



    context.globalCompositeOperation = "destination-in";



    context.fillStyle = paper;



    context.fillRect(left, top, width, height);



    context.restore();



    target.save();



    target.globalAlpha = 1;



    target.globalCompositeOperation = "source-over";



    target.drawImage(

      this.textureCanvas,



      left,



      top,



      width,



      height,



      left,



      top,



      width,



      height,

    );



    target.restore();

  }



  spray(context, settings, point, count) {

    const diameter = brushDiameter(settings);



    const key = `${settings.color}:${diameter}`;



    if (this.sprayStamp?.key !== key) {

      const canvas = document.createElement("canvas");



      canvas.width = canvas.height = Math.ceil(diameter * 1.15) + 2;



      const stamp = canvas.getContext("2d");



      const radius = diameter / 2,

        center = canvas.width / 2;



      const rgb = [1, 3, 5]



        .map((offset) =>

          parseInt(settings.color.slice(offset, offset + 2), 16),

        )



        .join(",");



      const gradient = stamp.createRadialGradient(

        center,



        center,



        0,



        center,



        center,



        radius,

      );



      gradient.addColorStop(0, `rgba(${rgb},1)`);



      gradient.addColorStop(0.35, `rgba(${rgb},1)`);



      gradient.addColorStop(0.6, `rgba(${rgb},0.7)`);



      gradient.addColorStop(0.82, `rgba(${rgb},0.13)`);



      gradient.addColorStop(1, `rgba(${rgb},0)`);



      stamp.fillStyle = gradient;



      stamp.fillRect(0, 0, canvas.width, canvas.height);



      stamp.fillStyle = settings.color;



      stamp.globalAlpha = 0.25;



      for (let i = 0; i < Math.ceil(diameter * 1.8); i++) {

        const angle = Math.random() * Math.PI * 2,

          r = radius * (0.65 + Math.random() * 0.48);



        const dot = 0.3 + Math.random() * 0.7;



        stamp.fillRect(

          center + Math.cos(angle) * r,



          center + Math.sin(angle) * r,



          dot,



          dot,

        );

      }



      this.sprayStamp = {

        key,



        canvas,

      };

    }



    context.save();



    context.globalCompositeOperation = "source-over";






    context.globalAlpha = 1 - Math.exp(-count / 45);



    const stamp = this.sprayStamp.canvas;



    context.drawImage(

      stamp,



      point.x - stamp.width / 2,



      point.y - stamp.height / 2,

    );



    context.restore();

  }



  update(dt) {


    if (this.selection) return;



    dt = Math.max(0, Math.min(0.05, dt));



    let changed = false;



    if (

      this.stroke?.settings.tool === "pen" &&

      this.stroke.settings.pen === "spray"

    ) {

      const stroke = this.stroke;



      stroke.sprayRemainder += 420 * dt;



      const dots = Math.floor(stroke.sprayRemainder);



      stroke.sprayRemainder -= dots;



      if (dots) {

        this.spray(

          stroke.layer.context,



          stroke.settings,



          stroke.last,



          dots,

        );



        changed = true;

      }



      stroke.hold += dt;



      if (stroke.hold >= stroke.nextDrip && stroke.drips.length < 6) {

        const diameter = brushDiameter(stroke.settings);



        stroke.drips.push({

          x: stroke.last.x + (Math.random() - 0.5) * diameter * 0.4,



          y: stroke.last.y + diameter * 0.2,



          length: 0,



          limit: diameter * (0.65 + Math.random() * 1.8),



          speed: diameter * (0.7 + Math.random()),



          width: Math.max(0.9, diameter * (0.014 + Math.random() * 0.022)),



          phase: Math.random() * Math.PI * 2,

        });



        stroke.nextDrip += 0.3;

      }



      const context = stroke.layer.context;



      context.save();



      context.globalCompositeOperation = "source-over";



      context.globalAlpha = 0.8;



      context.fillStyle = context.strokeStyle = stroke.settings.color;



      context.lineCap = "round";



      for (const drip of stroke.drips) {

        const length = Math.min(drip.limit, drip.length + drip.speed * dt);



        if (length === drip.length) continue;



        const drift = (value) =>

          Math.sin(value / 30 + drip.phase) * drip.width * 0.4;



        context.lineWidth = drip.width;



        context.beginPath();



        context.moveTo(drip.x + drift(drip.length), drip.y + drip.length);



        context.lineTo(drip.x + drift(length), drip.y + length);



        context.stroke();



        context.beginPath();



        context.arc(

          drip.x + drift(length),



          drip.y + length,



          drip.width * 0.75,



          0,



          Math.PI * 2,

        );



        context.fill();



        drip.length = length;



        changed = true;

      }



      context.restore();

    }



    for (const layer of this.layers)

      changed = layer.ink.update(dt) || changed;



    if (changed) this.compose();

  }



  compose() {

    this.context.save();



    this.context.globalAlpha = 1;



    this.context.globalCompositeOperation = "source-over";



    this.context.clearRect(0, 0, 900, 900);



    for (const layer of this.layers) {

      if (!layer.visible || layer.opacity === 0) continue;




      if (this.selection?.layer === layer) {

        this.context.globalAlpha = layer.opacity;



        this.context.drawImage(this.selection.preview, 0, 0);



        this.context.globalAlpha = 1;



        continue;

      }



      if (layer.opacity === 1) {

        this.context.drawImage(layer.canvas, 0, 0);



        this.context.drawImage(layer.ink.render(), 0, 0, 900, 900);

      } else {

        // Apply opacity once to the complete layer, not separately to pen and ink.
        this.renderLayerTo(layer, this.mergedContext);



        this.context.globalAlpha = layer.opacity;



        this.context.drawImage(this.merged, 0, 0);



        this.context.globalAlpha = 1;

      }

    }



    this.context.restore();

  }

}

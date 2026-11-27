
// @ts-check

/** @typedef {"canvas" | "tools" | "layers"} DrawingPanel */

export const mobileDrawingQuery =

  "(max-width: 1180px), (pointer: coarse) and (max-width: 1400px)";




export function drawingPanelAfterSwipe(panel, deltaX, deltaY, elapsedMs) {

  if (

    elapsedMs < 0 ||

    elapsedMs > 900 ||

    Math.abs(deltaX) < 48 ||

    Math.abs(deltaX) < Math.abs(deltaY) * 1.35

  ) {

    return panel;

  }





  if (panel === "canvas") return deltaX < 0 ? "tools" : "layers";



  if (panel === "tools" && deltaX > 0) return "canvas";



  if (panel === "layers" && deltaX < 0) return "canvas";



  return panel;

}

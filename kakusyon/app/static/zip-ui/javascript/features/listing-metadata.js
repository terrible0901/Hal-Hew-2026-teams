
// @ts-check

import { drawingFingerprint } from "./drawing-settings-data.js";




export const draftCreationStorageKey = "kakushon-last-drawing-created";




function validTimestamp(value) {

  if (

    typeof value !== "string" ||

    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(

      value,

    ) ||

    !Number.isFinite(Date.parse(value))

  )

    return false;



  const date = value.slice(0, 10);



  return new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date;

}




export function encodeDraftCreation(image, drawnAt) {

  if (!image || !validTimestamp(drawnAt))

    throw new Error("制作日時を確認できませんでした。");



  return JSON.stringify({

    imageFingerprint: drawingFingerprint(image),



    drawnAt,

  });

}




export function readDraftCreation(image, metadata) {

  try {

    const record = JSON.parse(metadata ?? "null");



    return image &&

      record?.imageFingerprint === drawingFingerprint(image) &&

      validTimestamp(record.drawnAt)

      ? record.drawnAt

      : undefined;

  } catch {

    return undefined;

  }

}




export function artworkCreationDate(artwork) {

  const timestamp = validTimestamp(artwork.drawnAt)

    ? artwork.drawnAt

    : validTimestamp(artwork.createdAt)

      ? artwork.createdAt

      : undefined;



  return timestamp

    ? new Intl.DateTimeFormat("ja-JP", {

        timeZone: "Asia/Tokyo",



        year: "numeric",



        month: "numeric",



        day: "numeric",

      }).format(new Date(timestamp))

    : "未記録";

}

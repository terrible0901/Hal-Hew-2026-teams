
// @ts-check





/** @param {{ id: string, createdAt: string }} artwork */
function displayTime(artwork) {

  const batch = /^collection-(\d{4})(\d{2})(\d{2})-/.exec(artwork.id);



  if (batch)

    return Date.parse(

      batch[1] + "-" + batch[2] + "-" + batch[3] + "T00:00:00+09:00",

    );



  const recorded = Date.parse(artwork.createdAt);



  return Number.isFinite(recorded) ? recorded : -Infinity;

}




/** @param {{ id: string, createdAt: string }} left @param {{ id: string, createdAt: string }} right */
export function compareArtworkNewest(left, right) {

  const leftTime = displayTime(left);



  const rightTime = displayTime(right);



  return leftTime === rightTime ? 0 : leftTime > rightTime ? -1 : 1;

}

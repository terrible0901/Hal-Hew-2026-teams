
import {


  getDrawingTheme,


} from "../features/drawing-settings-data.js";



import {



  storageKeys,

} from "../features/local-storage.js";



import {


  countDescriptionCharacters,

  isValidArtworkDescription,

} from "../features/auction-policy.js";



import { createDrawingSaveDialog } from "../common/image-save-dialog.js";




let image = "";



let theme = "food";









const errorMessage = document.querySelector("#complete-error");



const saveButton = document.querySelector("#complete-save");















const descriptionInput = document.querySelector("#complete-description");



const descriptionCount = document.querySelector(

  "#complete-description-count",

);




function setError(message) {

  errorMessage.textContent = message;



  errorMessage.hidden = !message;

}



try {

  image = sessionStorage.getItem(storageKeys.lastDrawing) ?? "";



  theme = sessionStorage.getItem(storageKeys.lastTheme) ?? "food";





} catch {

  setError(

    "作品データを読み込めませんでした。保存設定を確認してください。",

  );

}



const preview = document.querySelector("#complete-image");
if (preview.dataset.source) {
  image = preview.dataset.source;
  theme = ({domae:"doumae", chara:"character"})[preview.dataset.theme] || preview.dataset.theme;
}
const selectedTheme = getDrawingTheme(theme);



document.querySelector("#complete-theme").textContent =

  "お題：" + selectedTheme.label;



document.querySelector("#complete-image-frame").hidden = !image;



document.querySelector("#complete-empty").hidden = Boolean(image);



if (image) document.querySelector("#complete-image").src = image;



saveButton.disabled = !image;




createDrawingSaveDialog({

  dialog: document.querySelector("#complete-save-dialog"),



  trigger: saveButton,



  getImage: () => preview.dataset.original || image,



  returnTo: "/draw/complete",

});




function updateDescriptionCount() {

  const count = countDescriptionCharacters(descriptionInput.value.trim());



  descriptionCount.textContent = count + " / 100字";



  const invalid = !isValidArtworkDescription(descriptionInput.value);



  descriptionCount.classList.toggle("is-invalid", invalid);



  descriptionInput.setAttribute("aria-invalid", String(invalid));

}



descriptionInput.addEventListener("input", updateDescriptionCount);



updateDescriptionCount();




const form = document.querySelector("#complete-publish");
const publish = document.querySelector("#complete-publish-button");
publish.disabled = form.dataset.ready !== "1";
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity() || publish.disabled) return;
  publish.disabled = true;
  try {
    const response = await fetch(form.action, {method: "POST", body: new FormData(form)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    location.assign(result.redirect);
  } catch (error) {
    setError(error.message || "出品できませんでした。もう一度お試しください。");
    publish.disabled = false;
  }
});

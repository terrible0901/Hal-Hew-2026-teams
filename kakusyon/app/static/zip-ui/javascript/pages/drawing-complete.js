
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



  getImage: () => image,



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




document.querySelector("#complete-publish").addEventListener("submit", (event) => event.preventDefault());


import {

  drawingThemes,

  drawingTimes,

  getDrawingTheme,

  randomDrawingTheme,

} from "../features/drawing-settings-data.js";




let seconds = 60;



let theme = "food";



let mode = null;



const modeDialog = document.querySelector("#setup-mode-dialog");



const modeLabel = document.querySelector("#setup-mode-label");



const startButton = document.querySelector("#setup-start");



const background = document.querySelector("#setup-background");



const randomResult = document.querySelector("#setup-random-result");



const timeContainer = document.querySelector("#setup-times");



const themeContainer = document.querySelector("#setup-themes");







function appendOption(templateId, container, label, value, choose) {

  const template = document.querySelector(templateId);



  const fragment = template.content.cloneNode(true);



  const button = fragment.querySelector("button");



  button.textContent = label;



  button.dataset.value = String(value);



  button.addEventListener("click", choose);



  container.append(fragment);

}




function renderSelection() {

  for (const button of timeContainer.querySelectorAll("button")) {

    button.setAttribute(

      "aria-pressed",



      String(Number(button.dataset.value) === seconds),

    );

  }



  for (const button of themeContainer.querySelectorAll("button")) {

    button.setAttribute(

      "aria-pressed",



      String(button.dataset.value === theme),

    );

  }



  background.src = getDrawingTheme(theme).image;



  modeLabel.textContent = mode === "pro" ? "プロモード" : "通常モード";



  startButton.disabled = mode === null;

}




function openModeSelection() {

  mode = null;



  renderSelection();



  if (!modeDialog.open) {

    modeDialog.showModal();

  }

}



for (const item of drawingTimes) {

  appendOption(

    "#setup-time-template",



    timeContainer,



    item.label,



    item.seconds,



    () => {

      seconds = item.seconds;



      renderSelection();

    },

  );

}



for (const item of drawingThemes) {

  appendOption(

    "#setup-theme-template",



    themeContainer,



    item.label,



    item.id,



    () => {

      theme = item.id;




      randomResult.textContent = "";



      randomResult.hidden = true;



      renderSelection();

    },

  );

}




modeDialog.addEventListener("cancel", (event) => event.preventDefault());



for (const button of modeDialog.querySelectorAll("[data-mode]")) {

  button.addEventListener("click", () => {

    mode = button.dataset.mode;



    modeDialog.close();



    renderSelection();

  });

}



document



  .querySelector("#setup-change-mode")



  .addEventListener("click", openModeSelection);



document.querySelector("#setup-random").addEventListener("click", () => {

  const selected = randomDrawingTheme();



  theme = selected.id;




  randomResult.hidden = false;



  randomResult.textContent = `選ばれたお題：${selected.label}`;



  renderSelection();

});




startButton.addEventListener("click", () => {

  if (mode !== "normal" && mode !== "pro") {

    return;

  }



  const query = new URLSearchParams({

    time: {30: "short", 60: "mid", 3600: "long"}[seconds],



    theme: {character: "chara", doumae: "domae"}[theme] ?? theme,



    mode,

  });



  window.location.href = `/draw/canvas?${query}`;

});



renderSelection();



openModeSelection();

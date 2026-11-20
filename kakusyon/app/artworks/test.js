document.getElementById("publish").onclick = async () => {
  const blob = await (await fetch(dataUrl)).blob();

  const fd = new FormData();
  fd.append("image", blob, "drawing.png");
  // append other publish fields here too (title, description, ...)

  const res = await fetch("/upload_image", { method: "POST", body: fd });
  if (res.ok) {
    sessionStorage.removeItem("draft_image");
    window.location.href = "/";   // or the new post's page
  }
};
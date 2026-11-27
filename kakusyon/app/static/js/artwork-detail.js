const artworkImage = document.getElementById("artwork-image");
function showImageSize() {
    if (!artworkImage.naturalWidth) return;
    const size = document.getElementById("artwork-size");
    size.querySelector("dd").textContent = `${artworkImage.naturalWidth} × ${artworkImage.naturalHeight} px`;
    size.hidden = false;
}
artworkImage.addEventListener("load", showImageSize);
showImageSize();

async function loadRelatedArtworks() {
    const grid = document.getElementById("related-artworks");
    const status = document.getElementById("related-status");
    try {
        const response = await fetch(grid.dataset.src);
        if (!response.ok) throw new Error();
        const page = new DOMParser().parseFromString(await response.text(), "text/html");
        const cards = page.querySelectorAll(".artwork-card-shell");
        grid.replaceChildren(...cards);
        if (!cards.length) status.textContent = "ほかに表示できる作品はありません。";
    } catch {
        status.textContent = "ほかの作品を読み込めませんでした。";
    }
}
loadRelatedArtworks();

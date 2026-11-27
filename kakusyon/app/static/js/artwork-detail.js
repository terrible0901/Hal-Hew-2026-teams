const artworkImage = document.getElementById("artwork-image");
function showImageSize() {
    if (!artworkImage.naturalWidth) return;
    const size = document.getElementById("artwork-size");
    const original = Number(artworkImage.dataset.originalSize);
    size.querySelector("dd").textContent = `${original || artworkImage.naturalWidth} × ${original || artworkImage.naturalHeight} px`;
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

const dialog = document.getElementById("auction-confirm");
const confirmButton = document.getElementById("confirm-action");
const backButton = document.getElementById("keep-editing");
const artworkTitle = document.querySelector("[data-art-title]").textContent;
let pendingForm = null;

document.querySelectorAll("form[data-confirm]").forEach(form => {
    form.addEventListener("submit", event => {
        event.preventDefault();
        pendingForm = form;
        const fields = form.elements;
        const action = form.dataset.action;
        let detail = "「" + artworkTitle + "」の出品を取り消します。";
        if (action === "bid") {
            detail = "「" + artworkTitle + "」に" + Number(fields.bid_amount.value).toLocaleString("ja-JP") + "ptで入札します。";
        } else if (action === "relist") {
            detail = "「" + artworkTitle + "」を開始価格" + Number(fields.price.value).toLocaleString("ja-JP") + "pt、開催時間" + fields.minutes.value + "分で再出品します。";
        }
        dialog.querySelector("h2").textContent = form.dataset.confirm;
        dialog.querySelector("p").textContent = detail;
        confirmButton.textContent = {bid:"入札する", cancel:"取り消す", relist:"再出品する"}[action];
        backButton.textContent = action === "cancel" ? "出品を続ける" : "戻る";
        confirmButton.disabled = false;
        dialog.showModal();
    });
});

backButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => { pendingForm = null; });
confirmButton.addEventListener("click", () => {
    if (!pendingForm || !pendingForm.reportValidity()) return;
    confirmButton.disabled = true;
    pendingForm.submit();
});

window.addEventListener("pageshow", event => {
    if (event.persisted && dialog.open) dialog.close();
});

const deadline = document.querySelector("[data-state-url]");
async function refreshAuction() {
    try {
        if (document.hidden) return;
        const response = await fetch(deadline.dataset.stateUrl, {cache:"no-store"});
        if (!response.ok) return;
        const state = await response.json();
        if (state.status !== "active") { location.reload(); return; }
        document.querySelector("[data-auction-time]").textContent =
            Math.floor(Math.max(0,state.remaining)/60) + "分" + Math.max(0,state.remaining)%60 + "秒";
        document.querySelector("[data-auction-price]").textContent =
            Number(state.current_price).toLocaleString("ja-JP") + "pt";
        const form = document.querySelector("[data-bid-form]");
        if (form && pendingForm !== form && Number(form.elements.seen_price.value) !== state.current_price) {
            form.elements.seen_price.value = state.current_price;
            form.elements.bid_amount.min = state.current_price + 1;
            form.elements.bid_amount.value = Math.max(state.current_price + 1, Number(form.elements.bid_amount.value));
        }
    } catch { /* The next refresh retries transient connection failures. */ }
    finally { window.setTimeout(refreshAuction, 2500); }
}
if (deadline?.dataset.stateUrl) window.setTimeout(refreshAuction, 2500);

const region = document.querySelector(".advertisements");
const slides = [...region.querySelectorAll(".ad-slide")];
const dots = [...region.querySelectorAll(".ad-dots button")];
const dialog = region.querySelector(".ad-dialog");
const poster = dialog.querySelector("img");
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
let selected = 0;
let touchStart;
let lastSwipe = -Infinity;

function select(index) {
    selected = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
        slide.hidden = position !== selected;
        dots[position].setAttribute("aria-pressed", String(position === selected));
    });
}

region.querySelector(".ad-prev").addEventListener("click", () => select(selected - 1));
region.querySelector(".ad-next").addEventListener("click", () => select(selected + 1));
dots.forEach((dot, index) => dot.addEventListener("click", () => select(index)));
slides.forEach((slide) => slide.addEventListener("click", () => {
    if (performance.now() - lastSwipe < 400) return;
    const image = slide.querySelector("img");
    poster.src = image.src;
    poster.alt = image.alt;
    dialog.querySelector("h2").textContent = slide.dataset.category + "の広告";
    dialog.showModal();
}));
dialog.querySelector(".ad-modal-stage").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => slides[selected].focus());
region.addEventListener("keydown", (event) => {
    if (dialog.open || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    select(selected + (event.key === "ArrowLeft" ? -1 : 1));
    slides[selected].focus();
});
const banner = region.querySelector(".banner");
banner.addEventListener("touchstart", (event) => {
    touchStart = event.changedTouches[0];
}, { passive: true });
banner.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.clientX;
    const dy = touch.clientY - touchStart.clientY;
    touchStart = undefined;
    if (Math.abs(dx) <= 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    lastSwipe = performance.now();
    select(selected + (dx < 0 ? 1 : -1));
}, { passive: true });
banner.addEventListener("touchcancel", () => { touchStart = undefined; });
window.setInterval(() => {
    if (!motion.matches && !region.matches(":hover, :focus-within") && !dialog.open && !document.hidden) {
        select(selected + 1);
    }
}, 6000);

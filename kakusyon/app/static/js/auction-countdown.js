// Each list response contains the time remaining when MariaDB read the auctions.
export function startCountdowns(list, receivedAt, refreshList) {
    const timers = Array.from(list.querySelectorAll("[data-remaining-seconds]"), element => ({
        element,
        deadline: receivedAt + Number(element.dataset.remainingSeconds) * 1000,
    }));
    if (!timers.length) return;

    let timeout;
    function update() {
        clearTimeout(timeout);
        if (document.hidden) return;

        const now = Date.now();
        let expired = false;
        for (const {element, deadline} of timers) {
            const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
            const hours = Math.floor(seconds / 3600);
            const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
            const remainder = String(seconds % 60).padStart(2, "0");
            element.textContent = `残り ${hours}:${minutes}:${remainder}`;
            if (!seconds) expired = true;
        }
        if (expired) {
            document.removeEventListener("visibilitychange", update);
            window.removeEventListener("pageshow", update);
            refreshList();
        } else {
            timeout = setTimeout(update, 1000);
        }
    }
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    update();
}

const list = document.querySelector("[data-auction-list]");
if (list) {
    const navigation = performance.getEntriesByType("navigation")[0];
    const receivedAt = navigation ? performance.timeOrigin + navigation.responseStart : Date.now();
    startCountdowns(list, receivedAt, () => location.reload());
}

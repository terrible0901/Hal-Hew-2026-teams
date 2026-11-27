document.querySelectorAll("[data-remove-favorite]").forEach(form => {
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const button = form.querySelector("button");
        const error = document.getElementById("favorite-error");
        if (button.disabled) return;
        button.disabled = true;
        error.hidden = true;
        try {
            const response = await fetch(form.getAttribute("action"), {method:"POST", body:new FormData(form)});
            if (!response.ok) throw new Error();
            // Reload the list from Flask so the count, empty state and login are authoritative.
            location.reload();
        } catch {
            error.textContent = "お気に入りを更新できませんでした。もう一度お試しください。";
            error.hidden = false;
            button.disabled = false;
        }
    });
});

const period = document.getElementById("ledger-period");
if (period) {
    const table = document.querySelector(".coin-history-table");
    const rows = table.querySelectorAll("[data-month]");
    const update = () => {
        const parts = new Intl.DateTimeFormat("en", {timeZone:"Asia/Tokyo", year:"numeric", month:"numeric"}).formatToParts();
        const value = type => Number(parts.find(part => part.type === type).value);
        const month = value("year") * 12 + value("month");
        let count = 0;
        for (const row of rows) {
            const age = month - Number(row.dataset.month);
            row.hidden = period.value !== "all" && (age < 0 || age > (period.value === "quarter" ? 2 : 0));
            if (!row.hidden) count++;
        }
        table.hidden = count === 0;
        document.getElementById("period-empty").hidden = count !== 0;
    };
    document.querySelector("[data-period-controls]").hidden = false;
    period.addEventListener("change", update);
    update();
}

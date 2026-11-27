document.querySelectorAll(".password-toggle").forEach((button) => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    button.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute("aria-pressed", String(show));
        button.setAttribute("aria-label", show ? "パスワードを隠す" : "パスワードを表示");
    });
});

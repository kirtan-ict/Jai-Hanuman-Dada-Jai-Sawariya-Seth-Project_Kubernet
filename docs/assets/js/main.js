// KubeSetu — shared site behaviour (nav toggle, active link, theme, year).
(function () {
  var root = document.documentElement;

  // Theme: remember the viewer's choice; default follows the OS.
  try {
    var saved = localStorage.getItem("ks-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", function () {
    // Mobile nav
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    // Active nav link (infra-*.html pages highlight "Infrastructure")
    var page = location.pathname.split("/").pop() || "index.html";
    if (page.indexOf("infra-") === 0) page = "infrastructure.html";
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      if (a.getAttribute("href") === page) a.classList.add("active");
    });

    // Theme toggle
    var tt = document.querySelector(".theme-toggle");
    if (tt) {
      tt.addEventListener("click", function () {
        var dark = root.getAttribute("data-theme") === "dark" ||
          (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
        var next = dark ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("ks-theme", next); } catch (e) {}
      });
    }

    // Footer year
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  });
})();

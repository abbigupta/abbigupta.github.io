document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.querySelector(".site-nav");
  const portrait = document.querySelector(".portrait");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (portrait) {
    portrait.addEventListener("error", () => portrait.classList.add("is-hidden"));
  }

  if (menuButton && navigation) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.querySelector("span").textContent = "Menu";
      navigation.classList.remove("open");
      document.body.classList.remove("menu-open");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.querySelector("span").textContent = isOpen ? "Menu" : "Close";
      navigation.classList.toggle("open", !isOpen);
      document.body.classList.toggle("menu-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  document.querySelectorAll(".research-card").forEach((card) => {
    card.addEventListener("toggle", () => {
      const label = card.querySelector(".expand-text");
      if (label) label.textContent = card.open ? "Hide details" : "View details";
    });
  });
});

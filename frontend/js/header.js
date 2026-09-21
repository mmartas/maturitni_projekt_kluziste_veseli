// kontrola jestli už existuje prvek, v tomto případě je to hamburger menu
document.addEventListener("click", function(event) {
    const hamMenuIcon = event.target.closest(".hamMenuIcon");

    if (!hamMenuIcon) return;

    let mainNavMenu = document.querySelector(".mainNavMenu");
    let navBarContainer = document.querySelector(".navbar_container");

    hamMenuIcon.classList.toggle("active");
    if (mainNavMenu) {
        mainNavMenu.classList.toggle("active");
    }

    if (hamMenuIcon.classList.contains("active")) {
        if (mainNavMenu) mainNavMenu.classList.add("box_glass_effect");
        document.body.classList.add('no-scroll');
        if (navBarContainer) navBarContainer.classList.add("ham_active");
    } else {
        if (mainNavMenu) mainNavMenu.classList.remove("box_glass_effect");
        document.body.classList.remove('no-scroll');
        if (navBarContainer) navBarContainer.classList.remove("ham_active");
    }
});

// sledování změny šířky okna
let widthValue = window.matchMedia("(min-width: 930px)");
widthValue.addEventListener("change", function(event) {
    if (widthValue.matches) {
        let hamMenuIcon = document.querySelector(".hamMenuIcon");
        let mainNavMenu = document.querySelector(".mainNavMenu");
        let navBarContainer = document.querySelector(".navbar_container");

        if (hamMenuIcon) hamMenuIcon.classList.remove("active");
        if (mainNavMenu) mainNavMenu.classList.remove("active", "box_glass_effect");
        document.body.classList.remove('no-scroll');
        if (navBarContainer) navBarContainer.classList.remove("ham_active");
    }
});
// šipka pro scroll nahoru
const ArrowToScroll = document.getElementById("arrow_top_scroll")
window.addEventListener("scroll", function(event){
    if(this.window.scrollY > 2000){
        ArrowToScroll.classList.add("active")
    } else {
        ArrowToScroll.classList.remove("active")
    }
});
ArrowToScroll.addEventListener("click", function(){
    smoothScrollToTop(700);
});

// plynulé zobrazení textu při scrollu
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1
});
reveals.forEach(el => observer.observe(el));

// přepínání fotek na úvodu
const images = document.querySelectorAll("#titleCarousel img");
let index = 0;

setInterval(() => {
    images[index].classList.remove("active");
    index = (index + 1) % images.length;
    images[index].classList.add("active");
}, 2500);


// načtení hlavičky a patičky z externích souborů a obarvení aktivního odkazu v menu
document.addEventListener("DOMContentLoaded", function() {
    const isSubpage = window.location.pathname.includes('/pages/');
    const basePath = isSubpage ? '../' : '';

    fetch(basePath + 'includes/header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('header-placeholder').innerHTML = data;

        const homeLogoLink = document.getElementById('homeLogoLink');
        if (homeLogoLink) {
            if (isSubpage) {
                homeLogoLink.setAttribute('href', '../index.html');
            } else {
                homeLogoLink.setAttribute('href', 'index.html');
            }
        }

        const currentPath = window.location.pathname;
        let currentFile = currentPath.split('/').pop();
        if (!currentFile || currentFile === '') currentFile = 'index.html';

        const headerLinks = document.querySelectorAll('#header-placeholder nav a');
        headerLinks.forEach(link => {
            let href = link.getAttribute('href');

            if (isSubpage) {
                if (href === 'index.html' || href === '/index.html') {
                    link.setAttribute('href', '../index.html');
                } else if (href && href.startsWith('pages/')) {
                    link.setAttribute('href', href.replace('pages/', ''));
                }
            }

            const updatedHref = link.getAttribute('href');

            if (updatedHref && updatedHref.includes(currentFile)) {
                link.classList.add('active');
            }
        });
    });

    fetch(basePath + 'includes/footer.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('footer-placeholder').innerHTML = data;
    });
});


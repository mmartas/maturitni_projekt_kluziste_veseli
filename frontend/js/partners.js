const partnersData = [
    {
        name: "Stavby Vanto",
        url: "https://www.vanto.cz/",
        image: "../images/partners/stavbyvanto.jpg"
    },
    {
        name: "Trigema",
        url: "https://www.trigema.cz/",
        image: "../images/partners/trigema.jpg"
    },
    {
        name: "Vesbyt",
        url: "https://www.vesbyt.cz/",
        image: "../images/partners/vesbyt.jpg"
    },
    {
        name: "Veselí nad Moravou",
        url: "https://www.veseli-nad-moravou.cz/",
        image: "../images/partners/veselinadmoravou.jpg"
    },
    {
        name: "Vesnet",
        url: "https://www.vesnet.cz/",
        image: "../images/partners/vesnet.jpg"
    },
    {
        name: "Zlomek",
        url: "https://www.zlomek.cz/",
        image: "../images/partners/zlomek.jpg"
    },
    {
        name: "Prostěfitko",
        url: "https://www.prostefitko.cz/",
        image: "../images/partners/prostefitko.jpg"
    },
    {
        name: "AGG",
        url: "https://www.agg.cz/",
        image: "../images/partners/agg.jpg"
    },
    {
        name: "Bene Zelenina",
        url: "https://www.benezelenina.cz/",
        image: "../images/partners/benezelenina.jpg"
    },
    {
        name: "Biogena",
        url: "https://www.biogena.cz/",
        image: "../images/partners/biogena.jpg"
    },
    {
        name: "Dog in Dock",
        url: "https://www.dogindock.cz/",
        image: "../images/partners/dogindock.jpg"
    },
    {
        name: "Bistro Dog in Dock",
        url: "https://www.dogindock.cz/bistro",
        image: "../images/partners/dogindockbistro.jpg"
    },
    {
        name: "Elektroinstalace Hýl",
        url: "https://www.elektroinstalacehyl.cz/",
        image: "../images/partners/elektrohyl.jpg"
    },
    {
        name: "Elektroinstalace David Sedlář",
        url: "https://www.davidsedlar.cz/",
        image: "../images/partners/elektrosedlar.jpg"
    },
    {
        name: "Fafek",
        url: "https://www.elektrofafek.cz/",
        image: "../images/partners/fafek.jpg"
    },
    {
        name: "Florstyl",
        url: "https://www.florstyl.cz/",
        image: "../images/partners/florstyl.jpg"
    },
    {
        name: "Inteza",
        url: "https://www.inteza.cz/",
        image: "../images/partners/inteza.jpg"
    },
    {
        name: "Koupelny Popelka",
        url: "https://www.koupelny-popelka.cz/",
        image: "../images/partners/koupelnypopelka.jpg"
    },
    {
        name: "Kovokon",
        url: "https://www.kovokon.cz/",
        image: "../images/partners/kovokon.jpg"
    },
    {
        name: "Makuluku",
        url: "https://www.makuluku.cz/",
        image: "../images/partners/makuluku.jpg"
    },
    {
        name: "Na kole dětem",
        url: "https://www.nakoledetem.cz/",
        image: "../images/partners/nakoledetem.jpg"
    },
    {
        name: "Penzion Hermína",
        url: "https://www.herminapenzion.cz/",
        image: "../images/partners/penzionhermina.jpg"
    },
    {
        name: "Pneu Plus",
        url: "https://www.pneuplus.cz/",
        image: "../images/partners/pneuplus.jpg"
    },
    {
        name: "Rádio Jih",
        url: "https://www.radiojih.cz/",
        image: "../images/partners/radiojih.jpg"
    },
    {
        name: "Stavby Remina",
        url: "https://www.stavbyremina.cz/",
        image: "../images/partners/stavbyremina.jpg"
    }
];

const container = document.querySelector(".partners_container");

partnersData.forEach(partner => {
    const oneCard = document.createElement("section");
    oneCard.classList.add("partners");

    oneCard.innerHTML =
    `
        <a href="${partner.url}" target="_blank">
            <div class="text_section box_glass_effect">
                <div class="wrapper">
                    <img src="${partner.image}" alt="">
                    <h2 class="title">${partner.name}</h2>
                </div>
            </div>
        </a>
    `
    container.appendChild(oneCard);
});
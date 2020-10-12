window.onload = function () {

    //instanciation du notificateur
    var notifier = new AWN();

    //obtention des éléments HTML pertinents
    var listeNoire = document.querySelector("table[valeurslistenoire]");
    var listeBlanche = document.querySelector("table[valeurslisteblanche]");
    var severite = document.querySelectorAll("input[type = 'radio']");
    var groupes = document.querySelector(".dropdown-select");
    var donneesSeverite = [];  //tableau de plusieurs dimensions contenant la sévérité par groupes. ex : [[1,10,false],[3,45,9],[2,20,true]]
    // var severiteSelectionne = document.querySelector(input[checked]);
    for (let i = 0; i < 4; i++) {
        document.querySelector(`span[n${i + 1}]`).innerHTML = (chrome.i18n.getMessage("options_niveau") + (i + 1));
        document.querySelector(`span[n${i + 1}]+span`).innerHTML = chrome.i18n.getMessage(`options_l${i + 1}_text`);
    }

    //affecter le texte de la bonne langue aux éléments HTML
    document.querySelector(`#lntitre`).innerHTML = chrome.i18n.getMessage(`options_listenoire`);
    document.querySelector(`#lbtitre`).innerHTML = chrome.i18n.getMessage(`options_listeblanche`);
    document.querySelector(`#textegroupeactuel`).innerHTML = chrome.i18n.getMessage(`options_textegroupe`);
    document.querySelector(`a[options]`).innerHTML = chrome.i18n.getMessage(`options_options`);
    document.querySelector(`a[horaire]`).innerHTML = chrome.i18n.getMessage(`options_horaire`);
    document.querySelector(`a[dons]`).innerHTML = chrome.i18n.getMessage(`options_dons`);
    document.querySelector(`a[credits]`).innerHTML = chrome.i18n.getMessage(`options_credits`);
    document.querySelector(`a[bug]`).innerHTML = chrome.i18n.getMessage(`options_reportbug`);
    document.querySelector(`a[suggerer]`).innerHTML = chrome.i18n.getMessage(`options_suggestfeature`);

    chrome.storage.sync.get(["donneesListeNoire", "donneesListeBlanche"], function (donnees) {
        if (typeof donnees["donneesListeNoire"] !== "undefined") {
            listeNoire.innerHTML = LZString.decompressFromUTF16(donnees["donneesListeNoire"]);
        }
        if (typeof donnees["donneesListeBlanche"] !== "undefined") {
            listeBlanche.innerHTML = LZString.decompressFromUTF16(donnees["donneesListeBlanche"]);
        }
    });

    var bloque = false;

    loadBlocage();
    charger();
    lancerModalDeSoutien();
    loadChart();


    //charge le texte des boutons de sévérité
    let messageEntreeTempsSeverite = [
        chrome.i18n.getMessage("options_onseveriteinput_l1"),
        chrome.i18n.getMessage("options_onseveriteinput_l2"),
        chrome.i18n.getMessage("options_onseveriteinput_l3"),
        chrome.i18n.getMessage("options_onseveriteinput_l4")
    ];

    //logique des boutons de sévérité
    for (let i = 0, length = severite.length; i < length; i++) {
        severite[i].addEventListener("click", function () {
            if ((i + 1) > donneesSeverite[groupes.options.selectedIndex][0] || !bloque) {
                severite[i].parentElement.querySelector("span[temps]").innerHTML = "";
                setTimeout(() => {
                    let temps = parseFloat(prompt(messageEntreeTempsSeverite[i]));
                    if (!isNaN(temps) && (temps >= 0) && (temps <= 500)) {
                        let donneesConformes = true;
                        let debut = i < 2 ? confirm(chrome.i18n.getMessage("options_onseveriteinput_debutquestion")) : false;
                        if (i === 2) {
                            debut = parseFloat(prompt(chrome.i18n.getMessage("options_onseveriteinput_l3_2")));
                            donneesConformes = !isNaN(debut) && (debut >= 0) && (debut <= 600);
                        }
                        if (donneesConformes) {
                            donneesSeverite[groupes.options.selectedIndex] = [parseInt(severite[i].id[1]), temps, debut];
                            if (i === 1) donneesSeverite[groupes.options.selectedIndex].push(confirm(chrome.i18n.getMessage("options_onseveriteinput_l2_2")));
                            let textProprietes = "";
                            if (i !== 2) {
                                textProprietes = "[" + (debut ? chrome.i18n.getMessage("options_onseveriteinput_debut") : "") + (i < 2 ? chrome.i18n.getMessage("options_onseveriteinput_chaque") : chrome.i18n.getMessage("options_onseveriteinput_apres")) + temps + chrome.i18n.getMessage("options_onseveriteinput_min") + ((i === 1 && donneesSeverite[groupes.options.selectedIndex][3] === true) ? chrome.i18n.getMessage("options_onseveriteinput_plusphrase") : "") + "]";
                            } else {
                                textProprietes = `[${chrome.i18n.getMessage("options_onseveriteinput_chaque")}${temps}${chrome.i18n.getMessage("options_onseveriteinput_min")} ${chrome.i18n.getMessage("options_onseveriteinput_pour")}` + (debut !== 0 ? `${debut}${chrome.i18n.getMessage("options_onseveriteinput_min")}` : `${chrome.i18n.getMessage("options_onseveriteinput_toutelajournee")}`) + "]";
                            }
                            severite[i].parentElement.querySelector("span[temps]").innerHTML = textProprietes;
                            chrome.storage.sync.set({
                                donneesSeverite: donneesSeverite
                            });
                        }
                        else {
                            alert(chrome.i18n.getMessage("options_onseveriteinput_invalid"));
                            charger();
                        }
                    }
                    else {
                        alert(chrome.i18n.getMessage("options_onseveriteinput_invalid"));
                        charger();
                    }
                }, 500);
            } else {
                alert(chrome.i18n.getMessage("horaire_periodedeblocageniveau"));
                charger();
            }
        });
    }

    //n'affiche que les urls du groupe séléctionné
    function affichageListeParGroupe() {
        let listes = [listeNoire, listeBlanche];
        for (let i = 0, length = listes.length; i < length; i++) {
            for (let row of listes[i].rows) {
                if (row.getAttribute("togroup") !== groupes.value) {
                    row.style.display = 'none';
                } else {
                    row.style.removeProperty("display");
                }
            }
        }
    }

    //affiche le bon bouton de sévérité par groupes
    function affichageSeveriteParGroupe() {
        let selectedIndex = groupes.options.selectedIndex;
        let radioBtnDeCeGroupe = document.querySelector(`#l${donneesSeverite[selectedIndex][0] !== 0 ? donneesSeverite[selectedIndex][0] : 1}`);
        console.log('indexRadio:', `#l${donneesSeverite[selectedIndex][0]}`);
        radioBtnDeCeGroupe.checked = "checked";
        if (donneesSeverite[selectedIndex][0] !== 0) {
            let textProprietes = "";
            if ((donneesSeverite[selectedIndex][0] - 1) !== 2) {
                textProprietes = "[" + (donneesSeverite[selectedIndex][2] ? chrome.i18n.getMessage("options_onseveriteinput_debut") : "")
                    + ((donneesSeverite[selectedIndex][0] - 1) < 2 ? chrome.i18n.getMessage("options_onseveriteinput_chaque") : chrome.i18n.getMessage("options_onseveriteinput_apres")) + donneesSeverite[selectedIndex][1] + chrome.i18n.getMessage("options_onseveriteinput_min") + (((donneesSeverite[selectedIndex][0] - 1) === 1 && donneesSeverite[selectedIndex][3] === true) ? chrome.i18n.getMessage("options_onseveriteinput_plusphrase") : "") + "]";
            } else {
                textProprietes = `[${chrome.i18n.getMessage("options_onseveriteinput_chaque")}${donneesSeverite[selectedIndex][1]}${chrome.i18n.getMessage("options_onseveriteinput_min")} ${chrome.i18n.getMessage("options_onseveriteinput_pour")}` + (donneesSeverite[selectedIndex][2] !== 0 ? `${donneesSeverite[selectedIndex][2]}${chrome.i18n.getMessage("options_onseveriteinput_min")}` : `${chrome.i18n.getMessage("options_onseveriteinput_toutelajournee")}`) + "]";
            }
            radioBtnDeCeGroupe.parentElement.querySelector("span[temps]").innerHTML = textProprietes;
        } else {
            radioBtnDeCeGroupe.parentElement.querySelector("span[temps]").innerHTML = chrome.i18n.getMessage("options_onseveriteinput_inactive");
        }


    }
    //charge la date du blocage
    function loadBlocage() {
        chrome.storage.sync.get('dateFinBlocage', function (arg) {
            if (typeof arg.dateFinBlocage !== 'undefined') {
                if (arg.dateFinBlocage[0] > Date.now()) {
                    bloque = true;
                }
            }
        });
    }

    //Création du graphique des données hebdomadaires
    function loadChart() {
        const round2Dec = (num) => {
            return Math.round((num + Number.EPSILON) * 100) / 100
        };
        chrome.storage.local.get('archiveTempsParUrl', function (arg) {
            let colorPatterns = ["#114C47", "#0EB8D7", "#E3EEA8", "#97C749", "#33332F", "#3F4D49", "#5F7265", "#91B48C", "#D4CA9B", "#FBEDAD",
                "#284153", "#23939E", "#ADC17E", "#FFFDEE", "#F3CF86", "#23527D", "#64A2C0", "#C8DBD1", "#DAE5B3", "#A6A727",
                "#49534F", "#749A93", "#8DCDBE", "#F4F3D2", "#E56737", "#2A3B33", "#578D84", "#9FC5B2", "#D0D8DA", "#F5F2F4",
                "#C2ECF4", "#53C094", "#14410E", "#A41B1A", "#693C2E", "#3A6E5B"];
            let archiveTempsParUrl = [[], [], [], [], [], [], []];
            if (typeof arg.archiveTempsParUrl !== 'undefined') {
                archiveTempsParUrl = arg.archiveTempsParUrl;
            }
            let archiveTempsParUrlTries = archiveTempsParUrl.map(x => x.length !== 0 ? selectionSort(x[0]) : x);  //TODO Commenter tous ces lignes
            let archiveTempsParUrlTriesAvecHeures = archiveTempsParUrlTries.map(x => x.length !== 0 ? x.map(y => [y[0], round2Dec(y[1] / (60 * 60))]) : x)
            let urlsParJours = archiveTempsParUrlTriesAvecHeures.map(y => y.length !== 0 ? y.map(x => x[0]).slice(0, 6) : y);
            let urlsParJoursAvecAutres = urlsParJours.map(y => y.length !== 0 ? y.slice(0, 5).concat(y.length === 6 ? ["Others"] : []) : y);
            let tempsParUrlParJours = archiveTempsParUrlTriesAvecHeures.map(y => y.length !== 0 ? y.map(x => x[1]) : y);
            let tempsParUrlParJoursAvecAutres = tempsParUrlParJours.map(y => y.length !== 0 ? y.slice(0, 5).concat((y.slice(5).reduce((a, b) => a + b, 0)) !== 0 ? [y.slice(5).reduce((a, b) => a + b, 0)] : []) : y);
            let couleursParUrl = [...new Set(urlsParJoursAvecAutres.flat())].map((x, i) => x = [x, colorPatterns[i]]);

            console.log(`archiveTempsParUrl:`, archiveTempsParUrl);
            // console.log(`archiveTempsParUrlTries:`, archiveTempsParUrlTries);
            // console.log(`archiveTempsParUrlTriesAvecHeures:`, archiveTempsParUrlTriesAvecHeures);
            // console.log(`urlsParJours:`, urlsParJours);
            // console.log(`urlsParJoursAvecAutres:`, urlsParJoursAvecAutres);
            // console.log(`tempsParUrlParJours:`, tempsParUrlParJours);
            // console.log(`tempsParUrlParJoursAvecAutres:`, tempsParUrlParJoursAvecAutres);
            // console.log(`couleursParUrl:`, couleursParUrl);

            let dataset = [];
            const loadDataArray = (pos, val) => {
                let arr = [];
                arr[pos] = val;
                for (let i = 0, length = arr.length - 1; i < length; i++) {
                    arr[i] = null;
                }
                return arr
            };

            for (let i = 0, length = urlsParJoursAvecAutres.length; i < length; i++) {
                for (let j = 0, length2 = urlsParJoursAvecAutres[i].length; j < length2; j++) {
                    if (tempsParUrlParJoursAvecAutres[i][j] !== 0) {
                        dataset.push({
                            label: urlsParJoursAvecAutres[i][j],
                            backgroundColor: couleursParUrl.find(x => x[0] === urlsParJoursAvecAutres[i][j])[1],
                            data: loadDataArray(urlsParJoursAvecAutres.length - 1 - i, tempsParUrlParJoursAvecAutres[i][j])
                        });
                    }
                }
            }

            console.log(`dataset:`, dataset);


            new Chart(document.getElementById('myChart'), {
                type: 'bar',
                data: {
                    labels: ['6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Yesterday', 'Today'], //TODO Ajouter les langues
                    datasets: dataset
                    // [{
                    //     label: 'Employee',
                    //     backgroundColor: "#caf270",
                    //     data: [12, 59, 5, 56, 58, 12, 59, 87, 45],
                    // }, {
                    //     label: 'Government',
                    //     backgroundColor: "#008d93",
                    //     data: [12, 59, 5, 56],
                    // }, {
                    //     label: 'Political parties',
                    //     backgroundColor: "#2e5468",
                    //     data: [12, 59, 5, 56, 58, 12, 59, 12, 74],
                    // }]
                    ,
                },
                options: {
                    title: {
                        display: true,
                        text: 'Browsing time in hours per day'
                    },
                    scales: {
                        xAxes: [{
                            stacked: true,
                            gridLines: {
                                display: false,
                            }
                        }],
                        yAxes: [{
                            stacked: true,
                            ticks: {
                                beginAtZero: true,
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Hours'    //TODO Ajouter les langues
                            },
                            type: 'linear',
                        }]
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                        itemSort: function (a, b) {
                            return b.datasetIndex - a.datasetIndex
                        },
                        callbacks: {
                            label: function (tooltipItem, data) {
                                let index = tooltipItem.index;
                                let datasetIndex = tooltipItem.datasetIndex;
                                let label = data.datasets[tooltipItem.datasetIndex].label || '';
                                let value = data.datasets[datasetIndex].data[index];
                                if (label) {
                                    label += ' : ';
                                }
                                if (value === null) {
                                    // label += "-";
                                    return null;
                                } else {
                                    label += tooltipItem.yLabel;
                                }
                                return label;
                            }
                        }
                    },
                    legend: { display: false, position: 'bottom' },
                    aspectRatio: 1,
                }
            });

        });
    }

    function selectionSort(arr) {
        var minIdx, temp,
            len = arr.length;
        for (var i = 0; i < len; i++) {
            minIdx = i;
            for (var j = i + 1; j < len; j++) {
                if (arr[j][1] > arr[minIdx][1]) {
                    minIdx = j;
                }
            }
            temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
        }
        return arr;
    }

    //demande de l'aide à l'utilisateur après certains jours d'utilisation. (Expliquer ce qu'on peut améliorer, Dons, étoiles store, Partager sur les réseaux sociaux)
    function lancerModalDeSoutien() {
        chrome.storage.sync.get(['firstOpeningTimestamp', 'helpModalWasActivated'], function (arg) {
            let helpModalWasNeverActivated = typeof arg.helpModalWasActivated === 'undefined';
            if (typeof arg.firstOpeningTimestamp !== 'undefined' && (helpModalWasNeverActivated || arg.helpModalWasActivated !== true)) {
                if ((arg.firstOpeningTimestamp + 1000 * 60 * 60 * 24 * (helpModalWasNeverActivated ? 10 : 3)) < (new Date()).setHours(6, 0, 0, 0)) {
                    chrome.storage.sync.set({ helpModalWasActivated: true });
                    let contenu = /*html*/`
                    <div style="margin:0 auto; text-align: center;">
                        <p>
                            ${chrome.i18n.getMessage("options_modal_first")}
                        <p>
                        <fieldset class="starability-slot" style="margin:0 auto;">
                            <input type="radio" id="no-rate" class="input-no-rate" name="rating" value="0" checked aria-label="No rating." />
                            <input type="radio" id="first-rate1" name="rating" value="1" />
                            <label for="first-rate1" title="Terrible">1 star</label>
                            <input type="radio" id="first-rate2" name="rating" value="2" />
                            <label for="first-rate2" title="Not good">2 stars</label>
                            <input type="radio" id="first-rate3" name="rating" value="3" />
                            <label for="first-rate3" title="Average">3 stars</label>
                            <input type="radio" id="first-rate4" name="rating" value="4" />
                            <label for="first-rate4" title="Very good">4 stars</label>
                            <input type="radio" id="first-rate5" name="rating" value="5" />
                            <label for="first-rate5" title="Amazing">5 stars</label>
                        </fieldset>
                    <div>
                `;
                    let modalBox = notifier.modal(contenu).newNode.querySelector(".awn-popup-body");
                    let stars = modalBox.querySelectorAll("input");
                    for (let star of stars) {
                        star.addEventListener('click', () => {
                            if (star.value > 3) {
                                modalBox.innerHTML = /*html*/`
                                <div style="text-align:center;">
                                    ${chrome.i18n.getMessage("options_modal_good")}
                                <div>
                                <div class="modalbuttons" style="width:fit-content; display: flex; flex-direction: column; flex-wrap:wrap; height: 100px">
                                    <a href="https://www.paypal.me/hadiyahia" target="_blank" class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_donate")}</a>
                                    <a href="https://chrome.google.com/webstore/detail/time-companion/jjnbbklfpecnjcfehhebmfmibicklgdo" target="_blank" class="btn btn-3 long-text-btn" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_rate")}</a>
                                    <a id=modalsharebutton class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_share")}</a>
                                    <a id=modalafterbutton class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_after")}</a>
                                    <a id=modalclosebutton class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_close")}</a>
                                <div>
                                `;
                                modalBox.querySelector("#modalsharebutton").addEventListener('click', () => {
                                    document.querySelector('div[data-network=sharethis]').click();
                                });
                                modalBox.querySelector("#modalafterbutton").addEventListener('click', () => {
                                    chrome.storage.sync.set({
                                        firstOpeningTimestamp: Date.now(),
                                        helpModalWasActivated: false
                                    });
                                    document.querySelector('#awn-popup-wrapper').click();
                                });
                                modalBox.querySelector("#modalclosebutton").addEventListener('click', () => {
                                    document.querySelector('#awn-popup-wrapper').click();
                                });
                            } else {
                                console.log(`star.value:`, star.value);
                                modalBox.innerHTML = /*html*/`
                                <div style="text-align:center;">
                                    ${chrome.i18n.getMessage("options_modal_bad")}
                                <div>
                                <div>
                                <span class="modalbuttons" style="width:fit-content; display: flex; flex-direction: column; flex-wrap:wrap; height: 50px; margin: 0 0 0 20px;">
                                    <a id=modalyesbutton href="mailto:hadiyahia@hotmail.com" class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_yes")}</a>
                                    <a id=modalafterbutton class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_after")}</a>
                                    <a id=modalclosebutton class="btn btn-3" style="box-shadow:0 0 0 0 black; text-transform: none; flex: 1;">${chrome.i18n.getMessage("options_modal_no")}</a>
                                <span>
                                <div>
                                `;
                                modalBox.querySelector("#modalafterbutton").addEventListener('click', () => {
                                    chrome.storage.sync.set({
                                        firstOpeningTimestamp: Date.now(),
                                        helpModalWasActivated: false
                                    });
                                    document.querySelector('#awn-popup-wrapper').click();
                                });
                                modalBox.querySelector("#modalclosebutton").addEventListener('click', () => {
                                    document.querySelector('#awn-popup-wrapper').click();
                                });
                                modalBox.querySelector("#modalyesbutton").addEventListener('click', () => {
                                    document.querySelector('#awn-popup-wrapper').click();
                                });
                            }
                        });
                    }

                }
            }
        });
    }

    //charge les groupes et les données de sévérités et donne la logique au bouton de groupes
    function charger() {
        chrome.storage.sync.get(["groupes", "donneesSeverite"], function (arg) {
            if (typeof arg["groupes"] !== 'undefined') {
                groupes.innerHTML = arg["groupes"][0];
            } else {
                if (groupes.options.length === 0) {
                    groupes.innerHTML += `<option value="${chrome.i18n.getMessage("options_groupe")}_1">${chrome.i18n.getMessage("options_groupe")} 1</option>`;
                }
            }

            if (typeof arg.donneesSeverite !== 'undefined') {
                donneesSeverite = arg.donneesSeverite;
            } else {
                let tableauTemporaire = [];
                if (groupes.options.length > 0) {
                    for (let i = 0; i < groupes.options.length; i++) {
                        tableauTemporaire.push([0, 0, false]);
                    }
                } else {
                    tableauTemporaire = [[0, 0, false]];
                }
                donneesSeverite = tableauTemporaire;
                console.log('SavedfirstDonneesSeverite');
                chrome.storage.sync.set({ donneesSeverite: tableauTemporaire });
            }

            affichageListeParGroupe();
            affichageSeveriteParGroupe();

            groupes.addEventListener("change", function () {
                let selectedIndex = groupes.options.selectedIndex;
                console.log('selectedIndex:', selectedIndex);
                for (let option of groupes.options) {
                    option.removeAttribute("selected");
                }
                groupes.options[selectedIndex].setAttribute("selected", "selected");
                chrome.storage.sync.set({ groupes: [groupes.innerHTML, Array.from(groupes.options).map(x => x.value)] });
                affichageListeParGroupe();
                affichageSeveriteParGroupe();
            });

            console.log('donneesSeverite:', donneesSeverite);
        });

    }





};
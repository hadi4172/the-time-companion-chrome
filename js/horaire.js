window.onload = () => {

    // document.querySelector("h1[commingsoon]").innerHTML=chrome.i18n.getMessage("horaire_comingsoon");

    document.title = chrome.i18n.getMessage("horaire_titre")

    document.querySelector("p[description]").innerHTML = chrome.i18n.getMessage("horaire_description");
    document.querySelector("#addpause").innerHTML = chrome.i18n.getMessage("horaire_addpause");
    document.querySelector("#save").innerHTML = chrome.i18n.getMessage("horaire_save");
    document.querySelector("#back").innerHTML = chrome.i18n.getMessage("horaire_back");
    document.querySelector("h2[jour]").innerHTML = chrome.i18n.getMessage("horaire_jour");
    document.querySelector("h2[debut]").innerHTML = chrome.i18n.getMessage("horaire_debut");
    document.querySelector("h2[fin]").innerHTML = chrome.i18n.getMessage("horaire_fin");
    document.querySelector('label[for="dateblocage"]').innerHTML = chrome.i18n.getMessage("horaire_bloquerchangements");

    var btnAjoutPause = document.querySelector("#addpause");
    var btnEnregistrer = document.querySelector("#save");
    var tableauHoraires = document.querySelector("#tableaudhoraire");
    var btnConfirmerBlocage = document.querySelector("#confirmer");
    var selecteurDeDate = document.querySelector("#dateblocage");

    var saveBeforeQuit = false;
    var bloque = false;

    btnConfirmerBlocage.innerHTML = chrome.i18n.getMessage("horaire_confirmer");

    load();

    window.onbeforeunload = function (e) {
        if (saveBeforeQuit) {
            return chrome.i18n.getMessage("setlist_onbeforeunload");
        };
    };

    btnEnregistrer.addEventListener("click", function () {
        if (!bloque) {
            btnEnregistrer.style.removeProperty("box-shadow");
            save();
        } else {
            alert(chrome.i18n.getMessage("horaire_periodedeblocage"));
            btnEnregistrer.setAttribute("disabled", "disabled");
        }
        saveBeforeQuit = false;
    });

    btnConfirmerBlocage.addEventListener("click", function () {
        if (confirm(chrome.i18n.getMessage("horaire_messageconfirmation"))) {
            if (selecteurDeDate.value === "") {
                alert(chrome.i18n.getMessage("horaire_dateinvalide"));  
            } else {
                let decoupageDeDateEntree = selecteurDeDate.value.split(/[-T:]/g);
                decoupageDeDateEntree[1]--;   //car le mois commence à 0
                let timestampDeLiberation = (new Date(...decoupageDeDateEntree)).getTime();
                if (timestampDeLiberation > Date.now()) {
                    chrome.storage.sync.set({ dateFinBlocage: [timestampDeLiberation, selecteurDeDate.value] });
                    btnConfirmerBlocage.setAttribute("disabled", "disabled");
                    bloque = true;
                }
            }
        }
    });

    btnAjoutPause.addEventListener('click', function () {
        if (!bloque) {
            if (document.querySelectorAll("select").length < 11) {
                let ligneHoraire = document.createElement('tr');
                ligneHoraire.innerHTML =
                    `
        <td>
            <select></select>
        </td>
        <td>
            <input debut type="time"/>
        </td>
        <td>
            <input fin type="time"/>
        </td>
        <td style="text-align: left;">
            <i class="fa fa-trash fa-2x"></i>
        </td>        
        `;

                let optionsJour = [
                    chrome.i18n.getMessage("horaire_lundi"),
                    chrome.i18n.getMessage("horaire_mardi"),
                    chrome.i18n.getMessage("horaire_mercredi"),
                    chrome.i18n.getMessage("horaire_jeudi"),
                    chrome.i18n.getMessage("horaire_vendredi"),
                    chrome.i18n.getMessage("horaire_samedi"),
                    chrome.i18n.getMessage("horaire_dimanche"),
                    chrome.i18n.getMessage("horaire_tous")
                ];

                let selecteurDeJour = ligneHoraire.querySelector("select");
                for (let i = 0, length = optionsJour.length; i < length; i++) {
                    selecteurDeJour.innerHTML += `<option>${optionsJour[i]}</option>`;
                }
                gererPeriode(ligneHoraire);

                tableauHoraires.querySelector("tbody").appendChild(ligneHoraire);
                changementDetecte();
            } else {
                alert(chrome.i18n.getMessage("horaire_limitepause"));
            }
        } else {
            alert(chrome.i18n.getMessage("horaire_periodedeblocage"));
            btnAjoutPause.setAttribute("disabled", "disabled");
        }
    });

    function changementDetecte() {
        btnEnregistrer.style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
        saveBeforeQuit = true;
    }

    function save() {
        chrome.storage.sync.set({
            pausesHebdomadaires: getData(),
            contenuHTMLListe: tableauHoraires.innerHTML,
            dernierChangementPauses: Date.now()
        });
        console.log(`pauses:`, JSON.stringify(getData()));
        showBytesInUse();
    }

    function load() {
        chrome.storage.sync.get(['contenuHTMLListe', 'dateFinBlocage'], function (arg) {
            if (typeof arg.contenuHTMLListe !== 'undefined') {
                tableauHoraires.innerHTML = arg.contenuHTMLListe;
                let rows = Array.from(document.querySelector("tbody").querySelectorAll("tr"));
                for (let ligneHoraire of rows) {
                    gererPeriode(ligneHoraire);
                    let selecteurDeJour = ligneHoraire.querySelector("select");
                    selecteurDeJour.selectedIndex = parseInt(selecteurDeJour.getAttribute("dayselected"));
                    for (let timeSelector of ligneHoraire.querySelectorAll("input")) {
                        timeSelector.value = timeSelector.getAttribute("timeselected");
                    }
                }
            }
            if (typeof arg.dateFinBlocage !== 'undefined') {
                if (arg.dateFinBlocage[0] > Date.now()) {
                    selecteurDeDate.value = arg.dateFinBlocage[1];
                    btnConfirmerBlocage.setAttribute("disabled", "disabled");
                    bloque = true;
                }
            }
        });

    }

    function gererPeriode(ligneHoraire) {
        let selecteurDeJour = ligneHoraire.querySelector("select");
        let iconeDeSuppression = ligneHoraire.querySelector("i");

        iconeDeSuppression.addEventListener('click', function () {
            ligneHoraire.parentNode.removeChild(ligneHoraire);
            changementDetecte();
        });

        iconeDeSuppression.addEventListener('mousedown', function () {
            ligneHoraire.style.backgroundColor = "#ec817d";
        });

        iconeDeSuppression.addEventListener('mouseout', function () {
            ligneHoraire.style.removeProperty("background-color");
        });

        selecteurDeJour.addEventListener("change", function () {
            changementDetecte();
            selecteurDeJour.setAttribute("dayselected", selecteurDeJour.selectedIndex);
        });

        for (let timeSelector of ligneHoraire.querySelectorAll("input")) {
            timeSelector.addEventListener("change", function () {
                changementDetecte();
                timeSelector.setAttribute("timeselected", timeSelector.value);
            });
        }
    }

    function getData() {
        let pausesHebdomadaires = [[], [], [], [], [], [], []];
        let rows = Array.from(document.querySelector("tbody").querySelectorAll("tr"));
        for (let row of rows) {
            let jourSelectionne = row.querySelector("select").selectedIndex;
            let heureDebut = row.querySelector("input[debut]").value;
            let heureFin = row.querySelector("input[fin]").value;
            if (heureDebut === "") heureDebut = "0:00";
            if (heureFin === "") heureFin = "24:00";
            if (transformerEnMinute(heureFin) < transformerEnMinute(heureDebut)) {
                let selectionneurD = row.querySelector("input[debut]");
                let selectionneurF = row.querySelector("input[fin]");
                [selectionneurD.value, selectionneurF.value] = [heureFin, heureDebut];
                selectionneurD.setAttribute("timeselected", selectionneurD.value);
                selectionneurF.setAttribute("timeselected", selectionneurF.value);
                [heureFin, heureDebut] = [heureDebut, heureFin];
            }
            let intervalle = [transformerEnMinute(heureDebut), transformerEnMinute(heureFin)];
            if (jourSelectionne === 7) {
                for (let jour of pausesHebdomadaires) {
                    jour.push(intervalle);
                }
            } else {
                // jourSelectionne--;
                pausesHebdomadaires[jourSelectionne].push(intervalle);
            }
        }
        return pausesHebdomadaires;
    }

    function transformerEnMinute(string) {
        let min = 0;
        let arr = string.split(":");
        min += (parseInt(arr[0]) * 60);
        min += (parseInt(arr[1]));
        return min;
    }

    function showBytesInUse() {
        chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
            console.log("SyncBytesInUse : " + bytesInUse);
        });
        chrome.storage.local.getBytesInUse(null, function (bytesInUse) {
            console.log("LocalBytesInUse : " + bytesInUse);
        });
        chrome.storage.sync.get(null, function (arg) {
            console.log("Obj in Sync", arg);
        });
        chrome.storage.local.get(null, function (arg) {
            console.log("Obj in Local", arg);
        });
    }


};


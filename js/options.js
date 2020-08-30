window.onload = function () {

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
    document.querySelector(`a[contact]`).innerHTML = chrome.i18n.getMessage(`options_contact`);
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
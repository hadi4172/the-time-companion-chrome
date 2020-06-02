window.onload = function () {

    initialiserCheckboxesDistraction(Array.from(document.querySelectorAll("input[type=checkbox]")));

    //instanciation du notificateur
    var notifier = new AWN();

    //récupérer les éléments HTML pertinents
    var listeNoire = document.querySelector("table[listenoire]");
    var listeBlanche = document.querySelector("table[listeblanche]");
    var entreeUrlLN = document.querySelector("#inputurlbl");
    var entreeUrlLB = document.querySelector("#inputurlwl");
    var btnAjoutLN = document.querySelector("#addtoblacklist");
    var btnAjoutLB = document.querySelector("#addtowhitelist");
    var btnEnregistrer = document.querySelector("#savelists");
    var btnAjouterGroupe = document.querySelector("#addgroup");
    var btnSupprimerGroupe = document.querySelector("#deletegroup");
    var groupes = document.querySelector(".dropdown-select");

    let elements = [
        ["#lntitre", "setlist_listenoire"],
        ["#lbtitre", "setlist_listeblanche"],
        ["#lntitre + p", "setlist_listenoire_description"],
        ["#lbtitre + p", "setlist_listeblanche_description"],
        ["#return", "setlist_retour_btn"],
        ["#remarqueplusieursajout", "setlist_plusieursurl"],
        ["#addgroup", "setlist_addgroup_btn"],
        ["#deletegroup", "setlist_deletegroup_btn"],
        ["#textegroupeactuel", "options_textegroupe"],
        ["#desactiverdistractionsur", "setlist_checkboxes_disabledistractionson"]
    ];

    //remplit les éléments HTML avec leur texte dans la bonne langue
    for (let i = 0, length = elements.length; i < length; i++) {
        document.querySelector(elements[i][0]).innerHTML = chrome.i18n.getMessage(elements[i][1]);
    }

    entreeUrlLN.placeholder = chrome.i18n.getMessage("setlist_inputbar_placeholder");
    entreeUrlLB.placeholder = chrome.i18n.getMessage("setlist_inputbar_placeholder");
    btnAjoutLN.innerHTML = chrome.i18n.getMessage("setlist_addurl_btn");
    btnAjoutLB.innerHTML = chrome.i18n.getMessage("setlist_addurl_btn");
    btnEnregistrer.innerHTML = chrome.i18n.getMessage("setlist_savelist_btn");

    var listes = [listeNoire, listeBlanche];
    var entrees = [entreeUrlLN, entreeUrlLB];
    var btnsAjout = [btnAjoutLN, btnAjoutLB];
    var indiceSauvegarde = [{ donneesListeNoire: listeNoire.innerHTML }, { donneesListeBlanche: listeBlanche.innerHTML }];
    var uRLS = [{ urlsListeNoire: [] }, { urlsListeBlanche: [] }];  //tableaux en deux dimension contenant leurs urls par groupe
    var listeValeursGroupes = [];  //contient les noms des groupes disponibles
    var saveBeforeQuit = false;    //demander à l'utilisateur de sauvegarder avant de quitter
    var etatCheckboxesDistraction = [];

    window.onbeforeunload = function (e) {
        if (saveBeforeQuit) {
            return chrome.i18n.getMessage("setlist_onbeforeunload");
        };
    };


    //charge les listeners des éléments HTML
    for (let i = 0, length = listes.length; i < length; i++) {

        charger(i);
        // resetData();
        console.log(uRLS[i]);

        btnsAjout[i].addEventListener("click", function () {
            initEventBtnAjout(i)
        });

        entrees[i].addEventListener("keypress", function (e) {
            if (e.keyCode === 13) {
                initEventBtnAjout(i)
            }
        });

        setTimeout(() => {
            initFonctionRetirer(i);
        });

        btnEnregistrer.addEventListener("click", function () {
            btnEnregistrer.style.removeProperty("box-shadow");
            saveBeforeQuit = false;
            apply();
        });


    }
    setTimeout(() => {
        initGroups();
        initEventBtnAddGroup();
        initEventBtnSupprimerGroup();
    });


    // gère l'ajout d'urls dans les listes
    function addtoL(liste, i, vals) {
        vals = vals.split(" ");
        for (let val of vals) {
            val = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
            let entreeExistanteDansLeGroupe = Array.from(liste.rows).some(x => x.querySelector("td").innerHTML === val && x.getAttribute("togroup") === groupes.value);

            if (entreeUrlConforme(val) && !entreeExistanteDansLeGroupe) {
                entrees[i].style.removeProperty("box-shadow");
                let row = liste.insertRow(-1);
                row.insertCell(0).appendChild(document.createTextNode(val));
                ajoutFonctionRetirer(row);
                row.setAttribute("togroup", groupes.value);
                console.log(liste);
            } else {
                entrees[i].style.boxShadow = "0 0 2px 2px rgba(255, 0, 0, 0.582)";
            }
        }
    }

    //vérifie si l'url est valide
    function entreeUrlConforme(val) {
        if (val == "*.*") {
            return true;
        }
        var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/igm;
        return regexURL.test(val);
    }

    //met à jour le tableau qui regroupe les listes noires et blanches
    function update() {
        listes = [listeNoire, listeBlanche];
    }

    // function resetData() {
    //     chrome.storage.sync.set({ donneesListeNoire: "" });
    //     chrome.storage.sync.set({ donneesListeBlanche: "" });
    // }

    //applique les changements 
    function apply() {
        for (let i = 0, length = listes.length; i < length; i++) {

            update();
            indiceSauvegarde[i][Object.keys(indiceSauvegarde[i])[0]] = listes[i].innerHTML;
            // let allUrls = Array.from(listes[i].rows).map(x => x.innerHTML.replace(/<\/?td>/g, ""));
            let urlsOrdonne = [];
            listeValeursGroupes = Array.from(groupes.options).map(x => x.value);
            for (let j = 0, length = listeValeursGroupes.length; j < length; j++) {
                urlsOrdonne.push(Array.from(listes[i].rows).filter(x => x.getAttribute("togroup") === listeValeursGroupes[j]).map(x => x.innerHTML.replace(/<\/?td>/g, "")));
            }

            console.log('urlsOrdonne:', urlsOrdonne);
            uRLS[i][Object.keys(uRLS[i])[0]] = urlsOrdonne;
            // uRLS[1-i][Object.keys(uRLS[1-i])[0]] = urlsOrdonneAutreListe;
            console.log('uRLS:', JSON.stringify(uRLS[i]));
            console.log('indiceSauvegarde:', indiceSauvegarde);

            save(i);
        }
        chrome.storage.sync.set({etatCheckboxesDistraction:etatCheckboxesDistraction});
    }

    //sauvegarge l'innerHTML des listes noires et blanches et leur urls
    function save(i) {
        chrome.storage.sync.set(indiceSauvegarde[i]);
        chrome.storage.sync.set(uRLS[i]);
    }

    //avertissement pour dire que la fonctionnalité n'est pas encore disponible
    function comingSoonInitializer(objects) {
        for (let i = 0, length = objects.length; i < length; i++) {
            objects[i].addEventListener('click', function () {
                alert(chrome.i18n.getMessage("horaire_comingsoon"));
                objects[i].disabled = "disabled";
            });
        }
    }

    function initialiserCheckboxesDistraction(checkboxes) {
        chrome.storage.sync.get('etatCheckboxesDistraction', function (arg) {
            if (typeof arg.etatCheckboxesDistraction !== 'undefined') {
                etatCheckboxesDistraction = arg.etatCheckboxesDistraction;
                if (etatCheckboxesDistraction.length!==checkboxes.length) {
                    etatCheckboxesDistraction = [];
                    for (let i = 0, length = checkboxes.length; i < length; i++) {
                        etatCheckboxesDistraction.push(false);
                    }
                }
            } else {
                for (let i = 0, length = checkboxes.length; i < length; i++) {
                    etatCheckboxesDistraction.push(false);
                }
            }
            for (let i = 0, length = checkboxes.length; i < length; i++) {
                if (etatCheckboxesDistraction[i]) {
                    checkboxes[i].setAttribute("checked", "checked"); 
                }
                checkboxes[i].addEventListener('click', function () {
                    etatCheckboxesDistraction[i] = !etatCheckboxesDistraction[i];
                    btnEnregistrer.style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
                    saveBeforeQuit = true;
                    console.log(`etatCheckboxesDistraction:`,JSON.stringify(etatCheckboxesDistraction));
                });
            }
        });
    }

    //charge les listes blanches et noires et obtient leur urls
    function charger(i) {
        chrome.storage.sync.get(Object.keys(indiceSauvegarde[i])[0], function (donnees) {
            if (typeof donnees[Object.keys(indiceSauvegarde[i])[0]] !== "undefined") {
                listes[i].innerHTML = donnees[Object.keys(indiceSauvegarde[i])[0]];
            }
        });

        chrome.storage.sync.get(Object.keys(uRLS[i])[0], function (tableau) {
            if (typeof tableau[Object.keys(uRLS[i])[0]] !== "undefined") {
                uRLS[i][Object.keys(uRLS[i])[0]] = tableau[Object.keys(uRLS[i])[0]];
                setTimeout(() => {
                    console.log('uRLS[i]:', JSON.stringify(tableau[Object.keys(uRLS[i])[0]]));
                }, 50);

            }
        });

    }

    //la logique des boutons d'ajout d'urls dans les listes
    function initEventBtnAjout(i) {
        update();
        let lengthBefore = Array.from(listes[i].rows).map(x => x.innerHTML.replace(/<\/?td>/g, "")).length;
        addtoL(listes[i], i, entrees[i].value);
        entrees[i].value = "";
        let change = lengthBefore !== Array.from(listes[i].rows).map(x => x.innerHTML.replace(/<\/?td>/g, "")).length;
        if (change) {
            btnEnregistrer.style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
            saveBeforeQuit = true;
        }

    }

    //la logique du bouton d'ajout de groupes
    function initEventBtnAddGroup() {
        btnAjouterGroupe.addEventListener("click", function () {
            let nomDuNouveauGroupe = prompt(chrome.i18n.getMessage("setlist_messageaddtogroup"));
            if (nomDuNouveauGroupe !== null) {
                nomDuNouveauGroupe = nomDuNouveauGroupe.replace(/<|>|"|\\/g, "");

                if (nomDuNouveauGroupe.replace(/ /g, "").length === 0) {
                    nomDuNouveauGroupe = "[]";
                }
                if (groupes.querySelector(`option[value="${nomDuNouveauGroupe.replace(/ /g, "_")}"]`) == null) {
                    groupes.innerHTML += `<option value=${nomDuNouveauGroupe.replace(/ /g, "_")}>${nomDuNouveauGroupe}</option>`;

                    apply();

                    let donneesSeverite;
                    chrome.storage.sync.get("donneesSeverite", function (arg) {
                        console.log('donnesSeveriteOnGet:', JSON.stringify(arg.donneesSeverite));
                        donneesSeverite = arg.donneesSeverite;
                        donneesSeverite.push([0, 0, false]);
                        console.log('donnesSeveriteAfterGet:', JSON.stringify(donneesSeverite));
                    });
                    saveBeforeQuit = true;
                    setTimeout(() => {
                        console.log('donnesSeveriteBeforeSet:', JSON.stringify(donneesSeverite));
                        chrome.storage.sync.set({
                            groupes: [groupes.innerHTML, Array.from(groupes.options).map(x => x.value)],
                            donneesSeverite: donneesSeverite
                        });
                        saveBeforeQuit = false;
                    }, 100);


                } else {
                    alert(chrome.i18n.getMessage("setlist_messagegroupnameinvalid"));
                }
            }
        });

    }

    //la logique du bouton de suppression de groupes
    function initEventBtnSupprimerGroup() {
        btnSupprimerGroupe.addEventListener("click", function () {
            let contenu = `<h1 style="margin:0 0 10px 0;">${chrome.i18n.getMessage("setlist_deletegroup_btn")}</h1><table groups style="margin:auto;"><tbody>`;
            for (let i = 0, length = groupes.options.length; i < length; i++) {
                contenu += `<tr><td>${groupes.options[i].innerHTML}</td></tr>`;
            }
            contenu += "</tbody></table>";
            notifier.modal(contenu);
            setTimeout(() => {
                initSupprimerGroupe();
            }, 100);
        });
    }

    //supprime un groupe
    function initSupprimerGroupe() {
        let groupsTab = document.querySelector("table[groups]").rows;
        for (let groupRow of groupsTab) {
            groupRow.addEventListener("click", function () {
                if (confirm(chrome.i18n.getMessage("setlist_confirmdeletegroup"))) {
                    update();
                    if (groupes.options.length > 1) {
                        let optionCorrespondante = groupes.querySelector(`option[value="${groupRow.textContent.replace(/ /g, "_")}"]`);
                        if (optionCorrespondante !== null && typeof optionCorrespondante !== 'undefined') {
                            for (let i = 0, length = listes.length; i < length; i++) {

                                //supprimer les liens des listes du groupe supprimé
                                for (let j = listes[i].rows.length - 1; j >= 0; j--) {
                                    if (listes[i].rows[j].getAttribute("togroup") === optionCorrespondante.value) {
                                        console.log('[deleted]:', listes[i].rows[j]);
                                        listes[i].rows[j].parentNode.removeChild(listes[i].rows[j]);
                                    } else {
                                        console.log("[not deleted]:", listes[i].rows[j].getAttribute("togroup"));
                                    }
                                }

                            }

                            let donneesSeverite;
                            chrome.storage.sync.get("donneesSeverite", function (arg) {
                                console.log('donnesSeveriteOnGet:', JSON.stringify(arg.donneesSeverite));
                                donneesSeverite = arg.donneesSeverite;
                                donneesSeverite.splice(optionCorrespondante.index, 1);
                                console.log('____indexOfDeletedGroup:', optionCorrespondante.index);
                                console.log('donnesSeveriteAfterGet:', JSON.stringify(donneesSeverite));
                            });
                            saveBeforeQuit = true;
                            setTimeout(() => {
                                optionCorrespondante.parentNode.removeChild(optionCorrespondante);
                                groupRow.parentNode.removeChild(groupRow);
                                setTimeout(() => {
                                    console.log('donnesSeveriteBeforeSet:', JSON.stringify(donneesSeverite));
                                    chrome.storage.sync.set({
                                        groupes: [groupes.innerHTML, Array.from(groupes.options).map(x => x.value)],
                                        donneesSeverite: donneesSeverite
                                    });
                                    apply();
                                    affichageListeParGroupe();
                                    saveBeforeQuit = false;
                                });
                            });


                        }
                    } else {
                        alert(chrome.i18n.getMessage("setlist_cantdeletegroup"));
                    }
                }
            });
        }
    }

    //n'affiche que les urls qui appartiennent au groupe séléctionné
    function affichageListeParGroupe() {
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

    //charge le bouton des groupes
    function initGroups() {
        chrome.storage.sync.get("groupes", function (arg) {
            if (typeof arg.groupes !== 'undefined') {
                groupes.innerHTML = arg["groupes"][0];
                listeValeursGroupes = arg["groupes"][1];
                console.log('arg.groupes:', arg.groupes);
                affichageListeParGroupe();
            }
        });

        groupes.addEventListener("change", function () {
            update();
            console.log('liste noire:', listes[0]);
            console.log('liste blanche:', listes[1]);
            let selectedIndex = groupes.options.selectedIndex;
            for (let option of groupes.options) {
                option.removeAttribute("selected");
            }
            groupes.options[selectedIndex].setAttribute("selected", "selected");
            chrome.storage.sync.set({ groupes: [groupes.innerHTML, Array.from(groupes.options).map(x => x.value)] });
            affichageListeParGroupe();
        });
        setTimeout(() => {
            if (groupes.options.length === 0) {
                groupes.innerHTML += `<option value="${chrome.i18n.getMessage("options_groupe")}_1">${chrome.i18n.getMessage("options_groupe")} 1</option>`;
                for (let i = 0, length = listes.length; i < length; i++) {
                    // apply(i);
                }
            }
        });
    }

    //gère la suppression des urls par liste
    function initFonctionRetirer(i) {
        for (let j = 0, trlength = listes[i].rows.length; j < trlength; j++) {
            ajoutFonctionRetirer(listes[i].rows[j]);
            // apply(i);
        }
    }

    //gère la suppression des urls au clic
    function ajoutFonctionRetirer(row) {
        row.addEventListener("click", function () {
            row.parentNode.removeChild(row);
            btnEnregistrer.style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
            saveBeforeQuit = true;
        });
    }


};
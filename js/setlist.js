window.onload = function () {

    comingSoonInitializer(document.querySelectorAll("input[type=checkbox]"));

    var listeNoire = document.querySelector("table[listenoire]");
    var listeBlanche = document.querySelector("table[listeblanche]");
    var entreeUrlLN = document.querySelector("#inputurlbl");
    var entreeUrlLB = document.querySelector("#inputurlwl");
    var btnAjoutLN = document.querySelector("#addtoblacklist");
    var btnAjoutLB = document.querySelector("#addtowhitelist");
    var btnEnregistrerLN = document.querySelector("#saveblacklist");
    var btnEnregistrerLB = document.querySelector("#savewhitelist");

    let elements = [
        ["#lntitre","setlist_listenoire"],
        ["#lbtitre","setlist_listeblanche"],
        ["#lntitre + p","setlist_listenoire_description"],
        ["#lbtitre + p","setlist_listeblanche_description"],
        ["#return","setlist_retour_btn"]
    ];

    for (let i = 0, length = elements.length; i < length; i++) {
        document.querySelector(elements[i][0]).innerHTML = chrome.i18n.getMessage(elements[i][1]);
    }

    entreeUrlLN.placeholder = chrome.i18n.getMessage("setlist_inputbar_placeholder");
    entreeUrlLB.placeholder = chrome.i18n.getMessage("setlist_inputbar_placeholder");
    btnAjoutLN.innerHTML = chrome.i18n.getMessage("setlist_addurl_btn");
    btnAjoutLB.innerHTML = chrome.i18n.getMessage("setlist_addurl_btn");
    btnEnregistrerLN.innerHTML = chrome.i18n.getMessage("setlist_savelist_btn");
    btnEnregistrerLB.innerHTML = chrome.i18n.getMessage("setlist_savelist_btn");

    for (let i = 0, length = ["ch3", "ch4", "ch5", "ch6"].length; i < length; i++) {
        let checkbox = document.querySelector(`label[for=${["ch3", "ch4", "ch5", "ch6"][i]}]`);
        checkbox.innerHTML = chrome.i18n.getMessage("setlist_checkboxes_disabledistractionson") + checkbox.innerHTML;
    }


    var listes = [listeNoire, listeBlanche];
    var entrees = [entreeUrlLN, entreeUrlLB];
    var btnsAjout = [btnAjoutLN, btnAjoutLB];
    var btnsEnregistrer = [btnEnregistrerLN, btnEnregistrerLB];
    var indiceSauvegarde = [{ donneesListeNoire: listeNoire.innerHTML }, { donneesListeBlanche: listeBlanche.innerHTML }];
    var uRLS = [{ urlsListeNoire: [] }, { urlsListeBlanche: [] }];
    var saveBeforeQuit = false;

    window.onbeforeunload = function (e) {
        if (saveBeforeQuit) {
            return chrome.i18n.getMessage("setlist_onbeforeunload");
        };
    };


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

        btnsEnregistrer[i].addEventListener("click", function () {
            btnsEnregistrer[i].style.removeProperty("box-shadow");
            saveBeforeQuit = false;
            apply(i);
        });

        setTimeout(() => {
            initFonctionRetirer(i);
        });


    }

    function addtoL(val, liste, i) {
        val = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
        if (entreeUrlConforme(val) && !(liste.innerHTML.includes(val))) {
            entrees[i].style.removeProperty("box-shadow");
            let row = liste.insertRow(-1);
            row.insertCell(0).appendChild(document.createTextNode(val));
            ajoutFonctionRetirer(row, i);
        } else {
            entrees[i].style.boxShadow = "0 0 2px 2px rgba(255, 0, 0, 0.582)";
        }
    }

    function entreeUrlConforme(val) {
        if (val == "*.*") {
            return true;
        }
        var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
        return regexURL.test(val);
    }

    function update() {
        listes = [listeNoire, listeBlanche];
    }

    // function resetData() {
    //     chrome.storage.sync.set({ donneesListeNoire: "" });
    //     chrome.storage.sync.set({ donneesListeBlanche: "" });
    // }

    function apply(i) {
        update();
        indiceSauvegarde[i][Object.keys(indiceSauvegarde[i])[0]] = listes[i].innerHTML;
        uRLS[i][Object.keys(uRLS[i])[0]] = listes[i].innerHTML.replace(/<\/?tbody>|<td>|<\/?tr>/g, "").split("</td>").slice(0, -1);
        save(i);
    }

    function save(i) {
        chrome.storage.sync.set(indiceSauvegarde[i]);
        chrome.storage.local.set(uRLS[i]);
    }

    function comingSoonInitializer(objects){
        for (let i = 0, length = objects.length; i < length; i++) {
            objects[i].addEventListener('click', function () {
                alert(chrome.i18n.getMessage("horaire_comingsoon"));
                objects[i].disabled = "disabled";
            });
        }
    }

    function charger(i) {
        chrome.storage.sync.get(Object.keys(indiceSauvegarde[i])[0], function (donnees) {
            if (typeof donnees[Object.keys(indiceSauvegarde[i])[0]] !== "undefined") {
                listes[i].innerHTML = donnees[Object.keys(indiceSauvegarde[i])[0]];
            }
        });

        chrome.storage.local.get(Object.keys(uRLS[i])[0], function (tableau) {
            if (typeof tableau[Object.keys(uRLS[i])[0]] !== "undefined") {
                uRLS[i][Object.keys(uRLS[i])[0]] = tableau[Object.keys(uRLS[i])[0]];
            }
        });

    }

    function initEventBtnAjout(i) {
        update();
        let lengthBefore = listes[i].innerHTML.replace(/<\/?tbody>|<td>|<\/?tr>/g, "").split("</td>").slice(0, -1).length;
        addtoL(entrees[i].value, listes[i], i);
        entrees[i].value = "";
        let change = lengthBefore !== listes[i].innerHTML.replace(/<\/?tbody>|<td>|<\/?tr>/g, "").split("</td>").slice(0, -1).length;
        if (change) {
            btnsEnregistrer[i].style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
            saveBeforeQuit = true;
        }

    }

    function initFonctionRetirer(i) {
        for (let j = 0, trlength = listes[i].rows.length; j < trlength; j++) {
            ajoutFonctionRetirer(listes[i].rows[j], i);
            // apply(i);
        }
    }

    function ajoutFonctionRetirer(row, i) {
        row.addEventListener("click", function () {
            row.parentNode.removeChild(row);
            btnsEnregistrer[i].style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
            saveBeforeQuit = true;
        });
    }


};
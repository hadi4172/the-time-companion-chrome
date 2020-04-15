window.onload = function () {

    var listeNoire = document.querySelector("table[listenoire]");
    var listeBlanche = document.querySelector("table[listeblanche]");
    var entreeUrlLN = document.querySelector("#inputurlbl");
    var entreeUrlLB = document.querySelector("#inputurlwl");
    var btnAjoutLN = document.querySelector("#addtoblacklist");
    var btnAjoutLB = document.querySelector("#addtowhitelist");
    var btnEnregistrerLN = document.querySelector("#saveblacklist");
    var btnEnregistrerLB = document.querySelector("#savewhitelist");

    var listes = [listeNoire, listeBlanche];
    var entrees = [entreeUrlLN, entreeUrlLB];
    var btnsAjout = [btnAjoutLN, btnAjoutLB];
    var btnsEnregistrer = [btnEnregistrerLN, btnEnregistrerLB];
    var indiceSauvegarde = [{ donneesListeNoire: listeNoire.innerHTML }, { donneesListeBlanche: listeBlanche.innerHTML }];
    var uRLS = [{ urlsListeNoire: [] }, { urlsListeBlanche: [] }];
    var saveBeforeQuit = false;

    window.onbeforeunload = function (e) {
        if (saveBeforeQuit) {
            return 'You should save before quiting';
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
        if (val =="*.*") {
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
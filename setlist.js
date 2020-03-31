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
    var saveBeforeQuit=false;

    window.onbeforeunload = function (e) {
        if (saveBeforeQuit) {
            return 'You should save before quiting';
        };
    }


    for (let i = 0, length = listes.length; i < length; i++) {

        charger(i);
        // resetData();

        btnsAjout[i].addEventListener("click", function () {
            initEventBtnAjout(i)
        });

        entrees[i].addEventListener("keypress", function (e) {
            if (e.keyCode === 13) {
                initEventBtnAjout(i)
            }
        });

        btnsEnregistrer[i].addEventListener("click", function () {
            btnsEnregistrer[i].style.boxShadow = "0 0 0 0 red";
            saveBeforeQuit=false;
            apply(i);
        });

        setTimeout(() => {
            initFonctionRetirer(i);
        });


    }

    function addtoL(val, liste, i) {
        val = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
        if (entreeUrlConforme(val) && !(liste.innerHTML.includes(val))) {
            let row = liste.insertRow(-1);
            row.insertCell(0).appendChild(document.createTextNode(val));
            ajoutFonctionRetirer(row, i);
        }
    }

    function entreeUrlConforme(val) {
        var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
        return regexURL.test(val);
    }

    function update() {
        listes = [listeNoire, listeBlanche];
    }

    function resetData() {
        chrome.storage.sync.set({ donneesListeNoire: "" });
        chrome.storage.sync.set({ donneesListeBlanche: "" });
    }

    function apply(i) {
        update();
        indiceSauvegarde[i][Object.keys(indiceSauvegarde[i])[0]] = listes[i].innerHTML;
        save(i);
    }

    function save(i) {
        chrome.storage.sync.set(indiceSauvegarde[i]);
    }

    function charger(i) {
        chrome.storage.sync.get(Object.keys(indiceSauvegarde[i])[0], function (donnees) {
            let string = donnees[Object.keys(indiceSauvegarde[i])[0]];
            listes[i].innerHTML = string;
        });

    }

    function initEventBtnAjout(i) {
        update();
        addtoL(entrees[i].value, listes[i], i);
        entrees[i].value = "";
        btnsEnregistrer[i].style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
        saveBeforeQuit=true;
    }

    function initFonctionRetirer(i) {
        for (let j = 0, trlength = listes[i].rows.length; j < trlength; j++) {
            ajoutFonctionRetirer(listes[i].rows[j], i);
            apply(i);
        }
    }

    function ajoutFonctionRetirer(row, i) {
        row.addEventListener("click", function () {
            row.parentNode.removeChild(row);
            btnsEnregistrer[i].style.boxShadow = "0 0 10px 5px rgb(250, 135, 135)";
            saveBeforeQuit=true;
        });
    }


}
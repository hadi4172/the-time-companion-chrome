window.onload = function () {

    var listeNoire = document.querySelector("table[valeurslistenoire]");
    var listeBlanche = document.querySelector("table[valeurslisteblanche]");
    var severite = document.querySelectorAll("input[type = 'radio']");
    // var severiteSelectionne = document.querySelector(input[checked]);

    charger();

    chrome.storage.sync.get(["donneesListeNoire", "donneesListeBlanche"], function (donnees) {
        if (typeof donnees["donneesListeNoire"] !== "undefined") {
            listeNoire.innerHTML = donnees["donneesListeNoire"];
        }
        if (typeof donnees["donneesListeBlanche"] !== "undefined") {
            listeBlanche.innerHTML = donnees["donneesListeBlanche"];
        }
    });


    let messageEntreeTempsSeverite = [
        "Envoyer une notification chaque [Entrer le nombre] minutes",
        "Entrer un texte pour continuer chaque [Entrer le nombre] minutes",
        "Bloquer la page après [Entrer le nombre] minutes",
        "Fermer le navigateur après [Entrer le nombre] minutes"
    ];

    for (let i = 0, length = severite.length; i < length; i++) {
        severite[i].addEventListener("click", function () {
            severite[i].parentElement.querySelector("span[temps]").innerHTML = "";
            setTimeout(() => {
                let temps = parseFloat(prompt(messageEntreeTempsSeverite[i]));
                if (!isNaN(temps) && (temps >= 0) && (temps <= 500)) {
                    let debut = i < 2 ? confirm("Prévenir aussi au début de l'accès a un site sur la liste noire ?") : false;
                    let textProprietes = "[" + (debut ? "début et " : "") + (i < 2 ? "chaque " : "après ") + temps + " min]";
                    severite[i].parentElement.querySelector("span[temps]").innerHTML = textProprietes;
                    chrome.storage.sync.set({
                        niveauSeverite: severite[i].id,
                        texteDePropriete: textProprietes,
                        proprietesDeRappel: [temps, debut]
                    });
                }
                else {
                    alert("Entrée invalide!");
                    charger();
                }
            }, 500);
        });
    }

    function charger() {
        chrome.storage.sync.get(["niveauSeverite", "texteDePropriete"], function (niveauSeverite) {
            if ((niveauSeverite["niveauSeverite"] || niveauSeverite["texteDePropriete"]) != null) {
                let checked = document.getElementById(niveauSeverite["niveauSeverite"]);
                checked.checked = "checked";
                checked.parentElement.querySelector("span[temps]").innerHTML = niveauSeverite["texteDePropriete"];
            }
            else {
                severite[0].checked = "checked";
                severite[0].parentElement.querySelector("span[temps]").innerHTML = "Inactif";
            }

        });
    }




};
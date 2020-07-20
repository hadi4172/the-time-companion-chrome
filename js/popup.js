window.onload = function () {

    //affecte le texte dans la bonne langue de l'élément HTML
    document.querySelector(`.titre`).innerHTML = chrome.i18n.getMessage(`popup_titre`);
    document.querySelector(`.titre2`).innerHTML = chrome.i18n.getMessage(`popup_siteslesplusconsultes`);
    document.querySelector(`a[href="options.html"]`).innerHTML = chrome.i18n.getMessage(`popup_reglages_btn`);

    var tempsParUrl = [];

    //obtient les temps de chaque url du content script et les envoie au triage
    function initTempsParUrl() {
        chrome.storage.local.get("times", function (arg) {
            if (typeof arg.times !== "undefined") {
                tempsParUrl = selectionSort(arg.times);
                obtenirTempsDeLaPageActive();
                console.log("[TEMPS PAR URL]:", tempsParUrl);
            }
        });
    }

    //demande au content script de lui envoyer le temps de sa page
    function obtenirTempsDeLaPageActive() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { todo: "howMuchTimeElapsed" }, function (response) {
                if (typeof response !== 'undefined') {
                    if (typeof response.timeElapsed !== 'undefined') {
                        let url = response.timeElapsed[1]; 
                        let index = tempsParUrl.findIndex(x=>url.includes(x[0]));
                        if (index !== -1) {
                            tempsParUrl[index][1]=response.timeElapsed[0];
                        }
                        tempsParUrl = selectionSort(tempsParUrl);
                    }
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

    //retourne tableau qui contient les pourcentages des éléments à l'intérieur
    function obtenirRepartitionEnPourcentage(tableau) {
        let total = calculerTempsTotal(tableau);
        return tableau.map((x) => { return total != 0 ? ~~((x / total) * 100 * 100) / 100 : tableau })
    }

    //calcule le temps total de tout les site webs
    function calculerTempsTotal(tableau) {
        let total = 0;
        for (let i = 0, length = tableau.length; i < length; i++) {
            total += Math.abs(tableau[i]);
        }
        return total;
    }

    //transforme un nombre de secondes en string h:m:s
    function fancyTimeFormat(time) {
        //Original Source: https://stackoverflow.com/a/11486026/7551620

        // Hours, minutes and seconds
        let hrs = ~~(time / 3600);
        let mins = ~~((time % 3600) / 60);
        let secs = ~~time % 60;

        // Output like "1:01" or "4:03:59" or "123:03:59"
        let ret = "";

        if (hrs > 0) {
            ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
        }

        ret += "" + mins + ":" + (secs < 10 ? "0" : "");
        ret += "" + secs;
        return ret;
    }


    initTempsParUrl();

    setTimeout(() => {

        let data = [];  //temps par url formatés en string
        let dataUnformatted = [];  //valeurs en secondes des temps par url
        let labels = [];  //urls
        let backgroundColors = ["#FE0008", "#FF9C00", "#F5FC00", "#3CF10E", "#2EF87D", "#20FFE4", "#0F88F2", "#022DFF", "#C528FF", "#FD019C"]; //couleurs du graphique

        for (let i = 0; i < tempsParUrl.length; i++) {
            labels.push(tempsParUrl[i][0]);
            data.push(fancyTimeFormat(tempsParUrl[i][1]));
            dataUnformatted.push(tempsParUrl[i][1]);
        }

        let website = document.querySelector("tbody");

        //instanciation du graphique beignet
        new Chart(document.getElementById('myChart'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: obtenirRepartitionEnPourcentage(dataUnformatted),
                    backgroundColor: backgroundColors
                }],
                labels: labels.map(x => x += " (%) ")
            },
            options: { legend: { display: false, position: 'bottom' } }
        });

        //affichage des temps par url
        setTimeout(() => {

            for (let i = 0, length = labels.length > 10 ? 10 : labels.length; i < length; i++) {
                if (data[i] !== "0:00") {
                    website.innerHTML += (`<tr><td style="white-space: nowrap; max-width:180px; overflow: hidden;"><span style="color:${backgroundColors[i]};">█  </span>` + labels[i] + "</td><td> " + data[i] + "</td></tr>");
                }
            }
            website.innerHTML += ("<tr><td style='color:dimgrey;'>------------------</td></tr>");
            website.innerHTML += (`<tr><td><span style="color:dimgrey; font-weight:bold;"> ${chrome.i18n.getMessage("popup_total")}: </span>` + "</td><td> " + fancyTimeFormat(calculerTempsTotal(dataUnformatted)) + "</td></tr>");
        });

    }, 500);



};
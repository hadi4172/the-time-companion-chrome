window.onload = function () {

    document.querySelector(`.titre`).innerHTML = chrome.i18n.getMessage(`popup_titre`);
    document.querySelector(`.titre2`).innerHTML = chrome.i18n.getMessage(`popup_siteslesplusconsultes`);
    document.querySelector(`a[href="options.html"]`).innerHTML = chrome.i18n.getMessage(`popup_reglages_btn`);

    var tempsParUrl;

    function initTempsParUrl() {
        chrome.storage.local.get("times", function (arg) {
            if (typeof arg.times !== "undefined") {
                tempsParUrl = selectionSort(arg.times);
                console.log("[TEMPS PAR URL]:", tempsParUrl);
            }
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

    function obtenirRepartitionEnPourcentage(tableau) {
        let total = calculerTempsTotal(tableau);
        return tableau.map((x) => { return total != 0 ? ~~((x / total)*100*100)/100 : tableau })
    }

    function calculerTempsTotal(tableau){
        let total = 0;
        for (let i = 0, length = tableau.length; i < length; i++) {
            total += Math.abs(tableau[i]);
        }
        return total;
    }

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

        let data = [];
        let dataUnformatted = [];
        let labels = [];
        let backgroundColors = ["#FE0008", "#FF9C00", "#F5FC00", "#3CF10E", "#2EF87D", "#20FFE4", "#0F88F2", "#022DFF", "#C528FF", "#FD019C"];

        for (let i = 0; i < tempsParUrl.length; i++) {
            labels.push(tempsParUrl[i][0]);
            data.push(fancyTimeFormat(tempsParUrl[i][1]));
            dataUnformatted.push(tempsParUrl[i][1]);
        }

        let website = document.querySelector("tbody");

        new Chart(document.getElementById('myChart'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: obtenirRepartitionEnPourcentage(dataUnformatted),
                    backgroundColor: backgroundColors
                }],
                labels: labels.map(x=>x+=" (%) ")
            },
            options: { legend: { display: false, position: 'bottom' } }
        });

        setTimeout(() => {

            for (let i = 0, length = labels.length > 10 ? 10 : labels.length; i < length; i++) {
                website.innerHTML += (`<tr><td><span style="color:${backgroundColors[i]};">█  </span>` + labels[i] + "</td><td> " + data[i] + "</td></tr>");
            }
            website.innerHTML += ("<tr><td style='color:dimgrey;'>------------------</td></tr>");
            website.innerHTML += (`<tr><td><span style="color:dimgrey; font-weight:bold;"> ${chrome.i18n.getMessage("popup_total")}: </span>` + "</td><td> " + fancyTimeFormat(calculerTempsTotal(dataUnformatted)) + "</td></tr>");
        });

    }, 500);



};
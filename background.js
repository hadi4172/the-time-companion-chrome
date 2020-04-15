chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({ url: "options.html" }, function (tab) {
    });
});

setTimeout(() => {

    var url;  //url de la page actuelle
    var donneesSeverite;   //tableau qui contient 1: niveau de sévérité(int) 2: temps de cycle/d'activation(int)  3:activation du début(bool)
    var listesUrl = [[], []];  //tableau de 2 dimensions qui contient les urls de 1. la liste noire et 2.la liste blanche
    var tempsParUrl = { times: [] };  //objet qui contient les urls et le temps passé dans un tableau 2d comme ceci {times:[[URL,temps][...]...]}
    var dateOfLastSave;



    chrome.storage.local.get("date", function (arg) {
        console.log(arg.date);
        let today = new Date();
        today = JSON.stringify([today.getDate(), today.getMonth() + 1, today.getFullYear()]);
        if (typeof arg.date !== "undefined") {
            dateOfLastSave = arg["date"];
            console.log("Données de date existantes");
            if (today === dateOfLastSave) {
                initTempsParUrl();
                console.log("Chargé tempsparurl");
            } else {
                dateOfLastSave = today;
                chrome.storage.local.set(tempsParUrl);
                console.log("Nouveau jour");
            }
        } else {
            dateOfLastSave = today;
            console.log("Pas de données dispo pour tempsparurl");
        }
    });

    setTimeout(() => {
        console.log("dateOfLastSave:", dateOfLastSave);
        chrome.storage.local.set({ date: dateOfLastSave });
    }, 1000);


    showBytesInUse()


    TimeMe.initialize({
        currentPageName: "my-home-page", // current page
        idleTimeoutInSeconds: 30 // seconds
    });

    update();

    //initialisation de tempsParUrl
    function initTempsParUrl() {
        chrome.storage.local.get("times", function (arg) {
            if (typeof arg.times !== "undefined") {
                tempsParUrl.times = arg.times;
                console.log("[TEMPS PAR URL]:", tempsParUrl.times);
            }
        });
    }


    //changement du tab selectionné parmis les tabs ouverts
    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            url = tab.url;
            if (urlValide(url)) {
                console.log("start by onActivated");
                (async function () { await askForTimeSpent().then(result => storeData(url, result), error => storeData(url, error, true)); })();
                setTimeout(() => {
                    // console.log(url, timeSpent);
                    // storeData(url, timeSpent);
                    console.log("[TEMPS PAR URL ONACTIVATED]:", tempsParUrl.times.slice().toString());
                });

                // console.log("end by onActivated");
            }
        });
    });

    //changement à l'intérieur du tab actif (raffraichir ou nouveau lien)
    chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
        if (tab.active && change.url) {
            url = change.url;
            if (urlValide(url)) {
                console.log(`start by onUpdated`);
                askForTimeSpent().then((result) => { storeData(url, result); console.log(`STORED ${url} with ${result}`); }, (error) => { storeData(url, error, true); console.log(`STORED ERROR ${url} with ${error}`); });
                // let timeSpent = (async function(){return await askForTimeSpent().then(result => result, error => error);})();
                setTimeout(() => {
                    // storeData(url, timeSpent);
                    console.log("[TEMPS PAR URL ONUPDATED]:", tempsParUrl.times.slice().toString());
                    // console.log(timeSpent);
                });

                // console.log("end by onUpdated");
            }
        }
    });

    function urlValide(val) {
        var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
        return regexURL.test(val);
    }

    //detecter le temps qu'a pris un tab avant d'être fermé
    // Message reçu du content script
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            update();
            // console.log("start by beforeUnload");
            if (message.request == "sendMePreviousTimeData") {

                console.log("sending previous time...");
                //assurerInitialisationTableauTemps();
                let urlIsPresent = lookForURL(sender.tab.url) !== -1;
                console.log('___Sent time___:', tempsParUrl.times[lookForURL(sender.tab.url)][1], sender.tab.url);
                sendResponse({ responseMessage: (urlIsPresent ? tempsParUrl.times[lookForURL(sender.tab.url)][1] : 0) });

            } else if (message.request == "sendMeDonneesSeverite") {
                console.log("listes:", listesUrl);
                console.log("current url:", sender.tab.url)
                console.log("IsitHere?", listesUrl[0].find(x => (sender.tab.url).includes(x)));
                //assurerInitialisationTableauTemps();
                if (listesUrl[1].some(x => (sender.tab.url).includes(x))|| listesUrl[1].some(x => x == "*.*")) {           //est dans la liste blanche
                    sendResponse({ responseMessage: [0, 0, false] });
                    console.log("is in whitelist");
                } else if (listesUrl[0].some(x => (sender.tab.url).includes(x) || listesUrl[0].some(x => x == "*.*"))) {    //est dans la liste noire
                    console.log("is in blacklist");
                    sendResponse({ responseMessage: donneesSeverite });
                } else {                                                              //est nul part
                    sendResponse({ responseMessage: [0, 0, false] });
                    console.log("is not in a list");
                }
            } else if (message.setBadge) {
                //Original source : https://stackoverflow.com/a/32168534/7551620
                chrome.tabs.get(sender.tab.id, function (tab) {
                    if (chrome.runtime.lastError) {
                        return; // the prerendered tab has been nuked, happens in omnibox search
                    }
                    if (tab.index >= 0) { // tab is visible
                        chrome.browserAction.setBadgeText({ tabId: tab.id, text: message.setBadge });
                    } else { // prerendered tab, invisible yet, happens quite rarely
                        var tabId = sender.tab.id, text = message.setBadge;
                        chrome.webNavigation.onCommitted.addListener(function update(details) {
                            if (details.tabId == tabId) {
                                chrome.browserAction.setBadgeText({ tabId: tabId, text: text });
                                chrome.webNavigation.onCommitted.removeListener(update);
                            }
                        });
                    }
                });

            } else if (message.mute == 0) {

                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    var mutedInfo = tabs[0].mutedInfo;
                    if (mutedInfo) chrome.tabs.update(tabs[0].id, { "muted": false });
                });

            } else if (message.mute == 1) {  // Mute sounds

                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    var mutedInfo = tabs[0].mutedInfo;
                    if (mutedInfo) chrome.tabs.update(tabs[0].id, { "muted": true });
                });

            } else if (message.lauchThisLevelNow == 3) {   //Close tab
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.remove(tabs[0].id);
                });
            } else if (message.lauchThisLevelNow == 4) {   //Close chrome
                console.log("Entered Message.launchThisNow");
                chrome.tabs.query({}, function (tabs) {
                    for (var i = 0; i < tabs.length; i++) {
                        chrome.tabs.remove(tabs[i].id);
                    }
                });
            } else if (message.timeElapsed) {  //partie problématique
                console.log("start by runtime");
                console.log("stored new data..!");
                console.log("[[SENDER URL]] (listener) :" + sender.tab.url, message.timeElapsed[0])
                setTimeout(() => {
                    console.log("[[SENDER URL FUTURE]] (listener) :" + sender.tab.url, message.timeElapsed[0])
                });
                if (getHostnameFromRegex(sender.tab.url) === getHostnameFromRegex(message.timeElapsed[1])) {
                    storeData(sender.tab.url, message.timeElapsed[0]);
                    console.log('URLS SIMILAIRES :)');
                } else {
                    console.log('Erreur URLS Differents:', sender.tab.url, message.timeElapsed[1]);
                }
                console.log("[TEMPS PAR URL TIMEELAPSED]:", tempsParUrl.times.slice().toString());
            }
        });


    // Demander au content script de donner combien de temps s'est écoulé
    function askForTimeSpent() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { todo: "howMuchTimeElapsed" }, function (response) {
                    if (typeof response !== 'undefined') {
                        if (typeof response.timeElapsed[0] !== 'undefined') {
                            console.log("TIME SPENT: ", response.timeElapsed[0])
                            console.log("Good time");
                            resolve(response.timeElapsed[0]);
                        }
                        else {
                            console.log("bad time");
                            reject(0);
                        }
                    }
                    else {
                        //assurerInitialisationTableauTemps();
                        console.log("bad time");
                        reject(0);
                    }
                });
            });
            // console.log("datatoreturn: ", theTimeSpent)
        });
    }


    function getHostnameFromRegex(url) {
        let matches = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/im);
        return matches && matches[1];
    }

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        update();
    });

    function update() {
        chrome.storage.sync.get(["niveauSeverite", "proprietesDeRappel"], function (donnees) {
            if (typeof donnees.niveauSeverite !== "undefined" && typeof donnees.proprietesDeRappel !== "undefined") {
                donneesSeverite = [parseInt(donnees.niveauSeverite[1]), donnees.proprietesDeRappel[0], donnees.proprietesDeRappel[1]];
            } else { donneesSeverite = [0, 0, false]; }

        });

        chrome.storage.local.get(["urlsListeNoire", "urlsListeBlanche"], function (donnees) {
            listesUrl = [
                typeof donnees.urlsListeNoire !== "undefined" ? donnees.urlsListeNoire : []
                , typeof donnees.urlsListeBlanche !== "undefined" ? donnees.urlsListeBlanche : []
            ];
        });

    }

    function lookForURL(url) {

        if (typeof url !== "undefined") {
            let checkedUrl = listesUrl[0].find(x => url.includes(x)) !== undefined ? listesUrl[0].find(x => url.includes(x)) : getHostnameFromRegex(url);
            for (let i = 0; i < tempsParUrl.times.length; i++) {
                if (tempsParUrl.times[i][0] == checkedUrl) {
                    console.log('lookforurlResult:', url, checkedUrl);
                    return i;
                }
            }
        }
        return -1;
    }

    // function assurerInitialisationTableauTemps() {
    //     if (!("times" in tempsParUrl)) {
    //         tempsParUrl.times = [];
    //     }
    // }

    // function regExpEscape(literal_string) {
    //     return literal_string.replace(/[-[\]{}()+!<=:?.\/\\^$|#\s,]/g, '\\$&').replace(/\*/g,".*");
    // }

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

    function storeData(url, temps, erreur = false) {

        console.log('Preparing to store data.........');

        if (urlValide(url)) {

            //assurerInitialisationTableauTemps();

            let checkedUrl = listesUrl[0].find(x => url.includes(x)) !== undefined ? listesUrl[0].find(x => url.includes(x)) : getHostnameFromRegex(url);

            let trouve = false
            for (let i = 0; i < tempsParUrl.times.length && !trouve; i++) {
                if (tempsParUrl.times[i][0] == checkedUrl) {
                    let tempsTraite = ((!isNaN(temps)) ? temps : 0);
                    if (!erreur) {
                        tempsParUrl.times[i][1] = tempsTraite;
                        console.log('______storing_sucess..._____');
                    } else { console.log('____________failed to store data_________ '); }
                    trouve = true;
                }
            }
            if (!trouve) {
                tempsParUrl.times.push([checkedUrl, temps]);
            }
            chrome.storage.local.set(tempsParUrl);

            showBytesInUse();
        }
    }

});


    // setInterval(() => {
    //     // console.log(TimeMe.getTimeOnCurrentPageInSeconds());
    //     // if (typeof url !== 'undefined') {
    //     //     console.log(url);
    //     // }
    // }, 1000);


chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({ url: "options.html" }, function (tab) {
    });
});

setTimeout(() => {

    var donneesSeverite;   //avant: [niveau,temps,(bool)début] -> maintenant : [[niveau,temps,début],[niveau,temps,début],....]
    var listesUrl = [[], []];  //avant : [tableauListeNoire,tableauListeBlanche] -> maintenant : [tableau2dListesNoiresParGroupe,tableau2dListesBlanchesParGroupe]
    var tempsParUrl = { times: [] };  //objet qui contient les urls et le temps passé dans un tableau 2d comme ceci {times:[[URL,temps][...]...]}
    var dateOfLastSave;
    var sitesImmunises = [];  //tableau qui contient les pages webs ouvertes depuis moins de 7 minutes avec début activé



    chrome.storage.local.get("date", function (arg) {
        console.log(arg.date);
        today = getTodayInString();
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

    gererSleepMode();
    saveDateOfLastSave();
    showBytesInUse();


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

    function gererUnNouveauJour() {
        let dateOfOpen = (new Date()).getTime();
        let dateOfTomorrow = new Date(dateOfOpen + (24 * 60 * 60 * 1000));
        dateOfTomorrow.setHours(0); dateOfTomorrow.setMinutes(0); dateOfTomorrow.setSeconds(1); dateOfTomorrow.setMilliseconds(0);
        let tempsRestantPourDemainEnMs = dateOfTomorrow.getTime() - dateOfOpen;
        console.log('tempsRestantPourDemainEnH:', tempsRestantPourDemainEnMs / (1000 * 60 * 60));
        return setTimeout(() => {
            commencerUnNouveauJour();
            console.log("Nouveau jour [1]");
            setInterval(() => {
                commencerUnNouveauJour();
                console.log("Nouveau jour [2+]");
            }, (24 * 60 * 60 * 1000));
        }, tempsRestantPourDemainEnMs);
    }

    function gererSleepMode() {
        let derniereFois = (new Date()).getTime();
        let timerDeRecommencement = gererUnNouveauJour();

        setInterval(() => {
            let tempsActuel = (new Date()).getTime();
            if (tempsActuel > (derniereFois + 3 * 60 * 1000)) {  // vérifie si l'écart entre la dernière fois est grand
                // L'ordinateur vien de se réveiller
                if (dateOfLastSave != getTodayInString()) {
                    commencerUnNouveauJour();
                }
                clearTimeout(timerDeRecommencement);
                timerDeRecommencement = gererUnNouveauJour();
            }
            derniereFois = tempsActuel;
        }, 30 * 1000);
    }

    function getTodayInString() {
        let today = new Date();
        return JSON.stringify([today.getDate(), today.getMonth() + 1, today.getFullYear()]);
    }

    function saveDateOfLastSave() {
        setTimeout(() => {
            console.log("dateOfLastSave:", dateOfLastSave);
            chrome.storage.local.set({ date: dateOfLastSave });
        }, 1000);
    }

    function commencerUnNouveauJour() {
        tempsParUrl = { times: [] };
        chrome.storage.local.set(tempsParUrl);
        dateOfLastSave = getTodayInString();
        saveDateOfLastSave();
        // chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        //     chrome.tabs.sendMessage(tabs[0].id, { resetYourTime: true }, function (response) {
        //         console.log('Sent Message to content script to reset the time');
        //     });
        // });
        chrome.tabs.query({}, function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
                chrome.tabs.sendMessage(tabs[i].id, { resetYourTime: true }, function (response) {
                    console.log('Sent Message to content script to reset the time');
                });
            }
        });
    }


    //changement du tab selectionné parmis les tabs ouverts
    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            let url = tab.url;
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
        if (tab.active) {
            if (change.url) {
                let url = change.url;
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
            if (change.audible == true) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { keepTracking: "true" }, function (response) {
                        console.log('___tab is audible___');
                    });
                });
            } else if (change.audible == false) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { keepTracking: "false" }, function (response) {
                        console.log('___tab is no more audible___');
                    });
                });
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
                console.log("listes:", JSON.stringify(listesUrl));
                console.log("current url:", sender.tab.url)
                console.log("IsitHere?", listesUrl[0].some(x => x.some(y => (sender.tab.url).includes(y))) ? listesUrl[0].find(x => x.some(y => (sender.tab.url).includes(y))).find(z => (sender.tab.url).includes(z)) : "NO");

                let donneesAEnvoyer = [];
                for (let i = 0, nbGroupes = listesUrl[0].length; i < nbGroupes; i++) {

                    let presentDansListeNoire = listesUrl[0][i].some(x => sender.tab.url.includes(x) || x == "*.*");
                    let presentDansListeBlanche = listesUrl[1][i].some(x => sender.tab.url.includes(x) || x == "*.*");
                    let urlEstImmunisee = sitesImmunises.some(x => sender.tab.url.includes(x));

                    if (presentDansListeNoire || presentDansListeBlanche || urlEstImmunisee) {
                        console.log(`Groupe[${i}]\nIsInBlackList:${presentDansListeNoire}\nIsInWhiteList:${presentDansListeBlanche}\nIsImmunised:${urlEstImmunisee}`);
                    } else {
                        console.log(`Groupe[${i}] N'est nul part`)
                    }

                    if (presentDansListeNoire && !presentDansListeBlanche) {
                        let severiteDeCeGroupe = donneesSeverite[i].slice();
                        console.log(`;;donneesSeverite[${i}]:`, JSON.stringify(donneesSeverite[i]));
                        if (severiteDeCeGroupe[0] !== 0) {
                            if (urlEstImmunisee) {
                                severiteDeCeGroupe[2] = false;
                            }
                            donneesAEnvoyer.push(severiteDeCeGroupe);
                        }
                    }
                }
                console.log('::donneesAEnvoyer:', JSON.stringify(donneesAEnvoyer));

                if (donneesAEnvoyer.length === 0) {
                    sendResponse({ responseMessage: [[0, 0, false]] });
                }
                sendResponse({ responseMessage: donneesAEnvoyer });

                // if (listesUrl[1].some(x => (sender.tab.url).includes(x)) || listesUrl[1].some(x => x == "*.*")) {           //est dans la liste blanche
                //     sendResponse({ responseMessage: [0, 0, false] });
                //     console.log("is in whitelist");
                // } else if (listesUrl[0].some(x => (sender.tab.url).includes(x) || listesUrl[0].some(x => x == "*.*"))) {    //est dans la liste noire
                //     console.log("is in blacklist");
                //     if (donneesSeverite[2] == true && sitesImmunises.some(x => (sender.tab.url).includes(x))) {
                //         console.log('__site immunisé!');
                //         sendResponse({ responseMessage: donneesSeverite.map(x => x == true ? false : x) });
                //     }
                //     sendResponse({ responseMessage: donneesSeverite });
                // } else {                                                              //est nul part
                //     sendResponse({ responseMessage: [0, 0, false] });
                //     console.log("is not in a list");
                // }
            } else if (message.setBadge) {
                //Original source : https://stackoverflow.com/a/32168534/7551620
                chrome.tabs.get(sender.tab.id, function (tab) {
                    if (chrome.runtime.lastError) {
                        return; // the prerendered tab has been nuked, happens in omnibox search
                    }
                    if (tab.index >= 0) { // tab is visible
                        chrome.browserAction.setBadgeText({ tabId: tab.id, text: message.setBadge[0] });
                        chrome.browserAction.setBadgeBackgroundColor({color: message.setBadge[1], tabId: tab.id});
                    } else { // prerendered tab, invisible yet, happens quite rarely
                        var tabId = sender.tab.id, text = message.setBadge[0], color = message.setBadge[1] ;
                        chrome.webNavigation.onCommitted.addListener(function update(details) {
                            if (details.tabId == tabId) {
                                chrome.browserAction.setBadgeText({ tabId: tabId, text: text });
                                chrome.browserAction.setBadgeBackgroundColor({color: color, tabId: tabId});
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

            } else if (message.immuniser) {
                console.log('__added to sites immunisé');
                addToSitesImmunises(sender.tab.url);

            } else if (message.mute == 1) {  // Mute sounds

                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    var mutedInfo = tabs[0].mutedInfo;
                    if (mutedInfo) chrome.tabs.update(tabs[0].id, { "muted": true });
                });

            } else if (message.lauchThisLevelNow == 2) {   //Close tab
                
                chrome.tabs.remove(sender.tab.id);

            } else if (message.lauchThisLevelNow == 3) {   //Close tab after 10 seconds
                setTimeout(() => {
                    chrome.tabs.remove(sender.tab.id);
                }, 10 * 1000);

            } else if (message.lauchThisLevelNow == 4) {   //Close chrome
                console.log("Entered Message.launchThisNow");
                chrome.tabs.query({}, function (tabs) {
                    for (var i = 0; i < tabs.length; i++) {
                        chrome.tabs.remove(tabs[i].id);
                    }
                });
            } else if (message.timeElapsed) {
                console.log("start by runtime");
                console.log("stored new data..!");
                console.log("[[SENDER URL]] (listener) :" + sender.tab.url, message.timeElapsed[0])
                setTimeout(() => {
                    console.log("[[SENDER URL FUTURE]] (listener) :" + sender.tab.url, message.timeElapsed[0])
                });

                storeData(message.timeElapsed[1], message.timeElapsed[0]);

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

    function addToSitesImmunises(url) {
        let hostname = getHostnameFromRegex(url);
        if (!sitesImmunises.includes(hostname)) {
            sitesImmunises.push(hostname);
            setTimeout(() => {
                sitesImmunises = sitesImmunises.filter(x => x !== hostname);
            }, 10 * 60 * 1000);
        }
        console.log('.._..sitesImmunises:', JSON.stringify(sitesImmunises));
    }


    function getHostnameFromRegex(url) {
        /* //old version
        let matches = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/im);
        return matches && matches[1];
        */
        let hostname = (new URL(url)).hostname.replace(/^www\./ig, '');
        return hostname;
    }

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        update();
    });

    function update() {
        chrome.storage.sync.get(["donneesSeverite"], function (donnees) {
            if (typeof donnees.donneesSeverite !== "undefined") {
                donneesSeverite = donnees.donneesSeverite;
            } else { donneesSeverite = [[0, 0, false]]; }

        });

        chrome.storage.local.get(["urlsListeNoire", "urlsListeBlanche"], function (donnees) {
            listesUrl = [
                typeof donnees.urlsListeNoire !== "undefined" ? donnees.urlsListeNoire : [[]]
                , typeof donnees.urlsListeBlanche !== "undefined" ? donnees.urlsListeBlanche : [[]]
            ];
        });

    }

    function lookForURL(url) {
        //vérifie si une partie spécifique d'un site web est dans une liste noire, si oui, enregistre cette partie spécifique, sinon enregistre tout le site
        if (typeof url !== "undefined") {
            // let checkedUrl = listesUrl[0].find(x => url.includes(x)) !== undefined ? listesUrl[0].find(x => url.includes(x)) : getHostnameFromRegex(url);
            let rechercheur = listesUrl[0].find(x => x.some(y => url.includes(y)));
            let checkedUrl = typeof rechercheur !== "undefined" ? rechercheur.find(y => url.includes(y)) : getHostnameFromRegex(url);
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

            let rechercheur = listesUrl[0].find(x => x.some(y => url.includes(y)));
            let checkedUrl = typeof rechercheur !== "undefined" ? rechercheur.find(y => url.includes(y)) : getHostnameFromRegex(url);

            let trouve = false
            for (let i = 0; i < tempsParUrl.times.length && !trouve; i++) {
                if (tempsParUrl.times[i][0] == checkedUrl) {
                    let tempsTraite = ((!isNaN(temps)) ? temps : 0);
                    if (!erreur) {
                        if ((!isNaN(tempsParUrl.times[i][1])) ? tempsParUrl.times[i][1] < tempsTraite : true) {
                            tempsParUrl.times[i][1] = tempsTraite;
                        }
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


chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({ url: "options.html" }, function (tab) {
    });
});

setTimeout(() => {
    var currentVersion = "2.0.3";
    var initialisationCompletee = false;   //variable pour empecher le bug de suppression des tempsParUrl
    // createNotification("Restarted", `currentVersion: ${currentVersion}`);
    var donneesSeverite;   //[[niveau,temps,début],[niveau,temps,début],....]
    var listesUrl = [[], []];  //[tableau2dListesNoiresParGroupe,tableau2dListesBlanchesParGroupe]
    var tempsParUrl = { times: [] };  //objet qui contient les urls et le temps passé dans un tableau 2d comme ceci {times:[[URL,temps][...]...]}
    var pausesHebdomadaires = [[], [], [], [], [], [], []]; //temps ou les niveaux de sévérité ne s'appliquerons pas, par jour (valeurs de temps en min après 00:00) ex : [[], [], [[234,512],[400,1200]], [], [[0,600]], [], []];
    var dernierChangementPauses = 0; //timestamp du dernier changement de pauses
    var dateOfLastSave;
    var sitesImmunises = [];  //tableau qui contient les pages webs ouvertes depuis moins de 7 minutes avec début activé
    var groupesCaches = [[], []];  //[donneesSeverite,listesUrlNoire] donc [[[niveau,temps,début],[niveau,temps,début]],[[url,url,url],[url,url]]]
    var longTimeouts = [];  // références les longs timeouts qui risquent de ne pas se lancer si la personne met son ordinateur en mode veille
    var etatUrlsAvecNiveau3 = [[[], []], [[], [], []]]; // [[[liste d'urls avec niveau 3 actif actuellement],[temps de fermeture de ces urls]],[[liste d'urls ayant subi le niveau 3],[nombre de fois subi par url],[temps initial par url]]]
    var urlsAvecNiveau2Actif = [];

    var archiveTempsParUrl = [[], [], [], [], [], [], []];  //conserve les temps par url pour la semaine complète sous cette forme [[tempsParUrlJ1,dateJ1],[tempsParUrlJ2,dateJ2],...];

    //vérifie la version et procède à certains arrangements selon la version de l'utilisateur
    chrome.storage.sync.get('currentVersion', function (arg) {
        //règle défauts version 1.4.3 
        if (typeof arg.currentVersion === 'undefined' && currentVersion === "1.4.3") {
            chrome.storage.local.get('date', function (arg) {
                if (typeof arg.date !== 'undefined') {
                    chrome.storage.local.get(['urlsListeNoire', 'urlsListeBlanche'], function (arg) {
                        if (typeof arg.urlsListeNoire !== 'undefined' || typeof arg.urlsListeBlanche !== 'undefined') {
                            chrome.storage.sync.get(['urlsListeNoire', 'urlsListeBlanche'], function (arg2) {
                                if (typeof arg2.urlsListeNoire === 'undefined' && typeof arg2.urlsListeBlanche === 'undefined') {
                                    chrome.storage.sync.set({ urlsListeNoire: arg.urlsListeNoire, urlsListeBlanche: arg.urlsListeNoire });
                                }
                            });
                        }
                    });
                }
            });
        } else if (arg.currentVersion === "1.5.2") {
            chrome.storage.sync.get(["donneesListeNoire", "donneesListeBlanche", "contenuHTMLListe"], function (donnees) {
                if (typeof donnees["donneesListeNoire"] !== "undefined") {
                    chrome.storage.sync.set({ donneesListeNoire: LZString.compressToUTF16(donnees["donneesListeNoire"]) });
                }
                if (typeof donnees["donneesListeBlanche"] !== "undefined") {
                    chrome.storage.sync.set({ donneesListeBlanche: LZString.compressToUTF16(donnees["donneesListeBlanche"]) });
                }
                if (typeof donnees["contenuHTMLListe"] !== "undefined") {
                    chrome.storage.sync.set({ contenuHTMLListe: LZString.compressToUTF16(donnees["contenuHTMLListe"]) });
                }
            });
        }

        chrome.storage.sync.set({ currentVersion: currentVersion });
    });

    //vérifie si l'initialisation est la première de la journée ou non
    chrome.storage.local.get(["date", "archiveTempsParUrl"], function (arg) {
        //tconsole.log(arg.date);
        let today = getTodayInString();
        if (typeof arg.date !== "undefined") {
            dateOfLastSave = arg["date"];
            //tconsole.log("Données de date existantes");
            if (today === dateOfLastSave) {
                initTempsParUrl();
                initGroupesCaches();
                initEtatUrlsAvecNiveau3();
                //tconsole.log("Chargé tempsparurl");
            } else {
                dateOfLastSave = today;
                chrome.storage.local.set(tempsParUrl);
                chrome.storage.local.set({ groupesCaches: [[], []] });
                //tconsole.log("Nouveau jour");
            }
        } else {
            dateOfLastSave = today;
            //tconsole.log("Pas de données dispo pour tempsparurl");
        }
        chrome.storage.sync.get('firstOpeningTimestamp', function (arg) {
            if (typeof arg.firstOpeningTimestamp === 'undefined') {
                chrome.storage.sync.set({ firstOpeningTimestamp: Date.now() });
            }
        });

        //charge l'archive des temps par url
        if (typeof arg.archiveTempsParUrl !== 'undefined') {
            archiveTempsParUrl = arg.archiveTempsParUrl;
        }

        //gère les situations ou l'utilisateur met son ordinateur en veille
        gererSleepMode();

        saveDateOfLastSave();
        showBytesInUse();

        //mettre à jour les informations sur les listes
        update();
        initialisationCompletee = true;
    });

    chrome.storage.sync.get('dateFinOverdrive', function (arg) {
        if (typeof arg.dateFinOverdrive !== 'undefined') {
            if (arg.dateFinOverdrive > Date.now()) {
                chrome.tabs.query({}, function (tabs) {
                    for (var i = 0; i < tabs.length; i++) {
                        chrome.tabs.remove(tabs[i].id);
                    }
                });
            }
        }
    });

    //initialisation de tempsParUrl
    function initTempsParUrl() {
        chrome.storage.local.get("times", function (arg) {
            if (typeof arg.times !== "undefined") {
                tempsParUrl.times = arg.times;
            }
        });
    }

    //initialisation des groupes cachés
    function initGroupesCaches() {
        chrome.storage.local.get("groupesCaches", function (arg) {
            if (typeof arg.groupesCaches !== 'undefined') {
                groupesCaches = arg.groupesCaches;
                // let length = groupesCaches[0].length;
                // setTimeout(() => {
                //     for (let i = 0; i < length; i++) {
                //         groupesCaches[0].splice(i, 1);
                //         groupesCaches[1].splice(i, 1);
                //     }
                // }, 5 * 60 * 1000);
                setIntervalImmediately(() => {
                    for (let i = 0; i < groupesCaches[0].length; i++) {
                        ////tconsole.log(`groupesCaches[0][${i}][3]:`,groupesCaches[0][i][3],Date.now());
                        if (groupesCaches[0][i][3] < Date.now()) {
                            groupesCaches[0].splice(i, 1);
                            groupesCaches[1].splice(i, 1);
                        }
                    }
                }, 5000);
            }

        });
    }

    //initialisation des informations sur les urls affectés par le niveau 3 de sévérité
    function initEtatUrlsAvecNiveau3() {
        chrome.storage.local.get('etatUrlsAvecNiveau3', function (arg) {
            if (typeof arg.etatUrlsAvecNiveau3 !== 'undefined') {
                etatUrlsAvecNiveau3 = arg.etatUrlsAvecNiveau3;
                let actifActuellementAncien = false;
                for (let i = 0; i < etatUrlsAvecNiveau3[0][0].length; i++) {     //devrait fixer le bug du niveau 3 persistant qui donne un chiffre negatif
                    if ((etatUrlsAvecNiveau3[0][1][i] + 1000 * 60 * 15) < Date.now()) {
                        etatUrlsAvecNiveau3[0][0].splice(i, 1);
                        etatUrlsAvecNiveau3[0][1].splice(i, 1);
                        actifActuellementAncien = true;
                    }
                }
                if (actifActuellementAncien) {
                    chrome.storage.local.set({ etatUrlsAvecNiveau3: etatUrlsAvecNiveau3 });
                }
                let length = etatUrlsAvecNiveau3[0][0].length;
                setTimeout(() => {
                    for (let i = 0; i < length; i++) {
                        etatUrlsAvecNiveau3[0][0].splice(i, 1);
                        etatUrlsAvecNiveau3[0][1].splice(i, 1);
                    }
                }, 5 * 60 * 1000);
            }
        });
    }

    // function createNotification(title, message) {
    //     let options = {
    //         type: "basic",
    //         iconUrl: chrome.runtime.getURL("img/icon128.png"),
    //         title: title,
    //         message: message
    //     }
    //    //tconsole.log(`Notification lancée`);
    //     chrome.notifications.create(Math.random().toString(), options, () => { });
    // }

    //remmet les compteurs de temps des urls à zéro quand un nouveau jour commence
    function gererUnNouveauJour() {
        let tempsRestantPourDemainEnMs = calculerTempsRestantPourDemainEnMs();
        //tconsole.log('tempsRestantPourDemainEnH:', tempsRestantPourDemainEnMs / (1000 * 60 * 60));
        return setTimeout(() => {
            commencerUnNouveauJour();
            // createNotification("For Developper", "Les temps ont recommencés [1]");
            //tconsole.log("Nouveau jour [1]");
            setInterval(() => {
                commencerUnNouveauJour();
                // createNotification("For Developper", "Les temps ont recommencés [2]");
                //tconsole.log("Nouveau jour [2+]");
            }, (24 * 60 * 60 * 1000));
        }, tempsRestantPourDemainEnMs);
    }

    function calculerTempsRestantPourDemainEnMs() {
        let dateOfOpen = (new Date()).getTime();
        let dateOfTomorrow = new Date(dateOfOpen + (24 * 60 * 60 * 1000));
        dateOfTomorrow.setHours(0); dateOfTomorrow.setMinutes(0); dateOfTomorrow.setSeconds(1); dateOfTomorrow.setMilliseconds(0);
        return dateOfTomorrow.getTime() - dateOfOpen;
    }

    //gère les situations ou l'utilisateur met son ordinateur en veille
    function gererSleepMode() {
        let derniereFois = (new Date()).getTime();
        let timerDeRecommencement = gererUnNouveauJour();

        setInterval(() => {
            let tempsActuel = (new Date()).getTime();
            if (tempsActuel > (derniereFois + 3 * 60 * 1000)) {  // vérifie si l'écart entre la dernière fois est grand
                // L'ordinateur vien de se réveiller
                if (dateOfLastSave != getTodayInString()) {
                    commencerUnNouveauJour();
                    // createNotification("For Developper", "Les temps ont recommencés [3]");
                    //tconsole.log(`Nouveau jour [3] \ndateOfLastSave${dateOfLastSave}\ngetTodayInString${getTodayInString()} `)
                } else {
                    initGroupesCaches();
                    initEtatUrlsAvecNiveau3();
                }
                for (let timeoutobject of longTimeouts) {
                    clearTimeout(timeoutobject);
                }
                longTimeouts = [];

                clearTimeout(timerDeRecommencement);
                timerDeRecommencement = gererUnNouveauJour();
            }
            derniereFois = tempsActuel;
        }, 30 * 1000);
    }

    //obtient la petite date d'aujourd'hui en format string pour faciliter les comparaisons
    function getTodayInString() {
        let today = new Date();
        return JSON.stringify([today.getDate(), today.getMonth() + 1, today.getFullYear()]);
    }

    function getTodayInDays() {
        return ~~(convertUTCDateToLocalDate(new Date()) / (1000 * 60 * 60 * 24));
    }

    function convertUTCDateToLocalDate(date) {
        return new Date(date.getTime() - date.getTimezoneOffset()*60*1000);   
    }

    function ajouterATempsParUrlArchive(tempsParUrl) {
        let aujourdhui = getTodayInDays();
        if (archiveTempsParUrl[0].length === 0) {
            archiveTempsParUrl[0] = [tempsParUrl, aujourdhui];
        } else {
            let differenceDeJours = aujourdhui - archiveTempsParUrl[0][1];
            if (differenceDeJours > 6) {
                archiveTempsParUrl = [[tempsParUrl, aujourdhui], [], [], [], [], [], []];
            } else if (differenceDeJours === 0) {
                archiveTempsParUrl[0] = [tempsParUrl, aujourdhui];
            } else {
                for (let i = 0; i < differenceDeJours; i++) {
                    for (let j = archiveTempsParUrl.length - 1; j > 0; j--) {
                        archiveTempsParUrl[j] = archiveTempsParUrl[j - 1];
                        if (j == 1) {
                            archiveTempsParUrl[j - 1] = [];
                        }
                    }
                }
                archiveTempsParUrl[0] = [tempsParUrl, aujourdhui];
            }
        }
        // tconsole.log(`archiveTempsParUrl:`,JSON.stringify(archiveTempsParUrl));
        chrome.storage.local.set({ archiveTempsParUrl: archiveTempsParUrl });
    }

    //sauvegarde la date de la dernière initialisation
    function saveDateOfLastSave() {
        setTimeout(() => {
            //tconsole.log("dateOfLastSave:", dateOfLastSave);
            chrome.storage.local.set({ date: getTodayInString() });

        }, 1000);
    }

    //remmet les compteurs de temps des urls à zéro quand un nouveau jour commence
    function commencerUnNouveauJour() {
        tempsParUrl = { times: [] };
        chrome.storage.local.set(tempsParUrl);
        chrome.storage.local.set({ groupesCaches: [[], []] });
        dateOfLastSave = getTodayInString();
        saveDateOfLastSave();

        for (let timeoutobject of longTimeouts) {
            clearTimeout(timeoutobject);
        }
        longTimeouts = [];
        groupesCaches = [[], []];
        etatUrlsAvecNiveau3 = [[[], []], [[], [], []]];

        chrome.tabs.query({}, function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
                chrome.tabs.sendMessage(tabs[i].id, { resetYourTime: 1 }, function (response) {
                    //tconsole.log('Sent Message to content script to reset the time');
                });
            }
        });
    }


    //changement du tab selectionné parmis les tabs ouverts
    chrome.tabs.onActivated.addListener(function (activeInfo) {
        if (initialisationCompletee) {
            chrome.tabs.get(activeInfo.tabId, function (tab) {
                let url = tab.url;
                if (urlValide(url)) {
                    (async function () { await askForTimeSpent(activeInfo.tabId).then(result => storeData(url, result), error => storeData(url, error, true)); })();
                }
            });
        }
    });

    //changement à l'intérieur du tab actif (raffraichir ou nouveau lien)
    chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
        if (initialisationCompletee) {
            if (change.url) {
                let url = change.url;
                if (urlValide(url)) {
                    askForTimeSpent(tabId).then((result) => {
                        storeData(url, result);
                        //tconsole.log(`STORED ${url} with ${result}`);
                    }, (error) => {
                        storeData(url, error, true);
                        //tconsole.log(`STORED ERROR ${url} with ${error}`);
                    });
                    // let timeSpent = (async function(){return await askForTimeSpent().then(result => result, error => error);})();

                    ////tconsole.log("end by onUpdated");
                }
            }

            //un son à été joué sur la page du navigateur récement
            if (change.audible == true) {
                chrome.tabs.query({}, function (tabs) {
                    chrome.tabs.sendMessage(tabId, { keepTracking: 1 }, function (response) {
                        //tconsole.log('___tab is audible___');
                    });
                });
                //Le son ne joue plus
            } else if (change.audible == false) {
                chrome.tabs.query({}, function (tabs) {
                    chrome.tabs.sendMessage(tabId, { keepTracking: 0 }, function (response) {
                        //tconsole.log('___tab is no more audible___');
                    });
                });
            }
        }
    });

    function urlValide(val) {
        var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$|^localhost/gmi;
        return regexURL.test(val);
    }

    // Gère les demandes envoyés du content script
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            if (initialisationCompletee) {
                // Envoie le temps correspondant à celui de l'url de la page active du content script
                if (message.sendMePreviousTimeData) {
                    update();

                    let urlIsPresent = lookForURL(message.sendMePreviousTimeData) !== -1;
                    //tconsole.log('___Sent time___:', tempsParUrl.times[lookForURL(message.sendMePreviousTimeData)][1], message.sendMePreviousTimeData);
                    sendResponse({ responseMessage: (urlIsPresent ? tempsParUrl.times[lookForURL(message.sendMePreviousTimeData)][1] : 0) });

                    // Envoie les sévéritées correspondantes à celles de l'url de la page active du content script
                } else if (message.sendMeDonneesSeverite) {
                    let url = message.sendMeDonneesSeverite;
                    update();
                    //tconsole.log("current url:", message.sendMeDonneesSeverite);
                    //tconsole.log("IsitHere?", listesUrl[0].some(x => x.some(y => (url).includes(y))) ? listesUrl[0].find(x => x.some(y => (url).includes(y))).find(z => (url).includes(z)) : "NO");

                    let aUnNiveau3EncoreActif = etatUrlsAvecNiveau3[0][0].findIndex(x => url.includes(x));
                    let donneesAEnvoyer = [];
                    for (let i = 0, nbGroupes = listesUrl[0].length; i < nbGroupes; i++) {

                        let presentDansListeNoire = listesUrl[0][i].some(x => url.includes(x) || x == "*.*");
                        let presentDansListeBlanche = listesUrl[1][i].some(x => url.includes(x) || x == "*.*");
                        let enPeriodeDeRepos = verifierSiPeriodeDeRepos();
                        let urlEstImmunisee = sitesImmunises.some(x => url.includes(x));
                        let urlAvaitUnNiveau2Actif = urlsAvecNiveau2Actif.some(x => url.includes(x));
                        let sansNiveau2Temporairement = groupesCaches[1].some(x => x.some(y => getHostname(url).includes(y)));

                        // if (presentDansListeNoire || presentDansListeBlanche || urlEstImmunisee) {
                        //     //tconsole.log(`Groupe[${i}]\nIsInBlackList:${presentDansListeNoire}\nIsInWhiteList:${presentDansListeBlanche}\nIsImmunised:${urlEstImmunisee}\nIsInRepos:${enPeriodeDeRepos}`);
                        // } else {
                        //     //tconsole.log(`Groupe[${i}] N'est nul part`);
                        // }

                        if (presentDansListeNoire && !presentDansListeBlanche && !enPeriodeDeRepos) {
                            let severiteDeCeGroupe = donneesSeverite[i].slice();
                            //tconsole.log(`;;donneesSeverite[${i}]:`, JSON.stringify(donneesSeverite[i]));
                            if (severiteDeCeGroupe[0] !== 0) {
                                if (urlEstImmunisee && severiteDeCeGroupe[0] <= 2) {
                                    severiteDeCeGroupe[2] = false;
                                } else if (urlAvaitUnNiveau2Actif && severiteDeCeGroupe[0] === 2) {
                                    severiteDeCeGroupe[2] = true;
                                } else if (sansNiveau2Temporairement && severiteDeCeGroupe[0] === 2) {
                                    severiteDeCeGroupe = [1, 0, false];
                                } else if (severiteDeCeGroupe[0] === 3 && i < (listesUrl[0].length - groupesCaches[0].length)) {
                                    //tconsole.log("______etatUrlsAvecNiveau3:  ", JSON.stringify(etatUrlsAvecNiveau3));
                                    let index = etatUrlsAvecNiveau3[1][0].findIndex(x => url.includes(x));
                                    if (index > -1) {
                                        severiteDeCeGroupe[1] *= etatUrlsAvecNiveau3[1][1][index];
                                        severiteDeCeGroupe[1] += etatUrlsAvecNiveau3[1][2][index];
                                    }
                                    //tconsole.log("______etatUrlsAvecNiveau3Severite:  ", JSON.stringify(severiteDeCeGroupe));
                                }
                                donneesAEnvoyer.push(severiteDeCeGroupe);
                            }
                        }
                    }
                    if (aUnNiveau3EncoreActif > -1) donneesAEnvoyer.push([3, 0, Math.ceil((etatUrlsAvecNiveau3[0][1][aUnNiveau3EncoreActif] - Date.now()) / (1000 * 60))]);

                    //tconsole.log('::donneesAEnvoyer:', JSON.stringify(donneesAEnvoyer));

                    if (donneesAEnvoyer.length === 0) {
                        sendResponse({ responseMessage: [[0, 0, false]] });
                    }
                    sendResponse({ responseMessage: donneesAEnvoyer });

                    //Envoie le temps de blocage restant pour le niveau 3
                } else if (message.sendMeTempsDeBlocageLv3) {
                    let url = message.sendMeTempsDeBlocageLv3;
                    let index = etatUrlsAvecNiveau3[0][0].findIndex(x => url.includes(x));
                    sendResponse({ tempsDeBlocageLv3: index !== -1 ? etatUrlsAvecNiveau3[0][1][index] : -1 });

                    //gère le badge de l'extension
                } else if (message.setBadge) {
                    //Original source : https://stackoverflow.com/a/32168534/7551620
                    chrome.tabs.get(sender.tab.id, function (tab) {
                        if (chrome.runtime.lastError) {
                            return; // the prerendered tab has been nuked, happens in omnibox search
                        }
                        if (tab.index >= 0) { // tab is visible
                            chrome.browserAction.setBadgeText({ tabId: tab.id, text: message.setBadge[0] });
                            chrome.browserAction.setBadgeBackgroundColor({ color: message.setBadge[1], tabId: tab.id });
                        } else { // prerendered tab, invisible yet, happens quite rarely
                            var tabId = sender.tab.id, text = message.setBadge[0], color = message.setBadge[1];
                            chrome.webNavigation.onCommitted.addListener(function update(details) {
                                if (details.tabId == tabId) {
                                    chrome.browserAction.setBadgeText({ tabId: tabId, text: text });
                                    chrome.browserAction.setBadgeBackgroundColor({ color: color, tabId: tabId });
                                    chrome.webNavigation.onCommitted.removeListener(update);
                                }
                            });
                        }
                    });

                    //Enlève le mute de la page active du content script
                } else if (message.mute == 0) {

                    chrome.tabs.query({}, function (tabs) {
                        var mutedInfo = sender.tab.mutedInfo; 
                        if (mutedInfo) chrome.tabs.update(sender.tab.id, { "muted": false });
                    });
                } else if (message.mute == 1) {  // Mute sounds

                    chrome.tabs.query({}, function (tabs) {
                        var mutedInfo = sender.tab.mutedInfo;
                        if (mutedInfo) chrome.tabs.update(sender.tab.id, { "muted": true });
                    });
                } else if (message.immuniser) { //Immunise le site web contre un nouveau pop du niveau 2 au début pour 10 minutes
                    //tconsole.log('__added to sites immunisé');
                    addToSitesImmunises(sender.tab.url);

                } else if (message.niveau2EstActif) { //l'utilisateur a raffrachi la page alors qu'il a une boite de niveau 2 active
                    //tconsole.log('__added to UrlsAvecNiveau2Actif');
                    addToUrlsAvecNiveau2Actif(message.niveau2EstActif);

                } else if (message.ajouterAUnGroupeCache) {  //Créé un groupe caché pour mettre en place une sévérité de niveau 3 temporaire
                    //tconsole.log('__added to groupe caché');
                    addToHiddenGroup(message.ajouterAUnGroupeCache[1], message.ajouterAUnGroupeCache[0], message.ajouterAUnGroupeCache[2], message.ajouterAUnGroupeCache[3]);

                } else if (message.lauchThisLevelNow == 2) {   //Close tab

                    chrome.tabs.remove(sender.tab.id);

                } else if (message.lauchThisLevelNow == 3) {   //Close tab after 5 seconds
                    setTimeout(() => {
                        chrome.tabs.remove(sender.tab.id);
                    }, 5 * 1000);

                } else if (message.lauchThisLevelNow == 4) {   //Close chrome
                    //tconsole.log("Entered Message.launchThisNow");
                    chrome.tabs.query({}, function (tabs) {
                        for (var i = 0; i < tabs.length; i++) {
                            chrome.tabs.remove(tabs[i].id);
                        }
                    });
                } else if (message.gererNiveau3) {  //Gestion du processus de répétition du niveau 3 après qu'il aie pop
                    gererNiveau3(message.gererNiveau3[0], message.gererNiveau3[1], message.gererNiveau3[2]);

                } else if (message.timeElapsed) {  //Enregsistre le temps écoulé sur la page web récente
                    //tconsole.log("start by runtime");
                    //tconsole.log("stored new data..!");

                    storeData(message.timeElapsed[1], message.timeElapsed[0]);
                }
            }
        });


    // Demander au content script de donner combien de temps s'est écoulé
    function askForTimeSpent(tabID) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({}, function (tabs) {
                chrome.tabs.sendMessage(tabID, { todo: "howMuchTimeElapsed" }, function (response) {
                    if (typeof response !== 'undefined') {
                        if (typeof response.timeElapsed[0] !== 'undefined') {
                            //tconsole.log("TIME SPENT: ", response.timeElapsed[0]);
                            //tconsole.log("Good time");
                            resolve(response.timeElapsed[0]);
                        }
                        else {
                            //tconsole.log("bad time");
                            reject(0);
                        }
                    }
                    else {

                        //tconsole.log("bad time");
                        reject(0);
                    }
                });
            });
            ////tconsole.log("datatoreturn: ", theTimeSpent)
        });
    }

    //Immunise le site web contre un nouveau pop du niveau 2 au début pour 10 minutes
    function addToSitesImmunises(url) {
        let hostname = getHostname(url);
        if (!sitesImmunises.includes(hostname)) {
            sitesImmunises.push(hostname);
            setTimeout(() => {
                sitesImmunises = sitesImmunises.filter(x => x !== hostname);
            }, 10 * 60 * 1000);
        }
        //tconsole.log('.._..sitesImmunises:', JSON.stringify(sitesImmunises));
    }

    function addToUrlsAvecNiveau2Actif(url) {
        let hostname = getHostname(url);
        urlsAvecNiveau2Actif.push(hostname);
        setTimeout(() => {
            let index = urlsAvecNiveau2Actif.indexOf(item);
            if (index !== -1) urlsAvecNiveau2Actif.splice(index, 1);
        }, 30 * 1000);
    }

    //vérifie si nous sommes actuellement en période de repos
    function verifierSiPeriodeDeRepos() {
        let maintenant = new Date();
        let tempsEcouleDeLaJourneeEnMin = maintenant.getHours() * 60 + maintenant.getMinutes();
        let aujourdhui = maintenant.getDay();
        if (aujourdhui === 0) aujourdhui = 7;  //car getDay fait commencer la semaine par le dimanche, alors que pausehebdo commence par lundi
        aujourdhui--;
        return pausesHebdomadaires[aujourdhui].some(x => tempsEcouleDeLaJourneeEnMin >= x[0] && tempsEcouleDeLaJourneeEnMin < x[1]) && ((Date.now() - dernierChangementPauses) > (5 * 60 * 1000));
    }

    //Créé un groupe caché pour mettre en place une sévérité de niveau 3 temporaire
    function addToHiddenGroup(url, time, optionChoisie, timestamp) {
        let rechercheur = listesUrl[0].find((x, i) => x.some(y => url.includes(y) || y === "*.*") && donneesSeverite[i][0] === 2);
        let checkedUrl = rechercheur.find(y => url.includes(y));
        if (typeof checkedUrl === 'undefined') {
            checkedUrl = getHostname(url);
        }
        // if (typeof checkedUrl !== 'undefined') {
        let tempsDeBlocage = optionChoisie + (optionChoisie >= 5 ? 5 : 3) + (optionChoisie >= 10 ? 5 : 0) + (optionChoisie >= 20 ? 5 : 0);
        if (!groupesCaches[1].some(x => x.some(y => checkedUrl.includes(y)))) {
            let hiddenBlacklist = ["hiddengrouptimecompanion.hgtc", checkedUrl];
            groupesCaches[0].push([3, time, tempsDeBlocage - optionChoisie, timestamp]);
            groupesCaches[1].push(hiddenBlacklist);
            donneesSeverite.push(groupesCaches[0][groupesCaches[0].length - 1]);
            listesUrl[0].push(groupesCaches[1][groupesCaches[1].length - 1]);
            listesUrl[1].push([]);
            chrome.storage.local.set({ groupesCaches: groupesCaches });
            let hiddenGroupTimeout = setTimeout(() => {
                const index = groupesCaches[1].indexOf(hiddenBlacklist);
                if (index > -1) {

                    groupesCaches[0].splice(index, 1);
                    groupesCaches[1].splice(index, 1);

                    let indexInAllGroups = (donneesSeverite.length - groupesCaches[0].length + index);
                    donneesSeverite.splice(indexInAllGroups, 1);
                    listesUrl[0].splice(indexInAllGroups, 1);
                    listesUrl[1].splice(indexInAllGroups, 1);
                    chrome.storage.local.set({ groupesCaches: groupesCaches });
                }
            }, (tempsDeBlocage * 60 * 1000) - 100);
            longTimeouts.push(hiddenGroupTimeout);
        }
        //tconsole.log('.._..groupesCaches:', JSON.stringify(groupesCaches));
        // }
    }

    //Gestion du processus de répétition du niveau 3 après qu'il aie pop
    function gererNiveau3(duree, url, tempsInitial) {
        let rechercheur = listesUrl[0].find((x, i) => x.some(y => url.includes(y) || y === "*.*") && donneesSeverite[i][0] === 3 && i < (listesUrl[0].length - groupesCaches[0].length));
        if (typeof rechercheur !== 'undefined') {
            let checkedUrl = rechercheur.find(y => url.includes(y));
            if (typeof checkedUrl === 'undefined') {
                checkedUrl = getHostname(url);
            }
            if (!etatUrlsAvecNiveau3[0][0].some(x => checkedUrl.includes(x))) {
                etatUrlsAvecNiveau3[0][0].push(checkedUrl);
                etatUrlsAvecNiveau3[0][1].push(Date.now() + (duree !== 0 ? duree : calculerTempsRestantPourDemainEnMs() / (1000 * 60)) * 60 * 1000);
                chrome.storage.local.set({ etatUrlsAvecNiveau3: etatUrlsAvecNiveau3 });
                let timeoutDeblocageNiveau3 = setTimeout(() => {
                    const index = etatUrlsAvecNiveau3[0][0].indexOf(checkedUrl);
                    if (index > -1) {
                        etatUrlsAvecNiveau3[0][0].splice(index, 1);
                        etatUrlsAvecNiveau3[0][1].splice(index, 1);
                        const index2 = etatUrlsAvecNiveau3[1][0].indexOf(checkedUrl);
                        if (index2 > -1) {
                            etatUrlsAvecNiveau3[1][1][index2]++;
                        }
                        else {
                            etatUrlsAvecNiveau3[1][0].push(checkedUrl);
                            etatUrlsAvecNiveau3[1][1].push(1);
                            etatUrlsAvecNiveau3[1][2].push(tempsInitial);
                        }
                        chrome.storage.local.set({ etatUrlsAvecNiveau3: etatUrlsAvecNiveau3 });
                    }
                }, (duree !== 0 ? duree : calculerTempsRestantPourDemainEnMs() / (1000 * 60)) * 60 * 1000);
                longTimeouts.push(timeoutDeblocageNiveau3);
            }
        }

    }

    //récupère la partie importante de l'url
    function getHostname(url) {
        /* //old version
        let matches = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/im);
        return matches && matches[1];
        */
        if (/^localhost/gmi.test(url)) {
            return url;
        }
        return (new URL(url)).hostname.replace(/^www\./ig, '');
    }

    function setIntervalImmediately(func, interval) {
        func();
        return setInterval(func, interval);
    }

    // détecte un changement dans le stockage et met à jour les informations
    chrome.storage.onChanged.addListener(function (changes, areaName) {
        update();
    });

    //mettre à jour les informations sur les listes
    function update() {
        chrome.storage.sync.get(["donneesSeverite", "pausesHebdomadaires", "urlsListeNoire", "urlsListeBlanche", "dernierChangementPauses"], function (donnees) {
            if (typeof donnees.donneesSeverite !== "undefined") {
                donneesSeverite = donnees.donneesSeverite;
            } else { donneesSeverite = [[0, 0, false]]; }

            if (groupesCaches[0].length !== 0) {
                donneesSeverite.push(...groupesCaches[0]);
            }

            if (typeof donnees.dernierChangementPauses !== 'undefined') {
                dernierChangementPauses = donnees.dernierChangementPauses;
            }

            if (typeof donnees.pausesHebdomadaires !== "undefined") {
                pausesHebdomadaires = donnees.pausesHebdomadaires;
            }

            listesUrl = [
                typeof donnees.urlsListeNoire !== "undefined" ? donnees.urlsListeNoire : [[]]
                , typeof donnees.urlsListeBlanche !== "undefined" ? donnees.urlsListeBlanche : [[]]
            ];
            if (groupesCaches[0].length !== 0) {
                for (let listeNoire of groupesCaches[1]) {
                    listesUrl[0].push(listeNoire);
                    listesUrl[1].push([]);
                }
            }

        });
        chrome.storage.sync.get('dateFinOverdrive', function (arg) {
            if (typeof arg.dateFinOverdrive !== 'undefined') {
                if (arg.dateFinOverdrive > Date.now()) {
                    chrome.tabs.query({}, function (tabs) {
                        for (var i = 0; i < tabs.length; i++) {
                            chrome.tabs.remove(tabs[i].id);
                        }
                    });
                }
            }
        });

        // chrome.storage.local.get(["urlsListeNoire", "urlsListeBlanche"], function (donnees) {

        // });

    }

    //retourne l'index d'un site web dans le tableau temps par url s'il est présent dans une liste noire
    function lookForURL(url) {
        //vérifie si une partie spécifique d'un site web est dans une liste noire, si oui, enregistre cette partie spécifique, sinon enregistre tout le site
        if (typeof url !== "undefined") {
            let rechercheur = listesUrl[0].find(x => x.some(y => url.includes(y)));
            let checkedUrl = typeof rechercheur !== "undefined" ? rechercheur.find(y => url.includes(y)) : getHostname(url);
            for (let i = 0; i < tempsParUrl.times.length; i++) {
                if (tempsParUrl.times[i][0] == checkedUrl) {
                    ////tconsole.log('lookforurlResult:', url, checkedUrl);
                    return i;
                }
            }
        }
        return -1;
    }

    function showBytesInUse() {
        chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
            //tconsole.log("SyncBytesInUse : " + bytesInUse);
        });
        chrome.storage.local.getBytesInUse(null, function (bytesInUse) {
            //tconsole.log("LocalBytesInUse : " + bytesInUse);
        });
        chrome.storage.sync.get(null, function (arg) {
            //tconsole.log("Obj in Sync", arg);
        });
        chrome.storage.local.get(null, function (arg) {
            //tconsole.log("Obj in Local", arg);
        });
    }

    //sauvegarde les informations sur le temps par url
    function storeData(url, temps, erreur = false) {

        //tconsole.log('Preparing to store data.........');

        if (urlValide(url)) {

            let rechercheur = listesUrl[0].find(x => x.some(y => url.includes(y)));
            let checkedUrl = typeof rechercheur !== "undefined" ? rechercheur.find(y => url.includes(y)) : getHostname(url);

            let trouve = false;
            for (let i = 0; i < tempsParUrl.times.length && !trouve; i++) {
                if (tempsParUrl.times[i][0] == checkedUrl) {
                    let tempsTraite = ((!isNaN(temps)) ? temps : 0);
                    if (!erreur) {
                        if ((!isNaN(tempsParUrl.times[i][1])) ? tempsParUrl.times[i][1] < tempsTraite : true) {
                            tempsParUrl.times[i][1] = tempsTraite;
                        }
                        //tconsole.log('______storing_sucess..._____');
                    } else {
                        //tconsole.log('____________failed to store data_________ ');
                    }
                    trouve = true;
                }
            }
            if (!trouve) {
                tempsParUrl.times.push([checkedUrl, temps]);
            }
            chrome.storage.local.set(tempsParUrl);
            ajouterATempsParUrlArchive(JSON.parse(JSON.stringify(tempsParUrl.times)));

            showBytesInUse();
        }
    }

});




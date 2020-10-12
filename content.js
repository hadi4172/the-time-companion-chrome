// initialise le timer d'activité sur la page web
TimeMe.initialize({
    currentPageName: "webpage",
    idleTimeoutInSeconds: 80 // secondes
});

disableDistractionByInjection();

var notificationSound = new Audio();
notificationSound.volume = 0.6;

// window.onload = function () {

setTimeout(() => {

    var previousTime = 0;
    var tempsDeBlocageLv3 = -1;
    var titreOriginel = document.title;
    var tabIsAudible = false;

    var niveauDeSeverite = [];   //array de nombres
    var tempsActivationSeverite = []; //array de nombre;
    var informationDebutOuDuree = [];  //array de bool ou d'int
    var entreePhraseDeProductivite = []; //array de bool pertinent pour le niveau 2

    var niveauActive = false;  //est-ce que la sévérité s'est déja activée ?
    var niveau2EstActif = false;  //est-ce que le niveau 2 est présentement actif ?
    var immuniserContreNiveau2 = false;  //l'utilisateur a deja indiqué le temps dont il a besoin donc pas besoin de repop un niveau 2 tant qu'il ne raffraichi pas la page

    var attributsModal = {  //attributs du notificateur
        maxNotifications: 2,
        labels: {
            warning: /*html*/`<span style="font-family:Arial;">${chrome.i18n.getMessage("content_attributmodal_warning")}</span>`,
            alert: /*html*/`<span style="font-family:Arial;">${chrome.i18n.getMessage("content_attributmodal_alert")}</span>`,
            confirm: /*html*/`<span style="font-family:Arial;color: #606c71;">${chrome.i18n.getMessage("content_attributmodal_confirm")}</span>`,
            confirmOk: chrome.i18n.getMessage("content_attributmodal_confirmOk"),
            confirmCancel: chrome.i18n.getMessage("content_attributmodal_confirmCancel")
        },
        durations: {
            warning: 0
        },
        icons: {
            confirm: "exclamation-circle"
        }
    };

    //gestion des textes à entrer pour le niveau 2
    var texteAEntrer = [];
    const nombreDeMessagesAEntrerDisponibles = 20;

    for (let i = 0; i < nombreDeMessagesAEntrerDisponibles; i++) {
        texteAEntrer.push(chrome.i18n.getMessage(`content_texteaentrer_${i + 1}`))
    }

    var notifier = new AWN(attributsModal);

    //met à jour le temps des derniers accès au site web
    function updatePreviousTime() {
        chrome.runtime.sendMessage({ sendMePreviousTimeData: window.location.href }, function (response) {
            //tconsole.log("[PreviousTime]=" + response.responseMessage);
            previousTime = response.responseMessage;
        });
    }

    //demande au background script de lui envoyer les niveaux de sévérités de cette page
    function getDonneesSeverite() {
        niveauDeSeverite = []; tempsActivationSeverite = []; informationDebutOuDuree = []; entreePhraseDeProductivite = [];
        //tconsole.log("Entree 1 dans getDonneesSeverite()");
        chrome.runtime.sendMessage({ sendMeDonneesSeverite: window.location.href }, function (response) {
            //tconsole.log("Entree 2 dans getDonneesSeverite()");
            //tconsole.log("Reponse du background", response.responseMessage);
            for (let i = 0, length = response.responseMessage.length; i < length; i++) {
                niveauDeSeverite.push(response.responseMessage[i][0]);
                tempsActivationSeverite.push(response.responseMessage[i][1]);
                informationDebutOuDuree.push(response.responseMessage[i][2]);
                if (response.responseMessage[i][3] === true) {
                    entreePhraseDeProductivite.push(true);
                } else {
                    entreePhraseDeProductivite.push(false);
                }
            }
            if (immuniserContreNiveau2) {
                retirerNiveaux2();
            }
        });
        chrome.runtime.sendMessage({ sendMeTempsDeBlocageLv3: window.location.href }, function (response) {
            if (response.tempsDeBlocageLv3 !== -1) {
                tempsDeBlocageLv3 = Math.ceil((response.tempsDeBlocageLv3 - Date.now()) / (1000 * 60));
            }
        });
        setTimeout(() => {
            verifierTemps();
        }, 1000);
    }

    updatePreviousTime();
    getDonneesSeverite();


    setIntervalImmediately(() => {
        //tconsole.log(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime);
    }, 1000);


    //active le son sur la page
    chrome.runtime.sendMessage({ mute: 0 });


    // vérifie s'il y a des niveaux de sévérité avec le mode début activé et les lance
    setTimeout(() => {

        for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {

            if (informationDebutOuDuree[i] === true) {
                switch (niveauDeSeverite[i]) {
                    case 1:
                        if (document.querySelector(".awn-toast-warning") == null) {
                            notifier.warning(/*html*/`<span style="font-family:Arial;">${chrome.i18n.getMessage("content_notifier_debut")}</span>`);
                            notificationSound.src = chrome.runtime.getURL('sounds/what-if.mp3');
                            notificationSound.play();
                            chrome.runtime.sendMessage({ immuniser: true }, function (response) {
                            });

                        }
                        break;
                    case 2:
                        notificationSound.src = chrome.runtime.getURL('sounds/unsure.mp3');
                        notificationSound.play();
                        let texteChoisi = randomIntFromInterval(0, texteAEntrer.length - 1);
                        let contenuDeLaBoite2 = /*html*/`<div style="color: #606c71;line-height: 1.5; font-family: Arial;"><p style="text-align: center;">
                        ${chrome.i18n.getMessage("content_notifier_debut")}</p>${entreePhraseDeProductivite[i] ? /*html*/`<p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l2")}<br />
                           <mark class="notranslate" style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; background-color: #ADD08C;">${texteAEntrer[texteChoisi]}</mark></p>
                           <form autocomplete="off"><input class="notranslate" autocomplete="chrome-off" id=entreetexte type="text" style="min-width:97%; margin:10px 0 10px 0;"/></form>`: ""}
                           <div style="margin: 0 auto; width: fit-content;">${chrome.i18n.getMessage("content_notifier_l2_p4")}<select id="timeNeededDropdown" style="max-width:120px; text-align: center;"></select></div></div>`;

                        creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);
                        break;

                    default: break;
                }
            }

        }

    }, 500);


    // vérifie le temps écoulé et lance les niveaux de sévérité
    function verifierTemps() {

        //tconsole.log("niveauDeSeverite:", JSON.stringify(niveauDeSeverite));
        //tconsole.log("tempsActivationSeverite:", JSON.stringify(tempsActivationSeverite));
        //tconsole.log("informationDebutOuDuree:", JSON.stringify(informationDebutOuDuree));

        if (niveauDeSeverite[0] != 0 && niveauActive === false) {
            setIntervalImmediately(() => {
                updateBadge();
                if (!isInactive(TimeMe.getTimeOnPageInMilliseconds("webpage"))) {
                    for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {
                        switch (niveauDeSeverite[i]) {
                            case 1: case 2:
                                if (((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) % (tempsActivationSeverite[i] * 60) < 1)
                                    && (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) > 1) {
                                    traitementSeverite(niveauDeSeverite[i], i);
                                }
                                break;
                            case 3: case 4:
                                if ((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) >= (tempsActivationSeverite[i] * 60)) {
                                    if (tempsDeBlocageLv3 === -1) tempsDeBlocageLv3 = informationDebutOuDuree[i];
                                    traitementSeverite(niveauDeSeverite[i], i);
                                }
                                break;
                            default:
                                break;
                        }
                    }
                }
            }, 1000);

            niveauActive = true;
        }

    }

    for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {
        //tconsole.log(`Niveau[${i}]:` + niveauDeSeverite[i]);
    }

    //gère le lancement des niveaux de sévérité
    function traitementSeverite(niveau, index = -1) {
        //tconsole.log("Entree 1 traitementSeverite(niveau)");
        let tempsEnMinutesArrondi = (Math.round((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) / 60 * 10) / 10);
        switch (niveau) {
            case 1:
                if (document.querySelector(".awn-toast-alert") == null) {
                    notifier.alert(/*html*/`<span style="font-family:Arial;">${chrome.i18n.getMessage("content_notifier_l1_p1")}${tempsEnMinutesArrondi}${chrome.i18n.getMessage("content_notifier_l1_p2")}</span>`);
                    notificationSound.src = chrome.runtime.getURL('sounds/what-if.mp3');
                    notificationSound.play();
                }
                break;

            case 2:
                if (document.querySelector("#awn-popup-wrapper") == null) {

                    notificationSound.src = chrome.runtime.getURL('sounds/unsure.mp3');
                    //tconsole.log('son chargé');
                    notificationSound.play();

                    let texteChoisi = randomIntFromInterval(0, texteAEntrer.length - 1);
                    let contenuDeLaBoite2 = /*html*/`<div style="color: #606c71;line-height: 1.5;font-family: Arial;"><p style="text-align: center;">
                        ${chrome.i18n.getMessage("content_notifier_l2_p1")}<strong>${tempsEnMinutesArrondi}${chrome.i18n.getMessage("content_notifier_l2_p2")}</strong>
                        ${chrome.i18n.getMessage("content_notifier_l2_p3")}</p>${entreePhraseDeProductivite[index] ? /*html*/`<p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l2")}<br />
                    <mark class="notranslate" style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; background-color: #ADD08C;">${texteAEntrer[texteChoisi]}</mark></p>
                    <form autocomplete="off"> <input class="notranslate" autocomplete="chrome-off" id=entreetexte type="text" style="min-width:97%; margin:10px 0 10px 0;"/></form>`: ""}
                    <div style="margin: 0 auto; width: fit-content;">${chrome.i18n.getMessage("content_notifier_l2_p4")}<select id="timeNeededDropdown" style="max-width:120px; text-align: center;"></select></div></div>`;
                    niveau2EstActif = true;
                    creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);
                }

                break;

            case 3:
                if (document.querySelector("#awn-popup-wrapper") == null) {
                    let contenuDeLaBoite3 = `<div style="color: #606c71;line-height: 1.5;font-family: Arial;"><p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l3")}</p>`;
                    let case3box = notifier.confirm(contenuDeLaBoite3, () => { ; }, false, {
                        labels:
                        {
                            confirm:
                                `<span style="font-family:Arial;color: #606c71;">
                                    ${chrome.i18n.getMessage("content_notifier_l3_title")}${tempsDeBlocageLv3 !== 0 ? JSON.stringify(tempsDeBlocageLv3) + chrome.i18n.getMessage("content_notifier_l2_p2") : ` ${chrome.i18n.getMessage("options_onseveriteinput_toutelajournee")}`}
                                    </span>`
                        },
                        icons: { confirm: "exclamation-triangle" }
                    }).newNode;
                    let buttons = case3box.querySelector(".awn-buttons");
                    buttons.parentNode.removeChild(buttons);
                    case3box.style.backdropFilter = "blur(2px)";
                    let s = true;
                    setIntervalImmediately(() => {
                        if (s) {
                            document.title = chrome.i18n.getMessage("content_pageblocked");
                            s = false;
                        } else {
                            document.title = titreOriginel;
                            s = true;
                        }
                    }, 1000 * 2.5);

                    notificationSound.src = chrome.runtime.getURL('sounds/piece-of-cake.mp3');
                    notificationSound.play();
                    chrome.runtime.sendMessage({ lauchThisLevelNow: 3 });
                    chrome.runtime.sendMessage({ gererNiveau3: [informationDebutOuDuree[index], window.location.href, (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) / 60] });
                    previousTime -= 6;
                }
                break;

            case 4:
                //tconsole.log("Entree 1 traitementSeverite(niveau)");
                chrome.runtime.sendMessage({ lauchThisLevelNow: 4 }); break;

            default:

                break;
        }

    }

    //envoie au background script les informations nécéssaires pour mettre à jour le badge de l'extension
    function updateBadge() {
        let severiteLaPlusForte = Math.max(...niveauDeSeverite);
        switch (severiteLaPlusForte) {
            case 1: case 2:
                let secondesEcoules = TimeMe.getTimeOnCurrentPageInSeconds() + previousTime;
                chrome.runtime.sendMessage({ setBadge: [fancyTimeFormat(secondesEcoules), tabIsAudible ? "#d534eb" : "#6BAB2F"] });

                break;
            case 3: case 4:
                let arrayDesIndexDuNiveau = [];
                for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {
                    if (niveauDeSeverite[i] === severiteLaPlusForte) {
                        arrayDesIndexDuNiveau.push(tempsActivationSeverite[i]);
                    }
                }
                let secondesRestantes = ((Math.min(...arrayDesIndexDuNiveau) * 60) - (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime));
                chrome.runtime.sendMessage({ setBadge: [fancyTimeFormat(secondesRestantes > 0 ? secondesRestantes : 0), tabIsAudible ? "#72207d" : "#ed3a2d"] });

                break;
            default:
                break;
        }
    }

    function retirerNiveaux2() {
        for (let i = niveauDeSeverite.length - 1; i >= 0; i--) {  //immuniser tant que l'utilisateur n'a pas raffraichi la page
            if (niveauDeSeverite[i] === 2) {
                niveauDeSeverite.splice(i, 1);
                tempsActivationSeverite.splice(i, 1);
                informationDebutOuDuree.splice(i, 1);
                entreePhraseDeProductivite = [];
            }
        }
    }

    //fonction pour bien afficher le temps à partir d'un nombre de secondes
    function fancyTimeFormat(time) {
        //Original Source: https://stackoverflow.com/a/11486026/7551620

        // Hours, minutes and seconds
        let hrs = ~~(time / 3600);
        let mins = ~~((time % 3600) / 60);
        let secs = ~~time % 60;

        // Output like "1:01" or "4:03:59" or "123:03:59"
        let ret = "";

        if (hrs > 0) {
            ret += "" + hrs + ":" + (mins < 10 ? "0" : "") + mins;
            return ret;
        }

        ret += "" + mins + ":" + (secs < 10 ? "0" : "");
        ret += "" + secs;
        return ret;
    }

    function randomIntFromInterval(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // fonction enveloppante qui lance une fonction une première fois et reste la relancer par intervalle par la suite
    function setIntervalImmediately(func, interval) {
        func();
        return setInterval(func, interval);
    }

    //vérifie si la page est active ou non
    function isInactive(temps) {
        for (let i = 0; i < 10000000; i++) {
            i++;
        }
        return temps == TimeMe.getTimeOnPageInMilliseconds("webpage");
    }

    //crée la boite du niveau 2
    function creerBoxNiveau2(texte, texteChoisi) {
        let body = document.querySelector("body");
        body.style.overflow = "hidden";
        setTimeout(() => {
            chrome.runtime.sendMessage({ mute: 1 });
            TimeMe.setIdleDurationInSeconds(80);
        }, 1500);
        let case2boxInterval = notifier.confirm(texte).newNode;
        let timeNeededDropdown = case2boxInterval.querySelector("#timeNeededDropdown");
        let timeNeededPossibilities = ["1 min", "2 min", "5 min", "10 min", "20 min", "30 min"/*, "45 min", "1h", "1h30", "2h", "3h"*/, chrome.i18n.getMessage("content_notifier_l2_option_idk")];
        let tempsCorrespondant = [1, 2, 5, 10, 20, 30/*, 45, 60, 90, 120, 180*/, false];

        //source : https://stackoverflow.com/a/18194993/7551620
        (function shuffle(obj1, obj2) {
            var index = obj1.length;
            var rnd, tmp1, tmp2;
          
            while (index) {
              rnd = Math.floor(Math.random() * index);
              index -= 1;
              tmp1 = obj1[index];
              tmp2 = obj2[index];
              obj1[index] = obj1[rnd];
              obj2[index] = obj2[rnd];
              obj1[rnd] = tmp1;
              obj2[rnd] = tmp2;
            }
          })(timeNeededPossibilities, tempsCorrespondant);

        for (let i = 0, length = timeNeededPossibilities.length; i < length; i++) {
            timeNeededDropdown.innerHTML += /*html*/`<option>${timeNeededPossibilities[i]}</option>`
        }

        case2boxInterval.style.backdropFilter = "blur(2px)";

        case2boxInterval.querySelector(".awn-btn-success").addEventListener("click", function () {
            //tconsole.log('Cliqué!');

            const continuer = () => {
                if (informationDebutOuDuree.some((x, i) => { return (x == true && niveauDeSeverite[i] === 2); })) {
                    chrome.runtime.sendMessage({ immuniser: true }, function (response) { });
                }

                if (timeNeededDropdown.value !== chrome.i18n.getMessage("content_notifier_l2_option_idk")) {
                    let optionChoisie = tempsCorrespondant[timeNeededDropdown.options.selectedIndex];
                    let valeurLancementNiveau3 = optionChoisie + (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) / 60;
                    niveauDeSeverite.push(3);
                    tempsActivationSeverite.push(valeurLancementNiveau3);
                    informationDebutOuDuree.push((optionChoisie >= 5 ? 5 : 3) + (optionChoisie >= 10 ? 5 : 0) + (optionChoisie >= 20 ? 5 : 0));
                    chrome.runtime.sendMessage({ ajouterAUnGroupeCache: [valeurLancementNiveau3, window.location.href, optionChoisie, Date.now() + (optionChoisie + (informationDebutOuDuree[informationDebutOuDuree.length - 1])) * 60 * 1000] }, function (response) { });
                    immuniserContreNiveau2 = true;
                    retirerNiveaux2();
                }

                chrome.runtime.sendMessage({ mute: 0 });
                if (tabIsAudible) TimeMe.setIdleDurationInSeconds(800000);
                body.style.overflow = "initial";
                niveau2EstActif = false;
                case2boxInterval.parentNode.removeChild(case2boxInterval);
            }

            if (case2boxInterval.querySelector('form[autocomplete="off"]') !== null) {
                if (case2boxInterval.querySelector("#entreetexte").value == texteAEntrer[texteChoisi]) {
                    continuer();
                } else {
                    case2boxInterval.querySelector("#entreetexte").style.boxShadow = "0 0 2px 2px rgba(255, 0, 0, 0.582)";
                }
            } else {
                continuer();
            }

        });

        case2boxInterval.querySelector(".awn-btn-cancel").addEventListener("click", function () {
            //tconsole.log('Cliqué Quitter!');
            niveau2EstActif = false;
            chrome.runtime.sendMessage({ lauchThisLevelNow: 2 });
        });
    }



    //envoie les données du temps au background script avant que la page ne soit fermée
    window.onbeforeunload = function (e) {
        if (typeof chrome.runtime !== 'undefined') {
            document.title = titreOriginel;

            chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime), window.location.href] });
            //tconsole.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");

            if (niveau2EstActif) {
                chrome.runtime.sendMessage({ niveau2EstActif: window.location.href });
            }
        }
        return;
    };

    //envoie les données du temps au background script quand l'utilisateur change de page
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime), window.location.href] });
            TimeMe.stopTimer();
            //tconsole.log("Browser tab is hidden");
            //tconsole.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
        }
        else {
            setTimeout(() => {
                //tconsole.log("Browser tab is now visible");
                if (!document.hidden) {     //reverification apres la seconde passée
                    updatePreviousTime();
                    getDonneesSeverite();
                    TimeMe.resetRecordedPageTime("webpage");
                    TimeMe.startTimer();
                }
            }, 1000);
        }
    });

    window.onfocus = function () {
        //tconsole.log("Browser tab is focused");
        TimeMe.startTimer();
    };
    window.onblur = function () {
        if (!document.hidden) {
            //tconsole.log("Browser tab is unfocused but still visible");
            TimeMe.stopTimer();
            TimeMe.startTimer();
        }
    };

    // gère les ordres du background script
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            if (message.todo == "howMuchTimeElapsed") {  //envoie combien de temps s'est écoulé sur la page
                sendResponse({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime), window.location.href] });
                //tconsole.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            } else if (message.resetYourTime) {  //recommence le temps de cette page
                TimeMe.resetRecordedPageTime("webpage");
                previousTime = 0;
                getDonneesSeverite();
            } else if (message.keepTracking === 1) {  //considère tout le temps passé sur la page comme actif quand du son est en train de jouer
                TimeMe.setIdleDurationInSeconds(800000);
                if (!document.hidden) {
                    TimeMe.stopTimer();
                    TimeMe.startTimer();
                }
                tabIsAudible = true;
            } else if (message.keepTracking === 0) {  //quand le son arrête de jouer, revien à l'état normal
                TimeMe.setIdleDurationInSeconds(80);
                tabIsAudible = false;
            }
        });


});
// };

//injecte du code css qui enlève les distractions si l'utilisateur a coché la case de ce siteweb dans la page d'option
function disableDistractionByInjection() {
    let urlActuelle = window.location.href;
    chrome.storage.sync.get('etatCheckboxesDistraction', function (arg) {
        if (typeof arg.etatCheckboxesDistraction !== 'undefined') {
            let etatCheckboxesDistraction = arg.etatCheckboxesDistraction;

            let injectionParSite = [
                [
                    /.*:\/\/.*.youtube.com\/?.*/, /*css*/`
                        [page-subtype="home"] #primary {
                            display: none !important;
                          }
                          /* Mobile view */
                          body.isHomePage ytm-section-list-renderer>lazy-list {
                            display: none !important;
                          }
                          ytd-guide-renderer ytd-guide-section-renderer:not(:last-child) {
                            display: none !important;
                          }
                          ytd-comments, ytm-comment-section-renderer {
                            display: none !important;
                          }
                          .ytp-endscreen-content, ytd-watch-next-secondary-results-renderer, [data-content-type="related"], .ytp-ce-element.ytp-ce-video, .ytp-ce-element.ytp-ce-playlist {
                            display: none !important;
                          }
                          `],
                [/.*:\/\/.*.twitter.com\/?.*/, /*css*/`
                          .Trends, [aria-label="Timeline: Trending now"], [href="/explore"], [aria-label="Timeline: Explore"] {
                              display: none !important;
                            }
                            .wtf-module, [aria-label="Who to follow"] {
                              display: none !important;
                            }
                            .AdaptiveMedia, [aria-label="Image"], video {
                              display: none !important;
                            }
                            [role='main']#timeline .stream-container, [aria-label="Timeline: Your Home Timeline"] {
                              visibility: hidden !important;
                            }
                            `],
                [/.*:\/\/.*.facebook.com\/?.*/, /*css*/`
                          .home .newsFeedComposer #contentArea, #m_newsfeed_stream, #MComposer, #MStoriesTray, [role="main"] [role="feed"], [data-pagelet="Stories"] {
                              display: none !important;
                            }
                            [aria-label="List of Groups"] ~ div [role="main"] [role="feed"] {
                              display: initial !important;
                            }
                            .commentable_item, .story_body_container + footer, [role="article"] div[data-vc-ignore-dynamic] {
                              display: none !important;
                            }
                            .fbChatSidebar, #BuddylistPagelet, [data-pagelet="ChatTab"], [aria-label="New message"] {
                              display: none !important;
                            }
                            [aria-label="Watch"], #watch_feed, [href*="facebook.com/watch"] {
                              display: none !important;
                            }
                            `],
                [/.*:\/\/.*.reddit.com\/?.*/, /*css*/`
                          .commentarea, .CommentTree, .CommentsPage__tools {
                              display: none !important;
                            }
                            iframe[name*='subreddit":""'] ~ div #siteTable {
                              display: none !important;
                            }
                            .PostsList {
                              display: none !important;
                            }
                            .CommunityHeader ~ .PostsList {
                              display: unset;
                            }
                            a[href='/r/popular/'] {
                              display: none !important;
                            }
                            a[href='/r/all/'] {
                              display: none !important;
                            }
                            `],
                [/.*:\/\/.*.wikipedia.org\/?.*/, /*css*/`
                          a, a:visited, .extiw {
                              pointer-events:none;
                              color : #222222 !important ;
                          }
                          .interlanguage-link-target,
                          .toclevel-1 a, .reference a, .thumbinner a
                          , .reference-text a, .mw-cite-backlink a {
                              pointer-events:auto;
                          }
                          
                            `],
                [/.*:\/\/.*.quora.com\/?.*/, /*css*/`
                          .question_related, .first_content_page_feed{
                            display: none;
                          }
                          .q-box.qu-overflowY--auto .q-box {
                            display: none !important;
                          }
                          .qu-mt--small, .qu-mb--large{
                              display: none;
                          }
                            `],
                [/.*:\/\/.*.linkedin.com\/?.*/, /*css*/`
                          #voyager-feed .core-rail > :not(:nth-child(1)) {
                              visibility: hidden !important;
                            }
                      
                            /*
                            Mobile site
                            Hide all feeds and then show company feed back
                            */
                            .feeds>#feed-container {
                              display: none !important;
                            }
                      
                            .company-page ~ .feeds>#feed-container {
                              display: none !important;
                            }
                            #msg-overlay {
                              display: none !important;
                            }
                            `]
            ];
            for (let i = 0, length = injectionParSite.length; i < length; i++) {
                if (etatCheckboxesDistraction[i] === true) {
                    if (injectionParSite[i][0].test(urlActuelle)) {
                        injectCSS(injectionParSite[i][1]);
                    }
                }
            }

            //désactive le son des niveaux de sévérité
            if (etatCheckboxesDistraction[injectionParSite.length]) {
                notificationSound.volume = 0;
            }

        }
    });

}

function injectCSS(css) {
    let style = document.createElement('style');
    style.setAttribute('id', 'timecompanion-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}


TimeMe.initialize({
    currentPageName: "webpage", // current page
    idleTimeoutInSeconds: 80 // seconds
});

window.onload = function () {

    var notificationSound = new Audio();
    notificationSound.volume = 0.6;

    setTimeout(() => {

        var previousTime = 0;

        var niveauDeSeverite = [];   //array de nombres
        var tempsActivationSeverite = []; //array de nombre;
        var lancerSeveriteDuDebut = [];  //array de bool

        var niveauActive = false;

        var attributsModal = {
            maxNotifications: 2,
            labels: {
                warning: chrome.i18n.getMessage("content_attributmodal_warning"),
                alert: chrome.i18n.getMessage("content_attributmodal_alert"),
                confirm: chrome.i18n.getMessage("content_attributmodal_confirm"),
                confirmOk: chrome.i18n.getMessage("content_attributmodal_confirmOk"),
                confirmCancel: chrome.i18n.getMessage("content_attributmodal_confirmCancel")
            },
            durations: {
                warning: 0
            },
            icons: {
                confirm: "exclamation-circle"
            }
        }

        var texteAEntrer = [];
        const nombreDeMessagesAEntrerDisponibles = 10;

        for (let i = 0; i < nombreDeMessagesAEntrerDisponibles; i++) {
            texteAEntrer.push(chrome.i18n.getMessage(`content_texteaentrer_${i + 1}`))
        }

        var notifier = new AWN(attributsModal);

        function updatePreviousTime() {
            chrome.runtime.sendMessage({ request: "sendMePreviousTimeData" }, function (response) {
                console.log("[PreviousTime]=" + response.responseMessage);
                previousTime = response.responseMessage;
            });
        }

        function getDonneesSeverite() {
            niveauDeSeverite = []; tempsActivationSeverite = []; lancerSeveriteDuDebut = [] ;
            console.log("Entree 1 dans getDonneesSeverite()");
            chrome.runtime.sendMessage({ request: "sendMeDonneesSeverite" }, function (response) {
                console.log("Entree 2 dans getDonneesSeverite()");
                console.log("Reponse du background", response.responseMessage);
                for (let i = 0, length = response.responseMessage.length; i < length; i++) {
                    niveauDeSeverite.push(response.responseMessage[i][0]);
                    tempsActivationSeverite.push(response.responseMessage[i][1]);
                    lancerSeveriteDuDebut.push(response.responseMessage[i][2]);
                }
            });
            setTimeout(() => {
                verifierTemps();
            }, 1000);
        }

        updatePreviousTime();

        getDonneesSeverite();


        // TimeMe.initialize({
        //     currentPageName: "webpage", // current page
        //     idleTimeoutInSeconds: 80 // seconds
        // });

        setIntervalImmediately(() => {
            console.log(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime);
        }, 1000);

        chrome.runtime.sendMessage({ mute: 0 });

        setTimeout(() => {

            for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {

                if (lancerSeveriteDuDebut[i]) {
                    switch (niveauDeSeverite[i]) {
                        case 1:
                            if (document.querySelector(".awn-toast-warning") == null) {
                                notifier.warning(chrome.i18n.getMessage("content_notifier_debut"));
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
                            let contenuDeLaBoite2 = `<div style="color: #606c71;line-height: 1.5;"><p style="text-align: center;">
                        ${chrome.i18n.getMessage("content_notifier_debut")}</p><p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l2")}<br />
                <mark style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;">${texteAEntrer[texteChoisi]}</mark></p>
                <form autocomplete="off"><input autocomplete="new-password" id=entreetexte type="text" style="min-width:97%; margin:10px 0 0 0;"/></form></div>`;

                            creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);
                            break;

                        default: break;
                    }
                }

            }

        }, 500);


        function verifierTemps() {

            console.log("niveauDeSeverite:", JSON.stringify(niveauDeSeverite));
            console.log("tempsActivationSeverite:", JSON.stringify(tempsActivationSeverite));
            console.log("lancerSeveriteDuDebut:", JSON.stringify(lancerSeveriteDuDebut));

            if (niveauDeSeverite[0] != 0 && niveauActive === false) {
                setIntervalImmediately(() => {
                    updateBadge();
                    if (!isInactive(TimeMe.getTimeOnPageInMilliseconds("webpage"))) {
                        for (let i = 0, length = niveauDeSeverite.length; i < length; i++) {
                            switch (niveauDeSeverite[i]) {
                                case 1: case 2:
                                    if (((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) % (tempsActivationSeverite[i] * 60) < 1) && (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) > 1) {
                                        traitementSeverite(niveauDeSeverite[i]);
                                    }
                                    break;
                                case 3: case 4:
                                    if ((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) >= (tempsActivationSeverite[i] * 60)) {
                                        traitementSeverite(niveauDeSeverite[i]);
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
            console.log(`Niveau[${i}]:` + niveauDeSeverite[i]);
        }

        function traitementSeverite(niveau) {
            console.log("Entree 1 traitementSeverite(niveau)");
            let tempsEnMinutesArrondi = (Math.round((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) / 60 * 10) / 10);
            switch (niveau) {
                case 1:
                    if (document.querySelector(".awn-toast-alert") == null) {
                        notifier.alert(`${chrome.i18n.getMessage("content_notifier_l1_p1")}${tempsEnMinutesArrondi}${chrome.i18n.getMessage("content_notifier_l1_p2")}`);
                        notificationSound.src = chrome.runtime.getURL('sounds/what-if.mp3');
                        notificationSound.play();
                    }
                    break;

                case 2:
                    if (document.querySelector("#awn-popup-wrapper") == null) {

                        notificationSound.src = chrome.runtime.getURL('sounds/unsure.mp3');
                        console.log('son chargé');
                        notificationSound.play();

                        let texteChoisi = randomIntFromInterval(0, texteAEntrer.length - 1);
                        let contenuDeLaBoite2 = `<div style="color: #606c71;line-height: 1.5;"><p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l2_p1")}<strong>${tempsEnMinutesArrondi}${chrome.i18n.getMessage("content_notifier_l2_p2")}</strong>${chrome.i18n.getMessage("content_notifier_l2_p3")}</p><p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l2")}<br />
                    <mark style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;">${texteAEntrer[texteChoisi]}</mark></p>
                    <form autocomplete="off"> <input autocomplete="new-password" id=entreetexte type="text" style="min-width:97%; margin:10px 0 0 0;"/></form></div>`;

                        creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);
                    }

                    break;

                case 3:
                    if (document.querySelector("#awn-popup-wrapper") == null) {
                        let contenuDeLaBoite3 = `<div><p style="text-align: center;">${chrome.i18n.getMessage("content_notifier_l3")}</p>`;
                        let case3box = notifier.confirm(contenuDeLaBoite3, () => { ; }, false, { labels: { confirm: chrome.i18n.getMessage("content_notifier_l3_title") }, icons: { confirm: "exclamation-triangle" } }).newNode;
                        let buttons = case3box.querySelector(".awn-buttons");
                        buttons.parentNode.removeChild(buttons);
                        notificationSound.src = chrome.runtime.getURL('sounds/glitch-in-the-matrix.mp3');
                        notificationSound.play();
                        chrome.runtime.sendMessage({ lauchThisLevelNow: 3 });
                    }
                    break;

                case 4: console.log("Entree 1 traitementSeverite(niveau)");
                    chrome.runtime.sendMessage({ lauchThisLevelNow: 4 }); break;

                default:

                    break;
            }

        }

        function updateBadge() {
            let severiteLaPlusForte = Math.max(...niveauDeSeverite);
            switch (severiteLaPlusForte) {
                case 1: case 2:
                    let secondesEcoules = TimeMe.getTimeOnCurrentPageInSeconds() + previousTime;
                    chrome.runtime.sendMessage({ setBadge: [fancyTimeFormat(secondesEcoules),"#6BAB2F"] });

                    break;
                case 3: case 4:
                    let secondesRestantes = ((tempsActivationSeverite[niveauDeSeverite.indexOf(severiteLaPlusForte)] * 60) - (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime));
                    chrome.runtime.sendMessage({ setBadge: [fancyTimeFormat(secondesRestantes > 0 ? secondesRestantes : 0),"#ed3a2d"] });

                    break;
                default:
                    break;
            }
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

        function setIntervalImmediately(func, interval) {
            func();
            return setInterval(func, interval);
        }


        function isInactive(temps) {
            for (let i = 0; i < 10000000; i++) {
                i++;
            }
            return temps == TimeMe.getTimeOnPageInMilliseconds("webpage");
        }

        function creerBoxNiveau2(texte, texteChoisi) {
            let body = document.querySelector("body");
            body.style.overflow = "hidden";
            setTimeout(() => {
                chrome.runtime.sendMessage({ mute: 1 });
            }, 1500);
            let case2boxInterval = notifier.confirm(texte).newNode;

            case2boxInterval.querySelector(".awn-btn-success").addEventListener("click", function () {
                console.log('Cliqué!');
                if (case2boxInterval.querySelector("#entreetexte").value == texteAEntrer[texteChoisi]) {
                    if (lancerSeveriteDuDebut.some((x,i)=>{return (x==true && niveauDeSeverite[i]===2);})) {
                        chrome.runtime.sendMessage({ immuniser: true }, function (response) {
                        });
                    }
                    chrome.runtime.sendMessage({ mute: 0 });
                    body.style.overflow = "initial";
                    case2boxInterval.parentNode.removeChild(case2boxInterval);
                } else {
                    case2boxInterval.querySelector("#entreetexte").style.boxShadow = "0 0 2px 2px rgba(255, 0, 0, 0.582)";
                }
            });

            case2boxInterval.querySelector(".awn-btn-cancel").addEventListener("click", function () {
                console.log('Cliqué Quitter!');
                chrome.runtime.sendMessage({ lauchThisLevelNow: 2 });
            });
        }

        window.onbeforeunload = function (e) {

            if (typeof chrome.runtime !== 'undefined') {
                chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime), window.location.href] });
                console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            }
            return;
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime), window.location.href] });
                console.log("Browser tab is hidden")
                console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            }
            else {
                setTimeout(() => {
                    console.log("Browser tab is now visible")
                    updatePreviousTime();
                    getDonneesSeverite();
                    TimeMe.resetRecordedPageTime("webpage");
                    TimeMe.startTimer();
                }, 1000);
            }
        });

        chrome.runtime.onMessage.addListener(
            function (message, sender, sendResponse) {
                if (message.todo == "howMuchTimeElapsed") {
                    sendResponse({ timeElapsed: TimeMe.getTimeOnCurrentPageInSeconds() + previousTime });
                    console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
                } else if (message.resetYourTime) {
                    TimeMe.resetRecordedPageTime("webpage");
                    TimeMe.startTimer();
                    previousTime = 0;
                } else if (message.keepTracking) {
                    TimeMe.setIdleDurationInSeconds(800000);
                    TimeMe.stopTimer();
                    TimeMe.startTimer();

                    if (message.keepTracking == "false") {
                        TimeMe.setIdleDurationInSeconds(80);
                    }
                }
            });


    });
}


TimeMe.initialize({
    currentPageName: "webpage", // current page
    idleTimeoutInSeconds: 80 // seconds
});

window.onload = function () {

    setTimeout(() => {

        var previousTime = 0;

        var niveauDeSeverite = 0;
        var tempsActivationSeverite = 0;
        var lancerSeveriteDuDebut = false;

        var niveauActive = false;
        var verificationActive = false;

        var attributsModal = {
            maxNotifications: 2,
            labels: {
                warning: "Rappel",
                alert: "Attention!",
                confirm: "Attention!",
                confirmOk: "Continuer",
                confirmCancel: "Quitter"
            },
            durations: {
                warning: 0
            },
            icons: {
                confirm: "exclamation-circle"
            }
        }

        var texteAEntrer = [
            "Je ne dois pas perdre mon temps.",
            "Mon temps est important.",
            "Je suis quelqu'un de productif",
            "Je sais que ce que je fait actuellement est important.",
            "Je dois bien utiliser mon temps pour réussir.",
            "La vie, ce n'est pas seulement s'amuser.",
            "Je suis sur de vouloir continuer.",
            "Pour s'accomplir, il faut arrêter de parler et commencer à faire.",
            "J'ai installé cette extension pour m'améliorer dans ma vie.",
            "J'aime me sentir productif."
        ];

        var notifier = new AWN(attributsModal);

        function updatePreviousTime() {
            chrome.runtime.sendMessage({ request: "sendMePreviousTimeData" }, function (response) {
                console.log("[PreviousTime]=" + response.responseMessage);
                previousTime = response.responseMessage;
            });
        }

        function getDonneesSeverite() {
            console.log("Entree 1 dans getDonneesSeverite()");
            chrome.runtime.sendMessage({ request: "sendMeDonneesSeverite" }, function (response) {
                console.log("Entree 2 dans getDonneesSeverite()");
                console.log("Reponse du background", response.responseMessage);
                niveauDeSeverite = response.responseMessage[0];
                tempsActivationSeverite = response.responseMessage[1];
                lancerSeveriteDuDebut = response.responseMessage[2];
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

            if (lancerSeveriteDuDebut) {
                switch (niveauDeSeverite) {
                    case 1: notifier.warning("Vous venez d'entrer sur un site dans la liste noire."); break;
                    case 2:

                        let texteChoisi = randomIntFromInterval(0, texteAEntrer.length - 1);

                        let contenuDeLaBoite2 = `<div><p>Vous venez d'entrer sur un site dans la liste noire.</p><p style="text-align: center;">Entrez ce texte pour continuer :<br />
                <mark style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;">${texteAEntrer[texteChoisi]}</mark></p>
                <form autocomplete="off"><input autocomplete="new-password" id=entreetexte type="text" style="min-width:97%; margin:10px 0 0 0;"/></form></div>`;

                        creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);
                        break;

                    default: break;
                }
            }
        }, 500);


        function verifierTemps() {
            console.log("niveauDeSeverite:", niveauDeSeverite);
            if (niveauDeSeverite != 0 && niveauActive === false) {
                setIntervalImmediately(() => {
                    updateBadge();
                    if (!isInactive(TimeMe.getTimeOnPageInMilliseconds("webpage"))) {
                        switch (niveauDeSeverite) {
                            case 1: case 2:
                                if (((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) % (tempsActivationSeverite * 60) < 1)&&(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime)>1) {
                                    traitementSeverite(niveauDeSeverite);
                                }
                                break;
                            case 3: case 4:
                                if ((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) >= (tempsActivationSeverite * 60)) {
                                    traitementSeverite(niveauDeSeverite);
                                }
                                break;
                            default:
                                break;
                        }
                    }
                }, 1000);

                niveauActive = true;
            }
        }

        console.log("Niveau:" + niveauDeSeverite);

        function traitementSeverite(niveau) {
            console.log("Entree 1 traitementSeverite(niveau)");
            let tempsEnMinutesArrondi = (Math.round((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) / 60 * 10) / 10);
            switch (niveau) {
                case 1:
                    notifier.alert(`Vous êtes sur ce site depuis ${tempsEnMinutesArrondi} minutes, aujourd'hui.`);
                    break;

                case 2:

                    let texteChoisi = randomIntFromInterval(0, texteAEntrer.length - 1);

                    let contenuDeLaBoite2 = `<div><p>Vous êtes sur ce site depuis <strong>${tempsEnMinutesArrondi} minutes</strong>, aujourd'hui.</p><p style="text-align: center;">Entrez ce texte pour continuer :<br />
                    <mark style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;">${texteAEntrer[texteChoisi]}</mark></p>
                    <form autocomplete="off"> <input autocomplete="new-password" id=entreetexte type="text" style="min-width:97%; margin:10px 0 0 0;"/></form></div>`;

                    creerBoxNiveau2(contenuDeLaBoite2, texteChoisi);

                    break;

                case 3:
                    let contenuDeLaBoite3 = `<div><p style="text-align: center;">Elle sera fermée dans 10 secondes...</p>`;
                    let case3box = notifier.confirm(contenuDeLaBoite3, () => { ; }, false, { labels: { confirm: "Page bloquée pour votre bien" }, icons: { confirm: "exclamation-triangle" } }).newNode;
                    let buttons = case3box.querySelector(".awn-buttons");
                    buttons.parentNode.removeChild(buttons);
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ lauchThisLevelNow: 3 });
                    }, 10000);
                    break;

                case 4: console.log("Entree 1 traitementSeverite(niveau)");
                    chrome.runtime.sendMessage({ lauchThisLevelNow: 4 }); break;

                default:

                    break;
            }

        }

        function updateBadge() {
            switch (niveauDeSeverite) {
                case 1: case 2:
                    let secondesEcoules = TimeMe.getTimeOnCurrentPageInSeconds() + previousTime;
                    chrome.runtime.sendMessage({ setBadge: fancyTimeFormat(secondesEcoules) });

                    break;
                case 3: case 4:
                    let secondesRestantes = ((tempsActivationSeverite * 60) - (TimeMe.getTimeOnCurrentPageInSeconds() + previousTime));
                    chrome.runtime.sendMessage({ setBadge: fancyTimeFormat(secondesRestantes>0?secondesRestantes:0) });

                    break;
                default: 
                    break;
            }
        }

        function fancyTimeFormat(time) {
            //Original Source: https://stackoverflow.com/a/11486026/7551620

            // Hours, minutes and seconds
            var hrs = ~~(time / 3600);
            var mins = ~~((time % 3600) / 60);
            var secs = ~~time % 60;

            // Output like "1:01" or "4:03:59" or "123:03:59"
            var ret = "";

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
            chrome.runtime.sendMessage({ mute: 1 });
            let case2boxInterval = notifier.confirm(texte).newNode;

            case2boxInterval.querySelector(".awn-btn-success").addEventListener("click", function () {
                console.log('Cliqué!');
                if (case2boxInterval.querySelector("#entreetexte").value == texteAEntrer[texteChoisi]) {
                    chrome.runtime.sendMessage({ mute: 0 });
                    body.style.overflow = "initial";
                    case2boxInterval.parentNode.removeChild(case2boxInterval);
                }
            });

            case2boxInterval.querySelector(".awn-btn-cancel").addEventListener("click", function () {
                console.log('Cliqué Quitter!');
                chrome.runtime.sendMessage({ lauchThisLevelNow: 3 });
            });
        }

        window.onbeforeunload = function (e) {

            if (typeof chrome.runtime !== 'undefined') {

                chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime),window.location.href] });
                console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            }
            return;
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                chrome.runtime.sendMessage({ timeElapsed: [(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime),window.location.href] });
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
                }
            });

    });
}


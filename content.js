window.onload = function () {

    setTimeout(() => {

        var previousTime = 0;

        var niveauDeSeverite = 0;
        var tempsActivationSeverite = 0;
        var lancerSeveriteDuDebut = false;

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
                console.log("Reponse du background",response.responseMessage);
                niveauDeSeverite = response.responseMessage[0];
                tempsActivationSeverite = response.responseMessage[1];
                lancerSeveriteDuDebut = response.responseMessage[2];
            });
        }

        updatePreviousTime();

        getDonneesSeverite();


        TimeMe.initialize({
            currentPageName: "webpage", // current page
            idleTimeoutInSeconds: 60 // seconds
        });

        setInterval(() => {
            console.log(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime);
        }, 1000);


        setTimeout(() => {
            verifierTemps();
        },300);

        function verifierTemps(){
            console.log("niveauDeSeverite:",niveauDeSeverite);
            if (niveauDeSeverite != 0) {
                setInterval(() => {
                    if ((TimeMe.getTimeOnCurrentPageInSeconds() + previousTime) >= tempsActivationSeverite * 60) {
                        traitementSeverite(niveauDeSeverite);
                    }
                }, tempsActivationSeverite * 60 * 1000);
            }
        }

        console.log("Niveau:"+niveauDeSeverite);

        function traitementSeverite(niveau) {
            console.log("Entree 1 traitementSeverite(niveau)");
            switch (niveau) {
                case 1:
                    (new AWN()).alert();console.log("Entree 2 traitementSeverite(niveau)");
                    break;

                case 2:

                    break;

                case 3:

                    break;

                case 4: chrome.runtime.sendMessage({ lauchThisLevelNow: 4 }); break;

                default:

                    break;
            }

        }

        window.onbeforeunload = function (e) {

            if (typeof chrome.runtime !== 'undefined') {

                chrome.runtime.sendMessage({ timeElapsed: TimeMe.getTimeOnCurrentPageInSeconds() + previousTime });
                console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            }
            return;
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                chrome.runtime.sendMessage({ timeElapsed: TimeMe.getTimeOnCurrentPageInSeconds() + previousTime });
                console.log("Browser tab is hidden")
                console.log("[VALUE SAVED : " + TimeMe.getTimeOnCurrentPageInSeconds() + " + " + previousTime + "]");
            }
            else {
                setTimeout(() => {
                    console.log("Browser tab is now visible")
                    updatePreviousTime();
                    getDonneesSeverite();
                    verifierTemps();
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


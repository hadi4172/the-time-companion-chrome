window.onload = function () {

    setTimeout(() => {

        var previousTime = 0;

        function updatePreviousTime() {
            chrome.runtime.sendMessage({ request: "sendMePreviousTimeData" }, function (response) {
                console.log("[PreviousTime]=" + response.responseMessage);
                previousTime = response.responseMessage;
            });
        }

        updatePreviousTime();


        TimeMe.initialize({
            currentPageName: "webpage", // current page
            idleTimeoutInSeconds: 60 // seconds
        });

        setInterval(() => {
            console.log(TimeMe.getTimeOnCurrentPageInSeconds() + previousTime);
        }, 1000);

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
                    TimeMe.resetRecordedPageTime("webpage");
                    TimeMe.startTimer();
                },1000);
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


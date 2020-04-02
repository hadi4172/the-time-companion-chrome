window.onload = function () {
    setTimeout(() => {

        TimeMe.initialize({
            currentPageName: "webpage", // current page
            idleTimeoutInSeconds: 60 // seconds
        });
        setInterval(() => {
            console.log(TimeMe.getTimeOnCurrentPageInSeconds());
        }, 1000);

    

    window.onbeforeunload = function (e) {

        if (typeof chrome.runtime !== 'undefined') {

            chrome.runtime.sendMessage({ timeElapsed: TimeMe.getTimeOnCurrentPageInSeconds() }, function (response) {
                // console.log(response.responseMessage);
            });

        }
        return;
    }

    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            if (message.todo == "howMuchTimeElapsed") {
                sendResponse({ timeElapsed: TimeMe.getTimeOnCurrentPageInSeconds() });
            }
        });

    });
}


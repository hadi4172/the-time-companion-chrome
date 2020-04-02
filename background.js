setTimeout(() => {

    TimeMe.initialize({
        currentPageName: "my-home-page", // current page
        idleTimeoutInSeconds: 30 // seconds
    });


var url;

//changement du tab selectionné parmis les tabs ouverts
chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        url = tab.url;
        if (urlValide(url)) {
            // console.log("start by onActivated");
            console.log(url);
            askForTimeSpent();
            // console.log("end by onActivated");
        }
    });
});

//changement à l'intérieur du tab actif (raffraichir ou nouveau lien)
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (tab.active && change.url) {
        url = change.url;
        if (urlValide(url)) {
            // console.log("start by onUpdated");
            console.log(url);
            askForTimeSpent();
            // console.log("end by onUpdated");
        }
    }
});

function urlValide(val) {
    var regexURL = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
    return regexURL.test(val);
}

//detecter le temps qu'a pris un tab avant d'être fermé
chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        // console.log("start by beforeUnload");
        console.log(sender.tab.url);
        console.log(message.timeElapsed);
        // console.log("start by beforeUnload");
        // sendResponse({ responseMessage: "goodbye" });
    });


// setInterval(() => {
//     // console.log(TimeMe.getTimeOnCurrentPageInSeconds());
//     // if (typeof url !== 'undefined') {
//     //     console.log(url);
//     // }
// }, 1000);

function askForTimeSpent() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { todo: "howMuchTimeElapsed" }, function (response) {
            if (typeof response !== 'undefined') {
                console.log(response.timeElapsed);
            }
        });
    });
}

});


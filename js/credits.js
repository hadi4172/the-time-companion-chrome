window.onload = () => {


    document.title = chrome.i18n.getMessage("credits_titre");
    document.querySelector("#title").innerHTML = chrome.i18n.getMessage("credits_titre");
    document.querySelector("#legdonateurs").innerHTML = chrome.i18n.getMessage("credits_donateurs");
    document.querySelector("#mercidons").innerHTML = chrome.i18n.getMessage("credits_mercidons");
    document.querySelector("#ajoutezvotrenomici").innerHTML = chrome.i18n.getMessage("credits_ajoutezvotrenomici");
    document.querySelector("#legcode").innerHTML = chrome.i18n.getMessage("credits_code");
    document.querySelector("#mercicode").innerHTML = chrome.i18n.getMessage("credits_mercicode");
    document.querySelector("#legother").innerHTML = chrome.i18n.getMessage("credits_autre");
    document.querySelector("#merciautre").innerHTML = chrome.i18n.getMessage("credits_merciautre");
    document.querySelector("#return").innerHTML = chrome.i18n.getMessage("setlist_retour_btn");







}
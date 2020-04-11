window.onload = () => {

    var attributsModal = {
        labels: {
            warning: "Rappel",
            alert: "Attention!",
            confirm: "Attention!",
            confirmOk: "Continuer",
        },
        durations: {
            warning: 0
        },
        icons: {
            confirm: "exclamation-circle"
        }
    }
    

    let notifier = new AWN(attributsModal);
    let confirm = notifier.confirm(`<div><p>Vous êtes sur ce site depuis <strong>5 minutes</strong>, aujourd'hui.</p><p style="text-align: center;">Entrez ce texte pour continuer :<br />
    <mark style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;">Je ne dois pas perdre mon temps.</mark></p>
    <input id=entreetexte type="text" style="min-width:97%; margin:10px 0 0 0;"/></div>`).newNode;

    confirm.querySelector(".awn-buttons").addEventListener("click", function () {
        console.log('Cliqué!');
        if (confirm.querySelector("#entreetexte").value == "Je ne dois pas perdre mon temps.") {
            confirm.parentNode.removeChild(confirm);
        }
    });

    // confirm.newNode.addEventListener("click", function (event) { event.stopPropagation(); }, true);
    console.log(confirm);
    console.log(notifier);
    console.log(document.querySelector("#haha"));

    // (new Promise((resolve) => { resolve(notifier.confirm()) })).then(x => x.addEventListener("click", function (event) { event.stopPropagation();}, true))


    // setTimeout(() => {
    //     notifier.confirm();
    // }, 1000);

    // setTimeout(() => {
    //     console.log('typeof notifier.confirm():', typeof confirm);
    // }, 500);

}

// console.log('getEventListeners(notifier):',getEventListeners(notifier));

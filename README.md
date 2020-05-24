# Time Companion

## Description du projet

### L'idée

Le but de ce projet est de développer une application tournant sur Google Chrome (Extension) qui aura pour but d’empêcher son utilisateur de perdre de vue son travail par des envies mensongères ou une inadvertance. Cela sera fait par la mise en place de divers modes de rappels à l’ordre, allant d’une petite notification sur le bas de la page jusqu’à la fermeture radicale de l’écran du navigateur.

### L'utilité et l'innovation

L’utilité de notre extension repose dans le fait que celui qui gère bien son temps atteint la réussite. Par sa mise en place, les utilisateurs étourdis auront de meilleurs moyens de prendre leur vie en main. Il existe déjà de nombreuses applications gratuites ou payantes favorisant la productivité. Nous pouvons nommer par exemple Cold Turkey, Stop Autopilot, StayFocusd, Freedom, Mindful Anti Distractions ect… Malheureusement, chacune de ces applications manque énormément d’adaptation face à son utilisateur / manque de fonctionnalités indispensables. Les ayant toutes testées, la seule solution qu’il restait était de développer son propre programme. Par ses idées et fonctionnalités jusque-là sans précédent dans tout l’internet, nous croyons que « The Time Companion » sera un concept tout à fait innovateur chez le grand public.

### Lien avec d'autres matières

Notre extension a des liens très étroits avec de nombreuses matières offertes au cegep de Bois-de-Boulogne. Si nous écartons les cours de programmation (logique). Nous pouvons mettre en évidence les cours de Psychologie et santé mentale (350-BBQ-BB), Cyberespace et psychologie (350-BAQ-BB), Philosophie 101 et 102, Réussite et cheminement personnel (350-082-BB).
Ces cours abordent les divers types de dépendances, les troubles de personnalités, les réactions face au stress, les comportements autodestructeurs, et la bonne gestion du temps. Chacun de ces concepts est au cœur de l’idée composant notre programme puisque celui-ci vise à surmonter ses problèmes de perte de temps/manque de concentration/ addiction à internet/ manque de prévision. Ayant suivi la plupart de ces cours, nous pourrons mettre en pratique les informations apprises et de ce fait, optimiser notre programme.

### A qui ça s’adresse ? 

Nous croyons que notre extension seras bénéfique à tout le monde. Dans le sens ou chaque personne se verrait augmenter sa productivité avec. Cependant, les fonctionnalités les plus importantes visent surtout les personnes atteintes du syndrome de procrastination chronique (comme nous!) et ceux ayant des troubles de concentration.

## Technologies

### Bâti avec

* [HTML5 & CSS3](https://www.w3.org/) - Langage de balisage hypertexte et feuilles de styles
* [JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript) - Langage de programmation principalement employé dans les pages web interactives
* [API Chrome](https://developer.chrome.com/extensions/devguide) - Interface de programmation applicative pour le développement des extensions Chrome
* [Chart.js](https://www.chartjs.org/) - Librairie Javascript pour la création de graphiques
* [TimeMe.js](https://jasonzissman.github.io/time-me-demo/) - Librairie Javascript pour mesurer le temps actif
* [AWN.js](https://f3oall.github.io/awesome-notifications/) - Librairie Javascript pour la création de popups/notifications

### Outils de développement

* [Visual Studio Code](https://code.visualstudio.com/) - Éditeur de code
* [Git](https://git-scm.com/) - Logiciel de gestion de versions décentralisé
* [Github](https://github.com/) - Service d'hébergement web pour Git
* [Powerpoint](https://office.live.com/start/powerpoint.aspx) - Logiciel de présentation utilisé pour créer les plans visuels de l'extension

### Approche

L'extension sera composée principalement d'un script d'arrière plan (background script) et d'un script de contenu (content script). Une fois l'extension installée, l'utilisateur est redirigé vers la page d'option (option page) ou il pourra configurer les paramètres du programme, comme ajouter des groupes, ajouter des sites aux listes noires et blanches, choisir le niveau de sévérité adéquat et retirer le code sources distrayant de certaines pages web. Une fois ces informations entrées, elles seront envoyés au script d'arrière plan qui va se charger de les envoyer au script de contenu quand une nouvelle page web sera détectée. Ce dernier se chargera de lancer les données de sévérité quand l'utilisateur dépasse le temps permis sur une page présente dans une liste noire.

## Auteur

* Hadi Yahia - [hadi4172](https://github.com/hadi4172)

## Licence

Ce projet est distribué sous la licence GNU General Public License v3.0 - voir le fichier [LICENSE](LICENSE) pour plus de détails

## TODO 
* Faire une video de promotion
* Ajouter possibilité de ne pas jouer de son lors des notif

// var multidim=[["hadi",211111111],["yahia",4],["java",5]];

// chrome.storage.sync.set({testing:multidim});
// console.log("Saved success!");

// chrome.storage.sync.get("testing", function (arg) {
//     console.log(arg["testing"]);
// });

// chrome.storage.sync.remove("testing");

chrome.storage.sync.getBytesInUse(null, function(bytesInUse){
    console.log("SyncBytesInUse : "+bytesInUse);
});

var array = [["gsdvdv","avasvsa"], ["4bfs","sav"], ["#bs","csa"]];
for (let i = 0, length = array.length; i < length; i++) {
    if (array[i][0]=="4bfs") {
        array[i][0] = "hahahha";
    }
}
console.log(array);


// console.log(array.indexOf("h456"));
"use strict";

    // Get a file as a string using  AJAX
    function loadFileAJAX(name) {
        var xhr = new XMLHttpRequest(),
        okStatus = document.location.protocol === "file:" ? 0 : 200;
        xhr.open('GET', name, false);
        xhr.send(null);
        return xhr.status == okStatus ? xhr.responseText : null;
    };


    
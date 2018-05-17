// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const DESKTOP_MEDIA = ['screen', 'window', 'tab', 'audio'];

var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

var pending_request_id = null;
var pc1 = null;
var pc2 = null;
console.log(io);
var socket = io.connect('', { port: 3000 })

// Launch the chooseDesktopMedia().
document.querySelector('#start').addEventListener('click', function (event) {
    pending_request_id = chrome.desktopCapture.chooseDesktopMedia(
        DESKTOP_MEDIA, onAccessApproved);

});

document.querySelector('#cancel').addEventListener('click', function (event) {
    if (pending_request_id != null) {
        chrome.desktopCapture.cancelChooseDesktopMedia(pending_request_id);
    }
});

document.querySelector('#startFromBackgroundPage')
    .addEventListener('click', function (event) {
        chrome.runtime.sendMessage(
            {}, function (response) { console.log(response.farewell); });
    });

// Launch webkitGetUserMedia() based on selected media id.
function onAccessApproved(id, options) {
    if (!id) {
        console.log('Access rejected.');
        return;
    }

    var audioConstraint = {
        mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: id
        }
    };

    console.log(options.canRequestAudioTrack);
    if (!options.canRequestAudioTrack)
        audioConstraint = false;

    navigator.webkitGetUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop', //mediaSource: "screen", mozilla
                chromeMediaSourceId: id,
                maxWidth: screen.width,
                maxHeight: screen.height
            }
        }
    }, gotStream, getUserMediaError);

    navigator.getUserMedia = navigator.getUserMedia
        || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia
        || navigator.msGetUserMedia;

    navigator.getUserMedia({
        audio: true,
        video: {
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 1280,
            maxHeight: 720
        }
    },
        function (stream) {
            var video = document.querySelector('#remoteVideo');
            video.srcObject = stream;
            video.onloadedmetadata = function (e) {
                video.play();
            };
        },
        function (err) {
            console.log("The following error occurred: " + err.name);
        });
}

function getUserMediaError(error) {
    console.dir(error); //'navigator.webkitGetUserMedia() erro: ',
}

// Capture video/audio of media and initialize RTC communication.
function gotStream(stream) {
    console.log('Received local stream', stream);
    var video = document.querySelector('video');
    try {
        video.srcObject = stream;
    } catch (error) {
        video.src = URL.createObjectURL(stream);
    }
    stream.onended = function () { console.log('Ended'); };

    pc1 = new RTCPeerConnection();
    pc1.onicecandidate = function (event) {
        onIceCandidate(pc1, event);
    };

    pc1.oniceconnectionstatechange = function (event) {
        onIceStateChange(pc1, event);
    };

    pc1.addStream(stream);

    console.log(pc1);

    // pc1.createOffer(onCreateOfferSuccess, function () { });
}

function onCreateOfferSuccess(desc) {
    // pc1.setLocalDescription(desc);
    // pc2.setRemoteDescription(desc);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    var sdpConstraints = {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
    };
    pc2.createAnswer(onCreateAnswerSuccess, function () { }, sdpConstraints);
}

function gotRemoteStream(event) {
    // Call the polyfill wrapper to attach the media stream to this element.
    console.log('hitting this code');
    try {
        remoteVideo.srcObject = event.stream;
    } catch (error) {
        remoteVideo.src = URL.createObjectURL(event.stream);
    }
}

function onCreateAnswerSuccess(desc) {
    pc2.setLocalDescription(desc);
    pc1.setRemoteDescription(desc);
}

function onIceCandidate(pc, event) {
    if (event.candidate) {
        var remotePC = (pc === pc1) ? pc2 : pc1;
        remotePC.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
}

function onIceStateChange(pc, event) {
    if (pc) {
        console.log('ICE state change event: ', event);
    }
}


function sendMessage(message) {
    socket.emit('message', message);
}

socket.on('message', function (message) {
    if (message.type === 'offer') {
        pc.setRemoteDescription(new SessionDescription(message));
        createAnswer();
    }
    else if (message.type === 'answer') {
        pc.setRemoteDescription(new SessionDescription(message));
    }
    else if (message.type === 'candidate') {
        var candidate = new IceCandidate({ sdpMLineIndex: message.label, candidate: message.candidate });
        pc.addIceCandidate(candidate);
    }
});


// Step 2. createOffer
function createOffer() {
    pc.createOffer(
        gotLocalDescription,
        function (error) { console.log(error) },
        { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } }
    );
}


// Step 3. createAnswer
function createAnswer() {
    pc.createAnswer(
        gotLocalDescription,
        function (error) { console.log(error) },
        { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } }
    );
}


function gotLocalDescription(description) {
    pc.setLocalDescription(description);
    sendMessage(description);
}

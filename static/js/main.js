//settings starter
let APP_ID = "464ecf97c46c4414923c7c66c0deb2f7";
var enable = false;
let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

// Function to get Room ID from URL
let getRoomIdFromURL = () => {
  let queryString = window.location.search;
  let urlParams = new URLSearchParams(queryString);
  return urlParams.get("room");
};
// Function to redirect to lobby page if Room ID is not valid
let redirectToLobby = () => {
  window.location = "template/lobby.html";
};

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

const constraints = {
  audio: {
    noiseSuppression: true,
    echoCancellation: true,
  },
  video: true,
};
let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token: null });
  roomId = getRoomIdFromURL();
  if (!roomId) {
    redirectToLobby();
    return;
  }
 
  channel = client.createChannel(roomId);
  await channel.join();

  channel.on("MemberJoined", handleUserJoined);
  channel.on("MemberLeft", handleUserLeft);
  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log("Local stream obtained:", localStream);

  document.getElementById("user-1").srcObject = localStream;
};
// Apply audio processing to the local stream
let applyAudioProcessing = (stream) => {
  let audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0) {
    let audioTrack = audioTracks[0];

    // Apply noise suppression and echo cancellation
    let audioProcessingConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
    };

    audioTrack
      .applyConstraints(audioProcessingConstraints)
      .then(() => {
        console.log("Applied audio processing constraints");
      })
      .catch((error) => {
        console.error("Error applying audio processing constraints:", error);
      });
  }
};

let handleUserLeft = (MemberId) => {
  document.getElementById("user-2").style.display = "none";
  document.getElementById("user-1").classList.remove("smallFrame");
};

let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);

  if (message.type === "offer") {
    createAnswer(MemberId, message.offer);
  }

  if (message.type === "answer") {
    addAnswer(message.answer);
  }

  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

let handleUserJoined = async (MemberId) => {
  createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";

  document.getElementById("user-1").classList.add("smallFrame");

  if (!localStream) {
    // localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        MemberId
      );
    }
  };
};

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    MemberId
  );
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId
  );
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");

  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    console.log("un enabled");
    document.getElementById("centering").style.display = "block";
    document.getElementsByClassName("fa-video-slash")[0].style.display="block";
    document.getElementsByClassName("fa-video")[0].style.display="none";
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 80, 80)"; //red
  } else {
    console.log(" enabled");
    videoTrack.enabled = true;
    document.getElementById("centering").style.display = "none";
    document.getElementsByClassName("fa-video-slash")[0].style.display="none";
    document.getElementsByClassName("fa-video")[0].style.display="block";
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};

let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");

  if (audioTrack.enabled) {
    audioTrack.enabled = false;
    enable = false;
    console.log("disable");
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
      document.getElementsByClassName("fa-microphone-slash")[0].style.display="block";
      document.getElementsByClassName("fa-microphone")[0].style.display="none";
      
  } else {
    console.log("enble");
    enable = true;
    audioTrack.enabled = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
      document.getElementsByClassName("fa-microphone-slash")[0].style.display="none";
      document.getElementsByClassName("fa-microphone")[0].style.display="block";
  }
};

let setn = document.getElementById("setting");
let setting = async () => {
  console.log("from setting");
  if (setn.style.display == "block") {
    setn.style.display = "none";
    document.getElementById("setting-btn").style.backgroundColor = "#a15ce1";
  } else {
    document.getElementById("setting-btn").style.backgroundColor = "#ff5050";
    setn.style.display = "block";
  }
};

document.getElementById("setting-btn").addEventListener("click", setting);

window.addEventListener("beforeunload", leaveChannel);

document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
window.onload = function () {
  console.log("hi from on load");
  init();
};

document.getElementById("share-btn").onclick = () => {
  console.log("from share screen")
  screenSharingStream = AgoraRTC.createStream({
    screen: true,
    audio: false,
    video: false,
  });

  screenSharingStream.init(() => {
    screenSharingStream.on("stopScreenSharing", () => {
      // Handle when screen sharing stops
    });

    screenSharingStream.play("screen-share-video"); // Display screen share in a video element
    client.publish(screenSharingStream);
  });
};
// ????????????????????????????????
function hide() {
  document.getElementById("result-div").style.display = "none";
  document.getElementById("setting").style.display = "none";
  // clearInterval(interv);
  // fetch("/stop-loop", { method: "POST" });
  socket.emit("stop_transcription");
  console.log("from stop button");
  document.getElementById("setting-btn").style.backgroundColor = "#a15ce1";
}

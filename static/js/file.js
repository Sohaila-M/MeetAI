
  
  let localStream;
  
  let init = async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Local stream obtained:", localStream);
  
      // Display local stream
      displayLocalStream(localStream);
  
      // Create Peer Connection with the local stream
      createPeerConnection();
  
    } catch (error) {
      console.error("Error accessing local media stream:", error);
      // Handle error
    }
  };
  
  // Function to get local media stream with constraints
  let getLocalMediaStream = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error("Error accessing local media stream:", error);
      throw error;
    }
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
  
      audioTrack.applyConstraints(audioProcessingConstraints)
        .then(() => {
          console.log("Applied audio processing constraints");
        })
        .catch((error) => {
          console.error("Error applying audio processing constraints:", error);
        });
    }
  };
  
  // Function to display local stream in UI
  let displayLocalStream = (stream) => {
    // Display local video stream in UI
  };
  
  // Create Peer Connection with the local stream
  let createPeerConnection = () => {
    // Create Peer Connection and add local stream
  };
  
  // Call init function on window load
  window.onload = init;
  

  // Screen sharing
let screenSharingStream;

document.getElementById("share-btn").onclick = () => {
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

document.getElementById("stop-share").onclick = () => {
  if (screenSharingStream) {
    screenSharingStream.stop();
  }
};

function recognizeSpeech() {
  document.getElementById("result").innerHTML = "";
  display();
  socket.connect();
  console.log("caption click");
  console.log("enable = " + enable);
  if (enable) {
      // Start capturing audio from the user's microphone
      navigator.mediaDevices.getUserMedia({ audio: true })
          .then(function(stream) {
              // Emit the "start_captioning" event along with the captured audio stream
              socket.emit("start_captioning", { audioStream: stream });

              // Listen for caption updates from the server
              socket.on("caption_update", function(data) {
                  console.log("from start caption", data.caption);
                  document.getElementById("result").innerText = data.caption;
              });
          })
          .catch(function(error) {
              console.error("Error capturing audio:", error);
          });
  }
}

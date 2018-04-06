var u, b, v, r, l;
var constraints = {
	video: true/*{
		 width: 160,
		 height: 120,
		 frameRate: 1,
		 aspectRatio: 4/3
	}*/,
	audio: true
};
var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.l.google.com:19302'},
    //{'urls': 'turn:185.22.235.182:3478', 'credential': 'teledom', 'username': 'teledom'}
  ]
};

var pageReady = () => {
	u = createUUID();
	
	b = document.getElementById('start');
	v = document.getElementById('localVideo');
	r = document.getElementById('remoteVideo');

	if ( navigator.mediaDevices.getUserMedia ) {
	  navigator.mediaDevices.getUserMedia(constraints)
	  .then(stream => (l = stream, v.srcObject = stream))
	  .catch(log);
	} else {
	  log('Your browser does not support getUserMedia API');
	}
};


var newPeer = () => {
	var pc = new RTCPeerConnection(peerConnectionConfig);

	pc.ondatachannel = e => e.channel.onclose = stop;
	pc.ontrack = e => r.srcObject = e.streams[0];
	pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);
	pc.onicecandidate = e => sc.emit("candidate", { ice: e.candidate, uuid: u });
	
	return pc;
};

var pc = null;

function send() {
	pc = newPeer();
	pc.addStream(l);
	/*var pc = new RTCPeerConnection(peerConnectionConfig);
	pc.onDataChannel = handle_new;
	pc.ontrack = e => r.srcObject = e.streams[0];
	pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);
	pc.onicecandidate = e => sc.emit("candidate", { ice: e.candidate, uuid: u });
	
	var dataChannel = pc.createDataChannel("skipodev",{ reliable: true });
	
	console.log('dataChannel', dataChannel);
	handle_new(dataChannel);*/
}

function handle_new(channel) {
	channel.onmessage = function(evt) {
		if (evt.data instanceof Blob) {
			console.log("I received a blob");
			// assign data to an image, save in a file, etc
		} else {
			console.log("I got a message: " + evt.data);
		}
	};

	channel.onopen = function() {
		// We can now send, like WebSockets
		channel.send("The channel is open!");
		console.log('The channel is open!');
	};

	channel.onclose = function() {
		console.log("pc1 onclose fired");
	};
};

function start(e) {
	if ( b.value.indexOf("Start Call") != -1 ) {
		b.value = "Hangup";
	} else {
		sc.emit("hangup", {uuid: u});
		stop();
		return;
	}

	pc = newPeer();
	pc.addStream(l);

	if ( e ) {
		pc.createDataChannel("close").onclose = stop;
		pc.createOffer().then(offer => {
			pc.setLocalDescription(offer).then(() => {
				sc.emit("offer", { sdp: pc.localDescription, uuid: u });
			}).catch(log);
		}).catch(log);
	}

};

var stop = e => {
	b.value = "Start Call";
	r.srcObject = null;
	if ( pc != null) {
		pc.close();
		pc = null;
	}
};

var sc = io('https://skipodev.ru:8011');

var sdpHandler = msg => pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).then(() => {
	if (msg.sdp.type == "offer") {
		pc.createAnswer().then(answer => {
			pc.setLocalDescription(answer).then(() => {
				sc.emit("answer", { sdp: pc.localDescription, uuid: u })
			}).catch(log);
		}).catch(log);
	}
}).catch(log);

sc.on("offer", msg => {
	if (pc == null) {
		start(false);
	};
	sdpHandler(msg);
});
sc.on("answer", msg => sdpHandler(msg));
sc.on("candidate", msg => msg.ice && pc.addIceCandidate(new RTCIceCandidate(msg.ice)).catch(log));
sc.on("hangup", msg => stop());


// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}



var log = msg => console.log(msg);//div.innerHTML += "<br>" + msg;


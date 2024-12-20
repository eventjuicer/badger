const GStreamer = require('gstreamer-superficial');
const jsQR = require('jsqr');

// Adjust width/height/framerate to your needs
const width = 640;
const height = 480;
const framerate = 15;

// GStreamer pipeline string
// This pipeline reads from the webcam, converts to RGB, and sends frames to appsink.
const pipelineStr = `v4l2src device=/dev/video0 ! videoconvert ! video/x-raw,format=RGB,width=${width},height=${height},framerate=${framerate}/1 ! appsink name=appsink0`;

const pipeline = new GStreamer.Pipeline(pipelineStr);
const appsink = pipeline.findChild('appsink0');


function onData(buf, caps) {
	if (caps) {
		console.log('CAPS', caps);
	}
	if (buf) {

        if (buf.length !== width * height * 3) {
            console.error("Unexpected frame size");
            return;
        }

        const rgbaBuffer = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          rgbaBuffer[i * 4] = buf[i * 3];         // R
          rgbaBuffer[i * 4 + 1] = buf[i * 3 + 1]; // G
          rgbaBuffer[i * 4 + 2] = buf[i * 3 + 2]; // B
          rgbaBuffer[i * 4 + 3] = 255;               // A
        }

         // Run jsQR on RGBA data
        const code = jsQR(new Uint8ClampedArray(rgbaBuffer), width, height);

         
  if (code) {
    console.log("QR code detected:", code.data);
  } else {
    // If needed, comment this line out to reduce console spam
    // console.log("No QR code found in this frame.");
  }

		console.log('BUFFER size', buf.length);
		appsink.pull(onData);
	}

	// !buf probably means EOS
}

appsink.pull(onData);


// Start the pipeline
pipeline.play();

console.log("Capturing video, press Ctrl+C to stop.");

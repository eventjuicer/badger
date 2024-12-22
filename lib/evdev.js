const Evdev = require('evdev');

const device = new Evdev('/dev/input/event2'); // change to your scanner event device

device.on('EV_KEY', (data) => {
  if (data.value === 1) { // value=1 => key pressed
    console.log(`Key code = ${data.code}`);
    // you’d map the key codes to actual characters or interpret them as needed
  }
});
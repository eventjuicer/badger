const Evdev = require('evdev');



var reader = new Evdev();
reader.search("/dev/input/by-path","event-kbd",function(err){
  //Err should be null.
console.log(err)
});



const device = new Evdev('/dev/input/event7'); // change to your scanner event device




device.on('EV_KEY', (data) => {

 console.log(`Key code = ${data.code}`);
console.log('Key event:', data.code, data.value);

  if (data.value === 1) { // value=1 => key pressed
    console.log(`Key code = ${data.code}`);
    // you’d map the key codes to actual characters or interpret them as needed
  }
});


device.on("error", (error)=>{

console.log(error);
});

device.on("close", (data)=>{

console.log(data);
});

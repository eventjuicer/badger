
const EvdevReader = require("evdev");

//var device_streams = new read_device({devices:["/dev/input/by-path/pci-0000:45:00.0-usb-0:1:1.0-event-joystick"]});
const reader = new EvdevReader();


const target_match = "event-kbd"

reader.on("EV_KEY",function(data){
  console.log("key : ",data.code,data.value);
}).on("EV_ABS",function(data){
  console.log("Absolute axis : ",data.code,data.value);
}).on("EV_REL",function(data){
  console.log("Relative axis : ",data.code,data.value);
}).on("error",function(e){
  console.log("reader error : ",e);
})


function prettyPrint(ar){
  return `[\n\t${ar.join(",\n\t")}\n]`
}

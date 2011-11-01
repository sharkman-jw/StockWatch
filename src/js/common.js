
function compareFloat(val1, val2) {
  if (Math.abs(val1 - val2) < 0.00001)
    return 0;
  else if (val1 > val2)
    return 1;
  return -1;
}



//------------------------------------------------------------------------------
// Debug & Test
//------------------------------------------------------------------------------
var debugmode = true;
//
function track(stuff, color) {
  if (!debugmode)
    return;
  var node = document.createElement('p');
  if (color) {
    node.setAttribute('style', 'color:' + color);
  }
  var textNode = document.createTextNode(">> " + stuff + "\n");
  node.appendChild(textNode);
  jQuery("#debug_area").prepend(node);
  //jQuery("#debug_area").append(node);
}
//
function trackObj(obj, color) {
  track(JSON.stringify(obj), color);
}
//
function clearDebugPanel() {
  jQuery("#debug_area").empty();
}
//
function log(stuff) {
  if (debugmode)
    console.log(stuff);
}

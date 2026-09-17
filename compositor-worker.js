// Netfie Screen Recorder - Compositor Timer Worker
let timer = null;
self.onmessage = function(e) {
  if (e.data === 'start') {
    if (!timer) {
      timer = setInterval(function() {
        postMessage('tick');
      }, 16);
    }
  } else if (e.data === 'stop') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;
// will include other octives in v2
var noteData = [

  {"note":"C", "frequency":523.25},
  {"note":"C#", "frequency":554.37},
  {"note":"D","frequency":587.33},
  {"note":"D#","frequency":622.26},
  {"note":"E","frequency":659.26},
  {"note":"F","frequency":698.46},
  {"note":"F#","frequency":739.99},
  {"note":"G","frequency":783.99},
  {"note":"G#","frequency":830.61},
  {"note":"A","frequency":880},  
  {"note":"A#","frequency":932.33},
  {"note":"B","frequency":987.77}

];  

var width = 960,
    height = 600,
    τ = 2 * Math.PI; 

// An arc function with all values bound except the endAngle. So, to compute an
// SVG path string for a given angle, we pass an object with an endAngle
// property to the `arc` function, and it will return the corresponding string.

var arc = d3.svg.arc()
    .innerRadius(190) 
    .outerRadius(240)
    .startAngle(360);

// Create the SVG container, and apply a transform such that the origin is the
// center of the canvas. This way, we don't need to position arcs individually.
var svg = d3.select("body").append("svg")
    .attr('class', 'circle')
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var background = svg.append("path")
    .datum({endAngle: 100})
    .style("fill", "#ddd")
    .attr("d", arc);

// Add the foreground arc in orange, currently showing 12.7%.
var foreground = svg.append("path")
    .datum({endAngle: .1 * τ})
    .style("fill", "white")
    .attr("d", arc);

var gaugeGroup = svg.append("g")
    .datum({endAngle: .1 * τ})
    .attr("class", "hour hands")
    .attr("transform", "translate( 0 , 0 )");

var groupGauge = gaugeGroup.append("g")
    .datum({endAngle: .1 * τ})
    .attr("class", "hour hands")
    .attr("transform", "translate( 0 , 0 )");

var frequencyScale = d3.scale.linear()
    .domain([ noteData[0].frequency,noteData[noteData.length-1].frequency ])
    .range([0,320]);

var clockRadius = 200;
var hourLabelRadius = clockRadius - 40;
var hourLabelYOffset = 7;
var radians = 0.0174532925 * Math.PI;

svg.selectAll('noteLetters')
  .data(noteData).enter()
    .append('text')
    .attr('class', 'noteLetters')
    .attr('x1',0)
    .attr('x2',0)
    .attr('y1',190)
    .attr('y2', 240)
    .attr('x',function(d){
      return hourLabelRadius*Math.sin( frequencyScale( d.frequency ) * 0.0175  )*1.7 - 10;
    })
    .attr('y',function(d){
      return -hourLabelRadius*Math.cos( frequencyScale ( d.frequency ) * 0.0175 )*1.7 + 1;
    })
    .text(function(d){
      return d.note;
    });


svg.selectAll('noteTick')
  .data(noteData).enter()
    .append('line')
    .attr('class', 'noteTick')
    .attr('x1',0)
    .attr('x2',0)
    .attr('y1',190)
    .attr('y2', 240)
    .attr('transform',function(d){
      return 'rotate(' + (frequencyScale(d.frequency) +180 ) + ')';
    });


var hour = gaugeGroup.append("path")
    .attr("class", "tri")
    .attr("d", "M" + (600/2 + 12) + " " + (240 + 10) + " L" + 600/2 + " 0 L" + (600/2 - 3) + " " + (240 + 10) + " C" + (600/2 - 3) + " " + (240 + 20) + " " + (600/2 + 3) + " " + (240 + 20) + " " + (600/2 + 12) + " " + (240 + 10) + " Z")
    .attr("transform", "translate(-300,-250) rotate(0,0,0)");

var minute = groupGauge.append("path")
    .attr("class", "tri")
    .attr("d", "M" + (300/2 + 3) + " " + (170 + 10) + " L" + 300/2 + " 0 L" + (300/2 - 3) + " " + (170 + 10) + " C" + (300/2 - 3) + " " + (170 + 20) + " " + (300/2 + 3) + " " + (170 + 20) + " " + (300/2 + 3) + " " + (170 + 10) + " Z")
    .attr("transform", "translate(-150,-188) rotate(0,0,0)");

// Add the background arc, from 0 to 100% (τ).

function setValues(frequency, note, detune){
  console.log(frequencyScale(frequency));
  foreground.transition()
    .duration(190)
    .call(arcTween, note );

  gaugeGroup
    .transition()
    .duration(200)
    .attr("transform", "rotate(" + ( frequencyScale(frequency) ) + ",0,0)");
  
  groupGauge
    .transition()
    .duration(150)
    .attr("transform", "rotate(" + ( (detune / 8 * τ) + ( 0 )  ) + ",0,0)");

}


var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, 
  canvasElem,
  waveCanvas,
  pitchElem,
  noteElem,
  detuneElem,
  detuneAmount;

window.onload = function() {
  // Must do this first because everything happens within a audiocontext ( this is a audioNode )
  audioContext = new AudioContext();
  // the below code returns a floating point number that represents the sample rate in samples per second used by all nodes in context.
  MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));  // corresponds to a 5kHz signal
  var request = new XMLHttpRequest();
  request.open("GET", "../sounds/whistling3.ogg", true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    audioContext.decodeAudioData( request.response, function(buffer) { 
        theBuffer = buffer;
    } );
  };

  detectorElem = document.getElementById( "detector" );
  canvasElem = document.getElementById( "output" );
  DEBUGCANVAS = document.getElementById( "waveform" );
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "black";
    waveCanvas.lineWidth = 1;
  }
  pitchElem = document.getElementById( "pitch" );
  noteElem = document.getElementById( "note" );
  detuneElem = document.getElementById( "detune" );
  detuneAmount = document.getElementById( "detune_amt" );

  detectorElem.ondragenter = function () { 
    this.classList.add("droptarget"); 0
    return false; };
  detectorElem.ondragleave = function () { this.classList.remove("droptarget"); return false; };
  detectorElem.ondrop = function (e) {
      this.classList.remove("droptarget");
      e.preventDefault();
    theBuffer = null;

      var reader = new FileReader();
      reader.onload = function (event) {
        // asynchronously decode audio file data contained in an array buffer.
        audioContext.decodeAudioData( event.target.result, function(buffer) {
          theBuffer = buffer;
        }, function(){alert("error loading!");} ); 

      };
      reader.onerror = function (event) {
        alert("Error: " + reader.error );
    };
      reader.readAsArrayBuffer(e.dataTransfer.files[0]);
      return false;
  };



};

function error() {
    alert('Stream generation failed.');
}
// this gets user media i.e mic input
function getUserMedia(dictionary, callback) {
      // this might work for gaining mobile access to mic
      { 'OfferToReceiveAudio': true, { 'OfferToReceiveVideo' : false }}
    try {
        navigator.getUserMedia = 
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    // this will create an analyser node which can be used to expose audio time and frequency data to create vis
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    updatePitch();
}

function toggleOscillator() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "play oscillator";
    }
    sourceNode = audioContext.createOscillator();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    analyser.connect( audioContext.destination );
    sourceNode.start(0);
    isPlaying = true;
    isLiveInput = false;
    updatePitch();
    return "stop";
}

function toggleLiveInput() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
    }
    getUserMedia(
      {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream);
}

function togglePlayback() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "start";
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = theBuffer;
    sourceNode.loop = true;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    analyser.connect( audioContext.destination );
    sourceNode.start( 0 );
    isPlaying = true;
    isLiveInput = false;
    updatePitch();

    return "stop";
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array( buflen );

// C:523.25,  C#:554.37, D:587.33, D#:622.26, E:659.26, F:698.46, F#:739.99, G:783.99, G#:830.61, A:880, A#:932.33, B:987.77 
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}




function centsOffFromPitch( frequency, note ) {
  // target val frequencyFromNoteNumber (this is the perfect pitch AC) frequency is the users actualy frequency value between is cents off from pitch
  return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}


var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

function autoCorrelate( buf, sampleRate ) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i=0;i<SIZE;i++) {
    var val = buf[i];
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);
  if (rms<0.01) // not enough signal
    return -1;

  var lastCorrelation=1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i])-(buf[i+offset]));
    }
    correlation = 1 - (correlation/MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation>0.9) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
      // Now we need to tweak the offset - by interpolating between the values to the left and right of the
      // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
      // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
      // (anti-aliased) offset.

      // we know best_offset >=1, 
      // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
      // we can't drop into this clause until the following pass (else if).
      var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
      return sampleRate/(best_offset+(8*shift));
    }
    lastCorrelation = correlation;
  }
  if (best_correlation > 0.01) {

    // It appears that this is the HZ level
    console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
    return sampleRate/best_offset;
  }
  return -1;
//  var best_frequency = sampleRate/best_offset;
}

function updatePitch( time ) {
  var cycles = new Array;
  analyser.getFloatTimeDomainData( buf );
  var ac = autoCorrelate( buf, audioContext.sampleRate );

  if (ac == -1) {

    // can prompt user to be louder here
    $('.help').html('<p>').html('ENUNCIATE, NO ONE CAN HEAR YOU!');

    detectorElem.className = "vague";
    pitchElem.innerText = "--";
    noteElem.innerText = "-";
    detuneElem.className = "";
    detuneAmount.innerText = "--";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    pitchElem.innerText = Math.round( pitch ) ;
    var note =  noteFromPitch( pitch );
    noteElem.innerHTML = noteStrings[note%12];
    var detune = centsOffFromPitch( pitch, note );
    if (detune == 0 || detune == 1 || detune == 2 || detune == 3 || detune == 4) {
      detuneElem.className = "";
      detuneAmount.innerHTML = "--";
      $('.help').html('<p>').html("Oh my! You're PERFECT! YOU ANGEL! NOW HOLD IT"); 

    } else {
      if (detune <= 5){
        detuneElem.className = "flat";
        $('.help').html('<p>').html('YOU FLAT! TIGHTEN THOSE ABS, PUSH WITH YOUR DIAPHRAGM'); 

      }
      else{
        detuneElem.className = "sharp";
        detuneAmount.innerHTML = Math.abs( detune );

        $('.help').html('<p>').html('YOU SHARP! Relax a bit'); 

      }
    }
    // console.log(note,detune);
    setValues(pitch, note%12,detune);
  }
  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame( updatePitch );
}
// need to do note%12, match to string in noteStrings array.
// two hands one to target note 2nd to target flat/sharp

// Creates a tween on the specified transition's "d" attribute, transitioning
// any selected arcs from their current angle to the specified new angle.
function arcTween(transition, newAngle) {

  // The function passed to attrTween is invoked for each selected element when
  // the transition starts, and for each element returns the interpolator to use
  // over the course of transition. This function is thus responsible for
  // determining the starting angle of the transition (which is pulled from the
  // element's bound datum, d.endAngle), and the ending angle (simply the
  // newAngle argument to the enclosing function).
  transition.attrTween("d", function(d) {

    // To interpolate between the two angles, we use the default d3.interpolate.
    // (Internally, this maps to d3.interpolateNumber, since both of the
    // arguments to d3.interpolate are numbers.) The returned function takes a
    // single argument t and returns a number between the starting angle and the
    // ending angle. When t = 0, it returns d.endAngle; when t = 1, it returns
    // newAngle; and for 0 < t < 1 it returns an angle in-between.
    var interpolate = d3.interpolate(d.endAngle, newAngle);
    // The return value of the attrTween is also a function: the function that
    // we want to run for each tick of the transition. Because we used
    // attrTween("d"), the return value of this last function will be set to the
    // "d" attribute at every tick. (It's also possible to use transition.tween
    // to run arbitrary code for every tick, say if you want to set multiple
    // attributes from a single function.) The argument t ranges from 0, at the
    // start of the transition, to 1, at the end.
    return function(t) {

      // Calculate the current arc angle based on the transition time, t. Since
      // the t for the transition and the t for the interpolate both range from
      // 0 to 1, we can pass t directly to the interpolator.
      //
      // Note that the interpolated angle is written into the element's bound
      // data object! This is important: it means that if the transition were
      // interrupted, the data bound to the element would still be consistent
      // with its appearance. Whenever we start a new arc transition, the
      // correct starting angle can be inferred from the data.
      d.endAngle = interpolate(t);

      // Lastly, compute the arc path given the updated data! In effect, this
      // transition uses data-space interpolation: the data is interpolated
      // (that is, the end angle) rather than the path string itself.
      // Interpolating the angles in polar coordinates, rather than the raw path
      // string, produces valid intermediate arcs during the transition.
      return arc(d);
    };
  });
}

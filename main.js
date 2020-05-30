var kic = require('deeplearn-knn-image-classifier');
var dl = require('deeplearn');

// Webcam Image size. Must be 227. 
const IMAGE_SIZE = 227;
// K value for KNN
const TOPK = 10;
const predictionThreshold = 0.99;

// Number of frames per second (used to restrict prediction rate)
const FPS = 3; 
const FPS_INTERVAL = 1000/FPS

// The vocabulary, add/remove desired words here
var words = ["", "_PAUSE_", "Hello", "good", "morning", "my", "name", "nice", "Thank you!", "tea"];

class Main {
  constructor(){
    this.knn = null
    this.videoPlaying = false;
    this.videoTrainingPlaying = false;
    this.previousPrediction = -1
    this.training = -1; 
    this.infoTexts = [];
    this.currentPredictedWords = []

    // variables to restrict prediction rate
    this.now;
    this.then = Date.now()
    this.startTime = this.then;
    this.elapsed = 0;

    this.trainingModal = document.getElementById("launchModal");
    this.trainingListDiv = document.getElementById("training-list");
    this.signText = document.getElementById("signText");
    this.textLine = document.getElementById("text")    
    this.video = document.getElementById('video');
    this.trainingVideo = document.getElementById('training-video');
    this.addWordForm = document.getElementById("add-word");
    this.pauseLine = document.getElementById("pause-indicator");

    this.video.addEventListener('mousedown', () => {
      // click on video to pause prediction
      main.pausePredicting();
    })
    this.loadKNN();

    // launch the training modal
    this.launchTrainingModal(true);

    // create "Start Sign Interpretation" button
    this.createPredictBtn();
    // create "Train" button, that opens the training modal if closed
    this.createTrainingBtn();
    // create "Start Speech Interpretation" button
    this.createAudioBtn();
  }

  createTrainingBtn(){
    var div = document.getElementById("training-btn")
    div.innerHTML = ""

    const trainButton = document.createElement('button')
    trainButton.innerText = "Train";
    div.appendChild(trainButton);

    trainButton.addEventListener('mousedown', () => {
      this.launchTrainingModal(false)
    })
  }

  launchTrainingModal(first) {
    this.trainingModal.style.display = "block"

    // launch the webcam for training
    this.startTrainingWebcam();

    if (first){
      // create the list of words from vocabulary
      for(let i=0;i<words.length; i++){
        this.createButton(i);
      }
    }
  }

  createButton(i){
    const div = document.createElement('div');
    this.trainingListDiv.appendChild(div);
    
    // Create Word Text
    const wordText = document.createElement('span');
    if (i != 0){
      wordText.innerText = words[i].toUpperCase()+" "
    } else {
      wordText.innerText = "_BASE_"
    }

    wordText.style.fontWeight = "bold"
    div.appendChild(wordText);

    // Create training button
    const addExampleButton = document.createElement('button')
    addExampleButton.classList.add("addBtn");
    addExampleButton.innerText = "Train"//"Train " + words[i].toUpperCase()
    div.appendChild(addExampleButton);

    addExampleButton.addEventListener('mousedown', () => this.training = i);
    addExampleButton.addEventListener('mouseup', () => this.training = -1);

    // Create clear button to remove all training examples
    const clearButton = document.createElement('button')
    clearButton.classList.add("clearBtn");
    clearButton.innerText = "Clear"//`Clear ${words[i].toUpperCase()}`
    div.appendChild(clearButton);

    clearButton.addEventListener('mousedown', () => {
      this.knn.clearClass(i)
      this.infoTexts[i].innerText = " 0 trained frames"
    })
    
    // Create info text
    const infoText = document.createElement('span')
    infoText.innerText = " 0 trained frames";
    div.appendChild(infoText);
    this.infoTexts.push(infoText);
  }

  loadKNN(){
    this.knn = new kic.KNNImageClassifier(words.length, TOPK);
    // Load knn model
    this.knn.load()
    .then(() => this.startTraining()); 
  }

  startTraining(){
    if (this.timer) {
      this.stopTraining();
    }
    var promise = this.trainingVideo.play();

    if(promise !== undefined){
      promise.then(_ => {
        console.log("Autoplay started")
      }).catch(error => {
        console.log("Autoplay prevented")
      })
    }
    this.timer = requestAnimationFrame(this.train.bind(this));
  }
  
  stopTraining(){
    this.trainingVideo.pause();
    cancelAnimationFrame(this.timer);
  }
  
  train(){
    if(this.videoTrainingPlaying){
      // Get image data from video
      const image = dl.fromPixels(this.trainingVideo);
      
      // Train class if one of the buttons is held down
      if(this.training != -1){
        const image = dl.fromPixels(this.trainingVideo);
        this.knn.addImage(image, this.training)

        const exampleCount = this.knn.getClassExampleCount()

        if(Math.max(...exampleCount) > 0){
          for(let i=0;i<words.length;i++){
            if(exampleCount[i] > 0){
              this.infoTexts[i].innerText = ` ${exampleCount[i]} trained frames`
            }
          }
        }
      }
    }
    this.timer = requestAnimationFrame(this.train.bind(this));
  }

  updateExampleCount(){
    var p = document.getElementById('count')
    p.innerText = `Training: ${words.length} words`
  }

  startTrainingWebcam(){
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}, audio: false})
    .then((stream) => {
      this.trainingVideo.srcObject = stream;
      this.trainingVideo.width = IMAGE_SIZE;
      this.trainingVideo.height = IMAGE_SIZE;

      this.trainingVideo.addEventListener('playing', ()=> this.videoTrainingPlaying = true);
      this.trainingVideo.addEventListener('paused', ()=> this.videoTrainingPlaying = false);
    })
  }

  startWebcam(){
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}, audio: false})
    .then((stream) => {
      this.video.srcObject = stream;
      this.video.width = IMAGE_SIZE;
      this.video.height = IMAGE_SIZE;

      this.video.addEventListener('playing', ()=> this.videoPlaying = true);
      this.video.addEventListener('paused', ()=> this.videoPlaying = false);
    })
  }

  createPredictBtn(){
    var div = document.getElementById("action-btn")
    div.innerHTML = ""
    const predButton = document.createElement('button')

    predButton.innerText = "Start Sign Interpretation";
    div.appendChild(predButton);

    predButton.addEventListener('mousedown', () => {
      this.startWebcam();
      this.signText.value = "";
      console.log("start predicting")      
      this.startPredicting()
    })
  }

  startPredicting(){
    console.log("Start predicting");
    this.pauseLine.innerText = "";
    this.video.play();
    this.pred = requestAnimationFrame(this.predict.bind(this));
  }

  pausePredicting(){
    console.log("Pause predicting")
    cancelAnimationFrame(this.pred)
    this.videoPlaying = false;
    this.pauseLine.innerText = "PAUSED";
  }

  predict(){
    this.now = Date.now()
    this.elapsed = this.now - this.then

    if(this.elapsed > FPS_INTERVAL){
      this.then = this.now - (this.elapsed % FPS_INTERVAL)

      if(this.videoPlaying){
        const exampleCount = this.knn.getClassExampleCount();
        const image = dl.fromPixels(this.video);

        var sentence = this.signText.value

        if(Math.max(...exampleCount) > 0){
          this.knn.predictClass(image)
          .then((res) => {
            if(res.confidences[res.classIndex] > predictionThreshold 
              && res.classIndex != this.previousPrediction){
              
              // if not 'Pause'
              if(res.classIndex != 1){
                console.log(words[res.classIndex]);
                sentence += " " + words[res.classIndex]
                this.type(sentence);

                // set previous prediction so it doesn't get called again
                this.previousPrediction = res.classIndex;
              } else {
                main.pausePredicting();
              }
            }
          })
          .then(() => image.dispose())
        } else {
          image.dispose()
        }
      }
    }
    this.pred = requestAnimationFrame(this.predict.bind(this))
  }

  type(text){
    this.signText.value = text;
  }

  // Creates the button for speech recognition
  createAudioBtn() {
    var div = document.getElementById("audio-btn");
    div.innerHTML = "";

    var audioButton = document.createElement('button');
    audioButton.innerText = "Start Speech Interpretation";
    div.appendChild(audioButton);

    audioButton.addEventListener('mousedown', () => {
      var p = document.createElement('p');
      p.innerText = 'Speak';

      console.log("Waiting for response")

      var stt = new SpeechToText();
      stt.SpeechToText();
    });
  }
}

class SpeechToText{
  constructor(){
    this.interimTextLine = document.getElementById("interimText")
    this.textLine = document.getElementById("answerText")
    this.finalTranscript = ''
    this.recognising = false

    this.recognition = new webkitSpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.lang = 'en-GB'

    this.recognition.onstart = () => {
      this.recognising = true;
      console.log("started recognising")
    }

    this.recognition.onerror = (evt) => {
      console.log(evt + " recogn error")
    }

    this.recognition.onend = () => {
      console.log("stopped recognising")
      if(this.finalTranscript.length == 0){
        this.type("No response detected")
      }
      this.recognising = false;

      // restart prediction after a pause
      main.startPredicting()
    }

    this.recognition.onresult = (event) => {
      var interim_transcript = ''
      if(typeof(event.results) == 'undefined'){
        return;
      }
   
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.finalTranscript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }

      this.interimType(interim_transcript)
      this.type(this.finalTranscript)
    }

    this.startListening();
  }

  startListening(){
    if(this.recognizing){
      this.recognition.stop()
      return
    }

    console.log("listening")

    main.pausePredicting()

    this.recognition.start()
  }

  stopListening(){
    console.log("STOP LISTENING")
    if(this.recognizing){
      console.log("stop speech to text")
      this.recognition.stop()

      //restart predicting
      main.startPredicting()
      return
    }
  }

  interimType(text){
    this.interimTextLine.innerText = text
  }

  type(text){
    this.textLine.innerText = text;
  }
}

var main = null;

window.addEventListener('load', () => {
  // Check if the app is opened in compatible browser
  var ua = navigator.userAgent.toLowerCase()
  if(!(ua.indexOf("chrome") != -1 || ua.indexOf("firefox")!= -1)){
    alert("Please visit in the latest Chrome or Firefox")
    return
  } 
  main = new Main()
});


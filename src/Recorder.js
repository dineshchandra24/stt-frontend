export async function recordAudio() {
  if (!navigator.mediaDevices) {
    throw new Error("Microphone not supported");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  return new Promise((resolve) => {
    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      resolve(audioBlob);
    });

    mediaRecorder.start();

    // stop after 5s
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
  });
}

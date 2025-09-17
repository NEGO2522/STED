// src/utils/mediaUtils.js
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../firebase"; // Import your Firebase Realtime Database instance
import { ref as dbRef, update } from "firebase/database";

// Start audio recording
export const startRecording = async (mediaRecorderRef, audioChunksRef) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  audioChunksRef.current = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data);
    }
  };

  recorder.start();
  mediaRecorderRef.current = recorder;
};

// Stop and upload the recording to Firebase
export const stopAndUpload = async (mediaRecorderRef, audioChunksRef, navigate, userId, taskId) => {
  const recorder = mediaRecorderRef.current;

  if (!recorder) return;

  return new Promise((resolve) => {
    recorder.onstop = async () => {
      // Create audio blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const storage = getStorage();

      // Define storage path for the audio file
      const timestamp = Date.now();
      const audioPath = `recordings/${userId}/${taskId}/recording-${timestamp}.webm`;
      const audioStorageRef = storageRef(storage, audioPath);

      try {
        // Upload audio to Firebase Storage
        await uploadBytes(audioStorageRef, audioBlob);
        // console.log("Audio uploaded to Firebase Storage");

        // Get the download URL of the uploaded audio
        const downloadURL = await getDownloadURL(audioStorageRef);

        // Store completion record in Realtime Database
        const taskCompletionRef = dbRef(db, `users/${userId}/taskCompletions/${taskId}`);
        await update(taskCompletionRef, {
          audioUrl: downloadURL,
          completedAt: new Date().toISOString(),
        });

        // console.log("Audio URL and completion timestamp saved to Realtime Database");
        
        // Clean up
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];

        resolve(downloadURL);
      } catch (err) {
        console.error("Error during audio upload or database update:", err);
        resolve(null);
      }
    };

    recorder.stop();
  });
};
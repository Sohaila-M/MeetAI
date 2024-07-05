# -*- coding: utf-8 -*-
"""
Created on Sat Jun 15 11:18:15 2024

@author: Heba
"""

# -*- coding: utf-8 -*-
"""
Created on Thu Jun 13 12:08:56 2024

@author: Heba
"""

# -*- coding: utf-8 -*-
"""
Created on Thu May  9 03:10:54 2024

@author: Heba
"""


import queue
import re
import sys
from google.oauth2 import service_account
from google.cloud import speech
import time
import pyaudio

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms


class MicrophoneStream:
    """Opens a recording stream as a generator yielding the audio chunks."""

    def __init__(self: object, rate: int = RATE, chunk: int = CHUNK) -> None:
        """The audio -- and generator -- is guaranteed to be on the main thread."""
        self._rate = rate
        self._chunk = chunk

        # Create a thread-safe buffer of audio data
        self._buff = queue.Queue()
        self.closed = True

    def __enter__(self: object) -> object:
        self._audio_interface = pyaudio.PyAudio()
        self._audio_stream = self._audio_interface.open(
            format=pyaudio.paInt16,
         
            channels=1,
            rate=self._rate,
            input=True,
            frames_per_buffer=self._chunk,
          
            stream_callback=self._fill_buffer,
        )

        self.closed = False

        return self

    def __exit__(
        self: object,
        type: object,
        value: object,
        traceback: object,
    ) -> None:
        """Closes the stream, regardless of whether the connection was lost or not."""
        self._audio_stream.stop_stream()
        self._audio_stream.close()
        self.closed = True
      
        self._buff.put(None)
        self._audio_interface.terminate()

    def _fill_buffer(
        self: object,
        in_data: object,
        frame_count: int,
        time_info: object,
        status_flags: object,
    ) -> object:
       
        self._buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self: object) -> object:
        
        while not self.closed:
            # Use a blocking get() to ensure there's at least one chunk of
            # data, and stop iteration if the chunk is None, indicating the
            # end of the audio stream.
            chunk = self._buff.get()
            if chunk is None:
                return
            data = [chunk]

            # Now consume whatever other data's still buffered.
            while True:
                try:
                    chunk = self._buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            yield b"".join(data)

def listen_print_loop(responses):
    transcript = ""
    
    for response in responses:
        if not response.results:
            continue

        result = response.results[0]
        if not result.alternatives:
            continue

        transcript = result.alternatives[0].transcript

        if result.is_final:

            print("transcripts:",transcript)
            # f=open('recognition.txt ','a')
            # f.write(transcript+" ")
            # f.close()

            if re.search(r"\b(exit|quit)\b", transcript, re.I):
                print("Exiting..")
                break

            return transcript

        # if result.is_final:
        #
        #     print("listen_print_loop function :",transcript)
        #     if (transcript != ''):
        #       f=open('recognition.txt ','a')
        #       f.write(transcript+" ")
        #       f.close()
        #     if re.search(r"\b(exit|quit)\b", transcript, re.I):
        #         print("Exiting..")
        #         break

    # return transcript


def main() -> None:
    """Transcribe speech from audio file."""
    while (True):
  
        language_code = "en-US"  # a BCP-47 language tag

        client_file_path="s2.json"
        credentials=service_account.Credentials.from_service_account_file( client_file_path )

        client = speech.SpeechClient(credentials=credentials)
        config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code=language_code,
            )

        streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
            )

        with MicrophoneStream(RATE, CHUNK) as stream:
            audio_generator = stream.generator()
            requests = (
                speech.StreamingRecognizeRequest(audio_content=content)
                for content in audio_generator
                )

            responses = client.streaming_recognize(streaming_config, requests)

            # Now, put the transcription responses to use.
            x= listen_print_loop(responses)
            f = open('recognition.txt ', 'a')
            f.write(x)
            f.close()


#
# if __name__ == "__main__":
#     main()
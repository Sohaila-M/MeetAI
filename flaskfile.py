from flask import Flask, Response, request, render_template, send_file
from flask import Flask, render_template, jsonify
import speech_recognition as sr
from flask import jsonify
from transformers import BartForConditionalGeneration, BartTokenizer
import textwrap
from flask_socketio import SocketIO, emit
import threading
import time 
import logging
#import pyttsx3
from deep_translator import GoogleTranslator
import transcription_for_summary
import requests
import last_v_real_transc
import last_v_real_time_translation
import google



# app.py
stop_looping=False
stop_summary=False
app_skill=Flask(__name__,template_folder='template')
socketio = SocketIO(app_skill)

recognizer = sr.Recognizer()


def translation():
    try:
       translated_text=last_v_real_time_translation.main()
       print ("from translation() function :",translated_text)

       return jsonify({'translated_text': translated_text})
    except google.api_core.exceptions.OutOfRange:
        print("Audio Timeout Error: Long duration elapsed without audio. Audio should be sent close to real time.")
    except requests.exceptions.ConnectionError:
        print("RemoteDisconnected('Remote end closed connection without response")
def summary():
    global stop_summary
    while not stop_summary :
        try:
            transcription_for_summary.main()
        except google.api_core.exceptions.OutOfRange:
            print("Audio Timeout Error: Long duration elapsed without audio. Audio should be sent close to real time.")


def transcribe_audio():
    try:
       text=last_v_real_transc.main()
       print ("from transcribe_audio() function :",text)
       return jsonify({'text': text})
    except google.api_core.exceptions.OutOfRange :
        print("Audio Timeout Error: Long duration elapsed without audio. Audio should be sent close to real time.")

def stop_loop():
    global stop_looping
    stop_looping = True
    print("Loop will stop on the next iteration.")

# Route to handle AJAX request to stop the loop
@socketio.on('stop_transcription')
def stop():
    global stop_looping
    stop_looping = True
    print("Loop will stop on the next iteration.")
    print("from stop" ,stop_looping)
    return 'Loop stopped'

@socketio.on('start_captioning')
def recognize_speech():
    global stop_looping
    stop_looping=False
    print("start caption from python")
    while not stop_looping:
        talk = transcribe_audio()
        # Emit real-time caption to connected clients
        if (talk!=""):
            print ("talk is : ",talk.json["text"])
            socketio.emit('caption_update', {'caption': talk.json["text"]})
          # Sleeping to avoid high CPU usage in the loop
        socketio.sleep(0.001)
        print("End caption from python")
    print("recognize_speech loop is broken ")
        
@socketio.on('start_translate')
def translation_start():
    global stop_looping
    stop_looping=False
    print("start translation from socket")
    while not stop_looping:
        talk = translation()
        # print(talk)
        # print("102")
        # Emit real-time caption to connected clients
        if (talk!=""):
            print("translation is : ", talk.json['translated_text'])
            socketio.emit('caption_update', {'translation': talk.json["translated_text"]})
          # Sleeping to avoid high CPU usage in the loop
        socketio.sleep(0.001)
        print("End translation from python")
    print("translation_start loop is broken ")

@app_skill.route('/download')
def download_file():
    global stop_summary
    stop_summary = True
    print ("Generating Summary")
    #Open the file in read mode ('r')
    with open('recognition.txt', 'r') as file:
        # Read the entire contents of the file
        text = file.read()
        #print(text)
    # Split the text into words
    words = text.split()
    # Count the number of words
    word_count = len(words)
    model_name = "facebook/bart-large-cnn"
    model = BartForConditionalGeneration.from_pretrained(model_name)
    tokenizer = BartTokenizer.from_pretrained(model_name)

    inputs = tokenizer.encode("summarize: " + text, return_tensors="pt", max_length=1024, truncation=True)
    summary_ids = model.generate(inputs, max_length=int(word_count/2), min_length=int(word_count/4), length_penalty=2.0, num_beams=2,
                                 early_stopping=True)

    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    formatted_summary = "\n".join(textwrap.wrap(summary, width=80))
    print ("Summary Translation ")
    translated_summary = GoogleTranslator('en', 'ar').translate(formatted_summary)
    formatted_translated_summary = "\n".join(textwrap.wrap(translated_summary, width=80))
    with open('summary.txt', 'w' ,encoding='utf-8') as file:
        # Write content to the file
        file.write("Summary : \n")
        file.write(formatted_summary)
        file.write("\nTranslated Summary : \n")
        file.write(formatted_translated_summary)
    print ("Summary : \n",formatted_summary)

    # Provide the file for download
    return send_file('summary.txt', as_attachment=True)
    # Provide the file for download
    # return send_file('transcription.txt', as_attachment=True)

@app_skill.route('/')
def home():
    return render_template("home.html")

@app_skill.route('/index.html')
def index():
    return render_template("index.html")


@app_skill.route('/exit.html')
def exit():
    return render_template("exit.html")

if __name__ == '__main__':
    with open('summary.txt', 'w') as file:
        pass
    with open('recognition.txt', 'w') as file:
        pass
    thread1 = threading.Thread(target=summary)
    thread1.start()
    socketio.run(app_skill,debug=True, port=8000,allow_unsafe_werkzeug=True)
    thread1.join()



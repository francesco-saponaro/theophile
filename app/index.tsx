// app/index.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

// Define a Message type for better type safety.
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
}

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // Voice recognition event handler hooks
  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("end", () => setIsRecording(false));
  useSpeechRecognitionEvent("result", (event) => {
    const recognizedText = event.results[0]?.transcript;
    sendMessage(recognizedText);
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  // Function to start voice recognition.
  const startListening = async () => {
    if (Platform.OS !== "web") {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("Permissions not granted", result);
        return;
      }
    }

    ExpoSpeechRecognitionModule.start({
      lang: "fr-FR",
      interimResults: false,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: ["Carlsen", "Nepomniachtchi", "Praggnanandhaa"],
    });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  // Function to call the ChatGPT API. It accepts an optional messageText parameter,
  // so it can be called with either typed or recognized voice input.
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText !== undefined ? messageText : input;
    if (!textToSend.trim()) return;

    // Create a message object for the user's input.
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    if (messageText === undefined) setInput("");

    try {
      setLoading(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ userPrompt: userMessage.text }),
      });
      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: typeof data === "string" ? data : JSON.stringify(data),
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);

      try {
        Speech.stop();
        Speech.speak(botMessage.text, {
          language: "fr-FR",
          rate: 1.3,
          onDone: () => {
            console.log("Speech finished");
          },
          onError: (error) => {
            console.error("Speech error:", error);
          },
          // Speech.stop()
        });
      } catch (error) {
        console.error("Speech failed:", error);
      }
    } catch (error) {
      console.error("Error with API request:", error);
      // Optionally, add error handling UI here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>French Translation Assistant</Text>
      </View>
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContentContainer}
          renderItem={({ item }) => (
            <View
              style={
                item.sender === "user" ? styles.userBubble : styles.botBubble
              }
            >
              <Text
                style={
                  item.sender === "user"
                    ? styles.messageText
                    : styles.botMessageText
                }
              >
                {item.text}
              </Text>
            </View>
          )}
        />
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Écris ta question en français or in English"
          placeholderTextColor="#777"
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => sendMessage()}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.voiceButton, isRecording && styles.recordingButton]}
          onPressIn={startListening} // Start listening when pressed
          onPressOut={stopListening} // Stop listening when released
          disabled={loading}
        >
          <Text style={styles.voiceButtonText}>
            {isRecording ? "🎙️" : "🎤"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    backgroundColor: "#2C3E50",
    padding: 16,
    alignItems: "center",
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  chatContainer: {
    flex: 1,
  },
  chatContentContainer: {
    padding: 16,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3498DB",
    borderRadius: 20,
    padding: 12,
    marginVertical: 4,
    maxWidth: "80%",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    marginVertical: 4,
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 16,
    color: "#FFF",
  },
  botMessageText: {
    fontSize: 16,
    color: "#000",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#2C3E50",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  voiceButton: {
    backgroundColor: "#34495E",
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  recordingButton: {
    backgroundColor: "#E74C3C",
  },
  voiceButtonText: {
    fontSize: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});

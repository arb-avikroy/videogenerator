// Test Google Cloud TTS API
const API_KEY = "AIzaSyD2QLgMlnCezT7V-2z0pt0SrbBz7VIKMVE";

async function testGoogleTTS() {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
  
  const requestBody = {
    input: { text: "Hello, this is a test of Google Cloud Text-to-Speech." },
    voice: {
      languageCode: "en-US",
      name: "en-US-Neural2-J",
      ssmlGender: "MALE"
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.9
    }
  };

  try {
    console.log("Testing Google Cloud TTS API...");
    console.log("URL:", url.replace(API_KEY, "***"));
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Error:", JSON.stringify(data, null, 2));
      if (data.error) {
        console.error("\nError details:");
        console.error("Message:", data.error.message);
        console.error("Status:", data.error.status);
        console.error("Code:", data.error.code);
        
        // Common error solutions
        if (data.error.message.includes("API key not valid")) {
          console.log("\n💡 Solution: Check your API key at https://console.cloud.google.com/apis/credentials");
        }
        if (data.error.message.includes("API has not been used")) {
          console.log("\n💡 Solution: Enable Text-to-Speech API at https://console.cloud.google.com/apis/library/texttospeech.googleapis.com");
        }
        if (data.error.message.includes("billing")) {
          console.log("\n💡 Solution: Enable billing at https://console.cloud.google.com/billing");
        }
      }
    } else {
      console.log("✅ Success! Audio generated:", data.audioContent ? `${data.audioContent.substring(0, 50)}...` : "No audio");
      console.log("\n🎉 Google Cloud TTS is working correctly!");
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

testGoogleTTS();

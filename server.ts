import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Type, Modality } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

// Try to load .env.local first (common in Next.js/Vite), then .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const port = 9000;
const wss = new WebSocketServer({ port });

console.log(`Live API Server running on port ${port}`);
console.log(`Checking API_KEY... ${process.env.API_KEY ? 'Present' : 'Missing'}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    ws.send(JSON.stringify({ type: 'error', error: 'Server configuration error: API_KEY missing' }));
    ws.close();
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const renderDiagramTool = {
      functionDeclarations: [{
          name: "render_diagram",
          description: "Render OR UPDATE a mermaid diagram. Call this tool with the full mermaid code.",
          parameters: {
             type: Type.OBJECT,
             properties: { mermaid_code: { type: Type.STRING } },
             required: ["mermaid_code"]
          }
      }]
  };

  // We use a promise to hold the session so we can queue incoming messages
  // while the connection is being established.
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        tools: [renderDiagramTool],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: "You are MONKS Live. Engage in a natural, helpful voice conversation. If the user asks to visualize architecture, use 'render_diagram'."
    },
    callbacks: {
        onopen: () => {
            console.log("Gemini Session Opened");
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'open' }));
            }
        },
        onmessage: (msg: LiveServerMessage) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'message', data: msg }));
            }
        },
        onclose: () => {
            console.log("Gemini Session Closed");
            if (ws.readyState === WebSocket.OPEN) ws.close();
        },
        onerror: (err: any) => {
            console.error("Gemini Session Error:", err);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', error: err.message }));
            }
        }
    }
  });

  ws.on('message', async (data) => {
      try {
          const parsed = JSON.parse(data.toString());
          const session = await sessionPromise;

          if (parsed.type === 'audio') {
              session.sendRealtimeInput({
                  media: {
                      mimeType: "audio/pcm;rate=16000",
                      data: parsed.data
                  }
              });
          } else if (parsed.type === 'tool_response') {
              session.sendToolResponse({
                  functionResponses: parsed.functionResponses
              });
          }
      } catch (error) {
          console.error("Error processing message from client:", error);
      }
  });

  ws.on('close', async () => {
      console.log("Client disconnected, closing session");
      try {
          const session = await sessionPromise;
          session.close();
      } catch (e) {
          console.error("Error closing session:", e);
      }
  });

  ws.on('error', (err) => {
      console.error("WebSocket error:", err);
  });
});
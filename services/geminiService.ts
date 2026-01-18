
import { GoogleGenAI, Type } from "@google/genai";
import { AudioAnalysis, Track, BulkSongEntry } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeAudio = async (
  file: File, 
  metadata?: Track, 
  feedbackType?: 'down' | 'refine_more',
  previousResult?: AudioAnalysis
): Promise<AudioAnalysis> => {
  const base64Audio = await fileToGenerativePart(file);

  let promptText = "Analyze this audio clip. Be HYPER-SPECIFIC with subgenres. Use Google Search to check artist history.";
  
  if (feedbackType === 'down') {
    promptText += `\nRE-ANALYSIS REQUIRED: The previous classification (${previousResult?.subgenre}) was marked as INCORRECT by the user. Please investigate the waveform again for subtle sonic markers or distinct rhythms. Do NOT use the previous result.`;
  } else if (feedbackType === 'refine_more') {
    promptText += `\nNARROW DOWN REQUIRED: The previous classification (${previousResult?.subgenre}) was accurate but too broad. Provide a HYBRID subgenre that includes a secondary influence (e.g., "Liquid DnB / Halftime").`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            subgenre: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            bpm: { type: Type.STRING },
            key: { type: Type.STRING },
            camelot: { type: Type.STRING },
            breakdown: { type: Type.STRING },
            instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            mood: { type: Type.STRING },
            rhythmType: { type: Type.STRING },
            sonicMarkers: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["genre", "subgenre", "confidence", "bpm", "key", "camelot", "breakdown", "instruments", "mood", "rhythmType", "sonicMarkers"]
        }
      },
      contents: [{ parts: [{ inlineData: { mimeType: file.type, data: base64Audio } }, { text: promptText }] }]
    });

    return JSON.parse(response.text || "{}") as AudioAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const refineSingleTrack = async (
  track: BulkSongEntry, 
  feedbackType: 'down' | 'refine_more'
): Promise<BulkSongEntry> => {
  let prompt = "";
  if (feedbackType === 'down') {
    prompt = `The classification for "${track.title}" by "${track.artist}" was marked INCORRECT (${track.subgenre}). Use Google Search to find the EXACT micro-genre. Dig into specific musical movements (e.g., "Drift Phonk", "Neurofunk").`;
  } else {
    prompt = `The classification for "${track.title}" by "${track.artist}" was good (${track.subgenre}) but needs to be NARROWED DOWN. Provide a HYBRID micro-genre that captures a secondary sonic influence.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             title: { type: Type.STRING },
             artist: { type: Type.STRING },
             genre: { type: Type.STRING },
             subgenre: { type: Type.STRING },
             bpm: { type: Type.STRING },
             key: { type: Type.STRING },
             camelot: { type: Type.STRING }
          },
          required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot"]
        }
      },
      contents: [{ parts: [{ text: prompt }] }]
    });

    const result = JSON.parse(response.text || "{}");
    return { ...result, id: track.id };
  } catch (error) {
    throw error;
  }
};

export const analyzeImageForBulkSongs = async (file: File): Promise<BulkSongEntry[]> => {
  const base64Image = await fileToGenerativePart(file);
  const prompt = `Digitize this tracklist. For each song, use Google Search to find the EXACT HYPER-SPECIFIC micro-genre. Hybrid results (e.g. "Genre A / Genre B") are encouraged if unsure.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
               title: { type: Type.STRING },
               artist: { type: Type.STRING },
               genre: { type: Type.STRING },
               subgenre: { type: Type.STRING },
               bpm: { type: Type.STRING },
               key: { type: Type.STRING },
               camelot: { type: Type.STRING }
            },
            required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot"]
          }
        }
      },
      contents: [{ parts: [{ inlineData: { mimeType: file.type, data: base64Image } }, { text: prompt }] }]
    });

    const raw = JSON.parse(response.text || "[]") as any[];
    return raw.map(item => ({ ...item, id: crypto.randomUUID() }));
  } catch (error) {
    throw error;
  }
};

export const analyzeTracklistText = async (text: string): Promise<BulkSongEntry[]> => {
  const prompt = `Parse and enrich this list. Find EXTREMELY SPECIFIC subgenres for every track. Provide hybrid subgenres where relevant. Use Google Search.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
               title: { type: Type.STRING },
               artist: { type: Type.STRING },
               genre: { type: Type.STRING },
               subgenre: { type: Type.STRING },
               bpm: { type: Type.STRING },
               key: { type: Type.STRING },
               camelot: { type: Type.STRING }
            },
            required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot"]
          }
        }
      },
      contents: [{ parts: [{ text: `${prompt}\n\n${text}` }] }]
    });

    const raw = JSON.parse(response.text || "[]") as any[];
    return raw.map(item => ({ ...item, id: crypto.randomUUID() }));
  } catch (error) {
    throw error;
  }
};


import { GoogleGenAI, Type } from "@google/genai";
import { AudioAnalysis, Track, BulkSongEntry } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const base64Audio = await fileToGenerativePart(file);

  let promptText = `Perform a deep sonic analysis of this audio. 
  1. Identify ALL artists involved.
  2. Classify the EXACT micro-genre.
  3. Detect Key, BPM, and Mood.
  4. Act as a Profanity Checker: Search for the song's lyrics online. If not found, listen carefully to the audio to decipher the lyrics. Tag if the track is Explicit (contains profanity) and provide timestamps for where the profanity occurs.
  
  Use Google Search to verify recent scene data for this track/artist and to search for lyrics. If initial Google Searches can't find a track based on the title/artist, search SoundCloud to locate it and use the audio and metadata found there for your analysis.`;
  
  if (feedbackType === 'down') {
    promptText += `\n\nRE-CALIBRATION: User marked previous result (${previousResult?.subgenre}) as WRONG. Rethink the classification from scratch.`;
  } else if (feedbackType === 'refine_more') {
    promptText += `\n\nNARROW DOWN: User wants more detail. If the track has secondary influences, use a hybrid label (e.g., "${previousResult?.subgenre} / [Secondary Influence]").`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 16384 }, // Allocate budget for musicological reasoning
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            subgenre: { type: Type.STRING },
            artists: { type: Type.STRING, description: "All contributing artists (Main, Features, Collabs)" },
            confidence: { type: Type.NUMBER },
            bpm: { type: Type.STRING },
            key: { type: Type.STRING },
            camelot: { type: Type.STRING },
            breakdown: { type: Type.STRING },
            instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            mood: { type: Type.STRING },
            rhythmType: { type: Type.STRING },
            sonicMarkers: { type: Type.ARRAY, items: { type: Type.STRING } },
            isExplicit: { type: Type.BOOLEAN, description: "True if the track contains profanity" },
            profanityTimestamps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of timestamps and the profane word, e.g., '01:24 - word'" }
          },
          required: ["genre", "subgenre", "artists", "confidence", "bpm", "key", "camelot", "breakdown", "instruments", "mood", "rhythmType", "sonicMarkers", "isExplicit", "profanityTimestamps"]
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = feedbackType === 'down' 
    ? `The classification for "${track.title}" by "${track.artist}" was marked INCORRECT (${track.subgenre}). Use Google Search to find the EXACT micro-genre and all featured artists. Also check for profanity in lyrics. If initial Google Searches can't find a track, search SoundCloud to locate it and use the audio and metadata found there for your analysis.`
    : `The classification for "${track.title}" by "${track.artist}" was good (${track.subgenre}) but needs to be NARROWED DOWN. Provide a hybrid micro-genre label. Also check for profanity in lyrics. If initial Google Searches can't find a track, check SoundCloud.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 8192 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             title: { type: Type.STRING },
             artist: { type: Type.STRING, description: "All contributing artists" },
             genre: { type: Type.STRING },
             subgenre: { type: Type.STRING },
             bpm: { type: Type.STRING },
             key: { type: Type.STRING },
             camelot: { type: Type.STRING },
             isExplicit: { type: Type.BOOLEAN, description: "True if the track contains profanity" }
          },
          required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot", "isExplicit"]
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const base64Image = await fileToGenerativePart(file);
  const prompt = `Digitize this tracklist. For each song, identify ALL artists and find the EXACT micro-genre via Google Search. Also check for profanity in lyrics for each track. If initial Google Searches can't find a track based on the source image, search SoundCloud to locate it and listen to the track there for analysis.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 12288 },
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
               camelot: { type: Type.STRING },
               isExplicit: { type: Type.BOOLEAN, description: "True if the track contains profanity" },
               missingArtistInSource: { type: Type.BOOLEAN, description: "True ONLY if the original source image explicitly missed listing the artist(s), requiring you to identify them purely from search/audio." }
            },
            required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot", "isExplicit", "missingArtistInSource"]
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Process this tracklist. For every track, identify ALL artists and find the hyper-specific micro-genre. Use Google Search. Also check for profanity in lyrics for each track. If initial Google Searches can't find a track, search SoundCloud to locate it and listen to the track there for analysis.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 8192 },
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
               camelot: { type: Type.STRING },
               isExplicit: { type: Type.BOOLEAN, description: "True if the track contains profanity" },
               missingArtistInSource: { type: Type.BOOLEAN, description: "True ONLY if the original source text exactly missed listing the artist(s), requiring you to identify them purely from search/audio." }
            },
            required: ["title", "artist", "genre", "subgenre", "bpm", "key", "camelot", "isExplicit", "missingArtistInSource"]
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

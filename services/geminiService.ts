import { GoogleGenAI, Type } from "@google/genai";
import { AudioAnalysis, Track, BulkSongEntry } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// Initialize Gemini Client
// Note: process.env.API_KEY is automatically injected in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the provided audio file using Gemini.
 */
export const analyzeAudio = async (file: File, metadata?: Track): Promise<AudioAnalysis> => {
  const base64Audio = await fileToGenerativePart(file);

  // Construct a context-aware prompt
  let promptText = "Analyze this audio clip. Provide BPM, Camelot Key (e.g. 8A), Musical Key, and precise Genre.";
  
  if (metadata) {
    promptText = `
      Context:
      Track Title: "${metadata.title}"
      Artist: "${metadata.artist}"
      Streaming Service Tag: "${metadata.primaryGenre || 'Unknown'}"

      Instructions:
      1. Estimate the BPM immediately.
      2. Use the BPM and drum pattern to determine the genre.
         - If ~170+ BPM: Drum & Bass.
         - If ~140 BPM: Dubstep, Trap, or Future Garage.
         - If ~120-130 BPM: House or Techno.
         - If ~80-110 BPM: Hip Hop, Glitch Hop, or Downtempo.
      3. Verify if the Streaming Service Tag is accurate or too generic. If too generic (e.g., 'Electronic'), find the specific subgenre (e.g., 'Wonky', 'IDM', 'Neurohop').
      4. Identify the Camelot Key (e.g., 4A, 11B) and standard Musical Key.
      5. Analyze the mood and instrumentation.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Flash for low latency audio analysis
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING, description: "Primary genre of the track" },
            subgenre: { type: Type.STRING, description: "Specific subgenre (e.g. Liquid DnB, Future Garage)" },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
            bpm: { type: Type.STRING, description: "Estimated BPM (e.g. '140 BPM')" },
            key: { type: Type.STRING, description: "Estimated Musical Key (e.g. 'F Minor')" },
            camelot: { type: Type.STRING, description: "Estimated Camelot Key (e.g. '4A')" },
            breakdown: { type: Type.STRING, description: "Detailed sonic explanation justifying the genre choice based on tempo and rhythm." },
            instruments: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of detected instruments"
            },
            mood: { type: Type.STRING, description: "Emotional mood of the track" }
          },
          required: ["genre", "subgenre", "confidence", "bpm", "key", "camelot", "breakdown", "instruments", "mood"]
        }
      },
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: file.type, 
                data: base64Audio
              }
            },
            {
              text: promptText
            }
          ]
        }
      ]
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AudioAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image (screenshot) containing a list of songs.
 */
export const analyzeImageForBulkSongs = async (file: File): Promise<BulkSongEntry[]> => {
  const base64Image = await fileToGenerativePart(file);

  const prompt = `
    Analyze this image. It contains a list of music tracks (Artist and Title).
    
    Tasks:
    1. Extract every song Title and Artist visible in the image.
    2. Based on your musical knowledge of these specific tracks, estimate the likely Genre, Subgenre, BPM, Camelot Key, and Musical Key for EACH track.
    3. If the text is cut off, do your best to infer the song.
    
    GENRE RULES:
    - 'genre' field: Do NOT use broad terms like "Electronic" or "Rock". Use the specific parent genre (e.g., "Dubstep", "Drum & Bass", "House", "Techno", "Indie Rock", "Metal").
    - 'subgenre' field: Be highly specific (e.g., "Deep Dubstep", "Liquid Funk", "Tech House", "Shoegaze").
    
    Return a strict JSON Array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      config: {
        systemInstruction: "You are a music librarian and sonic analyst. Your job is to digitize tracklists from images and enrich them with metadata.",
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
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as BulkSongEntry[];

  } catch (error) {
    console.error("Gemini Bulk Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyzes text content (e.g. CSV) containing a list of songs.
 */
export const analyzeTracklistText = async (text: string): Promise<BulkSongEntry[]> => {
  const prompt = `
    Analyze this text. It contains a list of music tracks (Artist and Title).
    
    Tasks:
    1. Parse the text to extract every song Title and Artist.
    2. Based on your musical knowledge of these specific tracks, estimate the likely Genre, Subgenre, BPM, Camelot Key, and Musical Key for EACH track.
    
    GENRE RULES:
    - 'genre' field: Do NOT use broad terms like "Electronic". Use the specific parent genre.
    - 'subgenre' field: Be highly specific (e.g., "Deep Dubstep", "Liquid Funk", "Tech House").
    
    Return a strict JSON Array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      config: {
        systemInstruction: "You are a music librarian and sonic analyst. Your job is to digitize tracklists and enrich them with metadata.",
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
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              text: text
            }
          ]
        }
      ]
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from Gemini");
    
    return JSON.parse(responseText) as BulkSongEntry[];

  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
};
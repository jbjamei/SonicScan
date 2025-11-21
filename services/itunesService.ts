
import { Track } from "../types";

// iTunes Search API Endpoint
const ITUNES_API_URL = "https://itunes.apple.com/search";

export const searchTracks = async (query: string): Promise<Track[]> => {
  try {
    // Encode the query
    const term = encodeURIComponent(query);
    
    // Construct URL
    // limit=50: Increased to find specific tracks/remixes
    // media=music: Only music
    // entity=song: Only songs
    const url = `${ITUNES_API_URL}?term=${term}&media=music&entity=song&limit=50`;

    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Map iTunes results to our Track interface
    return data.results.map((item: any) => ({
      id: item.trackId,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      coverUrl: item.artworkUrl100?.replace('100x100', '300x300'), // Get higher res if possible
      previewUrl: item.previewUrl,
      primaryGenre: item.primaryGenreName // Capture the genre from iTunes
    }));

  } catch (error) {
    console.error("Failed to search tracks:", error);
    return [];
  }
};

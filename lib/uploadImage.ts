import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Upload an image from a local URI to Supabase Storage.
 * Uses expo-file-system + base64-arraybuffer for reliable React Native uploads.
 *
 * @param uri - Local file URI from ImagePicker
 * @param bucket - Supabase storage bucket name
 * @param path - File path within the bucket (e.g. "userId/avatar.jpg")
 * @returns Public URL of the uploaded file, or null on failure
 */
export async function uploadImage(
  uri: string,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn(`Upload error (${bucket}/${path}):`, error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    // Add cache buster to avoid stale cached images
    return `${urlData.publicUrl}?t=${Date.now()}`;
  } catch (e) {
    console.warn(`Upload failed (${bucket}/${path}):`, e);
    return null;
  }
}

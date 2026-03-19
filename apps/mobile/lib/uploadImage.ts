import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export async function uploadImage(uri: string, bucket: string, path: string): Promise<string | null> {
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
      console.error('Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Upload exception:', e);
    return null;
  }
}

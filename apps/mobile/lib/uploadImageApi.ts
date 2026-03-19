import * as FileSystem from 'expo-file-system';
import { api } from '@/services/api';

export async function uploadImageApi(
  uri: string,
  bucket: string,
  path: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { url } = await api.upload(base64, bucket, path, contentType);
    return url;
  } catch (e) {
    console.error('Upload exception:', e);
    return null;
  }
}

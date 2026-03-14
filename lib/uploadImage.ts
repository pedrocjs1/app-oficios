import { supabase } from './supabase';

/**
 * Upload an image from a local URI to Supabase Storage.
 * Uses React Native's FormData approach which is the most reliable method.
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
    // React Native FormData approach - most reliable for file uploads
    const fileName = path.split('/').pop() || 'photo.jpg';

    const formData = new FormData();
    formData.append('', {
      uri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, formData, {
        contentType: 'multipart/form-data',
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

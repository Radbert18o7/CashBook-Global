export async function uploadImage(base64Image: string, folder: string): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  form.append('upload_preset', uploadPreset);
  form.append('folder', folder);

  // Assume base64Image is raw base64 (no data: prefix). If it already includes it, Cloudinary accepts that too.
  form.append('file', base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Cloudinary upload succeeded but returned no secure_url.');
  return json.secure_url;
}

export async function deleteImage(publicId: string): Promise<void> {
  // Unsigned delete is not available without an API key (paid/credential). Scaffold as no-op.
  // Implement via a backend callable function later when you add proper credentials.
  void publicId;
}


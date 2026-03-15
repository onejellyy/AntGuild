import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../config/firebase';

/**
 * 이미지 URI를 Firebase Storage에 업로드하고 다운로드 URL 반환.
 * 경로: profileImages/{uid}/avatar.jpg
 *
 * fetch()는 React Native에서 file:// URI를 처리하지 못해
 * "network request failed"가 발생하므로 XMLHttpRequest로 blob 변환.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadProfileImage(uid: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const storage = getStorage(app);
  const imageRef = ref(storage, `profileImages/${uid}/avatar.jpg`);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(imageRef);
}

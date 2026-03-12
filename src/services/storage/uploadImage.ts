import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../config/firebase';

/**
 * 로컬 이미지 URI를 Firebase Storage에 업로드하고 다운로드 URL 반환.
 * 경로: profileImages/{uid}/avatar.jpg
 */
export async function uploadProfileImage(uid: string, localUri: string): Promise<string> {
  // fetch()는 Android의 content:// URI(자르기 후 반환)를 처리 못함 → XMLHttpRequest 사용
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('이미지 로드 실패'));
    xhr.responseType = 'blob';
    xhr.open('GET', localUri, true);
    xhr.send(null);
  });

  const storage = getStorage(app);
  const imageRef = ref(storage, `profileImages/${uid}/avatar.jpg`);
  await uploadBytes(imageRef, blob);
  return await getDownloadURL(imageRef);
}

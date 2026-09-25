import { getBlob, ref, uploadBytesResumable, type FirebaseStorage } from "firebase/storage";
import { toAppError } from "../errors";
import type { StorageConnector, UploadOptions } from "../types";

export class FirebaseStorageConnector implements StorageConnector {
  constructor(private readonly storage: FirebaseStorage) {}

  upload(path: string, file: Blob, options: UploadOptions) {
    const task = uploadBytesResumable(ref(this.storage, path), file, { contentType: options.contentType });
    const done = new Promise<{ path: string }>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) options.onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        (error) => reject(toAppError(error)),
        () => resolve({ path: task.snapshot.ref.fullPath }),
      );
    });
    return { done, cancel: () => void task.cancel() };
  }

  async download(path: string) {
    try {
      return await getBlob(ref(this.storage, path));
    } catch (error) {
      throw toAppError(error);
    }
  }
}

import { Readable } from 'stream';

export interface FileUploadResult {
  filename: string;
  path: string;
  url: string;
  size: number;
  checksum: string;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, path: string): Promise<FileUploadResult>;
  delete(path: string): Promise<void>;
  getStream(path: string): Promise<Readable>;
  getUrl(path: string): Promise<string>;
}

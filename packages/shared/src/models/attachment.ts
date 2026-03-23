export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentDisposition: 'attachment' | 'inline';
  cid?: string;
}

import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizerService {
  private readonly options: sanitizeHtml.IOptions = {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span',
      'b', 'i', 'u', 'em', 'strong', 'small', 'sub', 'sup',
      'blockquote', 'pre', 'code',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'a', 'img',
      'font', 'center',
    ],
    allowedAttributes: {
      '*': ['style', 'class', 'id', 'dir', 'lang'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'align', 'valign'],
      th: ['colspan', 'rowspan', 'align', 'valign'],
      font: ['color', 'size', 'face'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
    disallowedTagsMode: 'discard',
  };

  sanitize(html: string): string {
    return sanitizeHtml(html, this.options);
  }
}

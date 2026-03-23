import {
  Component,
  input,
  output,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  inject,
  signal,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [IconComponent],
  template: `
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1 bg-card/50">
      <button type="button" class="editor-btn" [class.is-active]="isActive('bold')" (click)="toggleBold()" title="Fett">
        <app-icon name="bold" [size]="14" />
      </button>
      <button type="button" class="editor-btn" [class.is-active]="isActive('italic')" (click)="toggleItalic()" title="Kursiv">
        <app-icon name="italic" [size]="14" />
      </button>
      <button type="button" class="editor-btn" [class.is-active]="isActive('underline')" (click)="toggleUnderline()" title="Unterstrichen">
        <app-icon name="underline" [size]="14" />
      </button>
      <button type="button" class="editor-btn" [class.is-active]="isActive('strike')" (click)="toggleStrike()" title="Durchgestrichen">
        <app-icon name="strikethrough" [size]="14" />
      </button>

      <div class="mx-1 h-4 w-px bg-border"></div>

      <button type="button" class="editor-btn" [class.is-active]="isActive('bulletList')" (click)="toggleBulletList()" title="Aufzählung">
        <app-icon name="list" [size]="14" />
      </button>
      <button type="button" class="editor-btn" [class.is-active]="isActive('orderedList')" (click)="toggleOrderedList()" title="Nummerierung">
        <app-icon name="list-ordered" [size]="14" />
      </button>

      <div class="mx-1 h-4 w-px bg-border"></div>

      <button type="button" class="editor-btn" [class.is-active]="isActive('blockquote')" (click)="toggleBlockquote()" title="Zitat">
        <app-icon name="quote" [size]="14" />
      </button>
      <button type="button" class="editor-btn" (click)="insertLink()" title="Link einfügen">
        <app-icon name="link" [size]="14" />
      </button>
      <button type="button" class="editor-btn" (click)="insertHorizontalRule()" title="Trennlinie">
        <app-icon name="minus" [size]="14" />
      </button>

      <div class="mx-1 h-4 w-px bg-border"></div>

      <button type="button" class="editor-btn" (click)="undo()" title="Rückgängig">
        <app-icon name="undo" [size]="14" />
      </button>
      <button type="button" class="editor-btn" (click)="redo()" title="Wiederholen">
        <app-icon name="redo" [size]="14" />
      </button>
    </div>

    <!-- Editor content -->
    <div #editorEl class="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[180px] max-h-[400px] overflow-y-auto focus:outline-none text-sm"></div>
  `,
  styles: [`
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
      background: var(--background);
    }
    .editor-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      color: var(--muted-foreground);
      transition: all 0.15s;
    }
    .editor-btn:hover {
      background: var(--accent);
      color: var(--foreground);
    }
    .editor-btn.is-active {
      background: var(--accent);
      color: var(--foreground);
    }
    :host ::ng-deep .tiptap p.is-editor-empty:first-child::before {
      color: var(--muted-foreground);
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
    :host ::ng-deep .tiptap {
      outline: none;
    }
    :host ::ng-deep .tiptap blockquote {
      border-left: 3px solid var(--border);
      padding-left: 1rem;
      color: var(--muted-foreground);
    }
  `],
})
export class RichEditorComponent implements OnInit, OnDestroy {
  initialContent = input<string>('');
  placeholder = input<string>('Nachricht schreiben...');
  contentChange = output<string>();

  private editorEl = viewChild.required<ElementRef<HTMLElement>>('editorEl');
  private editor: Editor | null = null;

  ngOnInit(): void {
    setTimeout(() => this.initEditor());
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  getHtml(): string {
    return this.editor?.getHTML() || '';
  }

  getText(): string {
    return this.editor?.getText() || '';
  }

  setContent(html: string): void {
    this.editor?.commands.setContent(html);
  }

  focus(): void {
    this.editor?.commands.focus();
  }

  isActive(name: string): boolean {
    return this.editor?.isActive(name) ?? false;
  }

  toggleBold(): void { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic(): void { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline(): void { this.editor?.chain().focus().toggleUnderline().run(); }
  toggleStrike(): void { this.editor?.chain().focus().toggleStrike().run(); }
  toggleBulletList(): void { this.editor?.chain().focus().toggleBulletList().run(); }
  toggleOrderedList(): void { this.editor?.chain().focus().toggleOrderedList().run(); }
  toggleBlockquote(): void { this.editor?.chain().focus().toggleBlockquote().run(); }
  insertHorizontalRule(): void { this.editor?.chain().focus().setHorizontalRule().run(); }
  undo(): void { this.editor?.chain().focus().undo().run(); }
  redo(): void { this.editor?.chain().focus().redo().run(); }

  insertLink(): void {
    const url = prompt('URL eingeben:');
    if (url) {
      this.editor?.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  }

  private initEditor(): void {
    this.editor = new Editor({
      element: this.editorEl().nativeElement,
      extensions: [
        StarterKit,
        Underline,
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        Placeholder.configure({ placeholder: this.placeholder() }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Image.configure({ inline: true }),
        TextStyle,
        Color,
      ],
      content: this.initialContent(),
      onUpdate: ({ editor }) => {
        this.contentChange.emit(editor.getHTML());
      },
    });
  }
}

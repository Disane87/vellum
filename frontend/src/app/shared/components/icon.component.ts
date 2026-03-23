import { Component, input, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';
import {
  Mail, Inbox, Send, FileText, Trash2, AlertTriangle, Archive, Folder,
  Search, Plus, Reply, ReplyAll, Forward, Star, Paperclip, Download,
  Check, X, ChevronLeft, ChevronRight, Settings, Menu, Moon, Sun,
  Loader2, MailOpen, MailPlus, RefreshCw, Eye, EyeOff, Lock, Shield,
  User, Server, Wifi, WifiOff, Info, AlertCircle, CheckCircle, XCircle,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  Link, Minus, Undo2, Redo2, Image, AlignLeft, AlignCenter, AlignRight,
  Clock, Flag, Tag, Hash, AtSign, Globe, ExternalLink, Copy,
  ChevronDown, ChevronUp, MoreHorizontal, Filter, SortAsc, SortDesc,
  Bell, BellOff, Maximize2, Minimize2, RotateCw,
  MessagesSquare, Calendar, Type, HardDrive, ArrowUpDown, ArrowUp, ArrowDown,
  Loader2 as Loader2Icon, Square,
  type IconNode,
} from 'lucide';

const ICON_MAP: Record<string, IconNode> = {
  mail: Mail,
  inbox: Inbox,
  send: Send,
  'file-text': FileText,
  trash: Trash2,
  'alert-triangle': AlertTriangle,
  archive: Archive,
  folder: Folder,
  search: Search,
  plus: Plus,
  reply: Reply,
  'reply-all': ReplyAll,
  forward: Forward,
  star: Star,
  paperclip: Paperclip,
  download: Download,
  check: Check,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  settings: Settings,
  menu: Menu,
  moon: Moon,
  sun: Sun,
  loader: Loader2,
  'mail-open': MailOpen,
  'mail-plus': MailPlus,
  refresh: RefreshCw,
  eye: Eye,
  'eye-off': EyeOff,
  lock: Lock,
  shield: Shield,
  user: User,
  server: Server,
  wifi: Wifi,
  'wifi-off': WifiOff,
  info: Info,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  // Editor icons
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  list: List,
  'list-ordered': ListOrdered,
  quote: Quote,
  link: Link,
  minus: Minus,
  undo: Undo2,
  redo: Redo2,
  image: Image,
  'align-left': AlignLeft,
  'align-center': AlignCenter,
  'align-right': AlignRight,
  // Extra
  clock: Clock,
  flag: Flag,
  tag: Tag,
  hash: Hash,
  'at-sign': AtSign,
  globe: Globe,
  'external-link': ExternalLink,
  copy: Copy,
  'more-horizontal': MoreHorizontal,
  filter: Filter,
  'sort-asc': SortAsc,
  'sort-desc': SortDesc,
  bell: Bell,
  'bell-off': BellOff,
  maximize: Maximize2,
  minimize: Minimize2,
  'rotate-cw': RotateCw,
  'messages-square': MessagesSquare,
  calendar: Calendar,
  text: Type,
  'hard-drive': HardDrive,
  'arrow-up-down': ArrowUpDown,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'loader-2': Loader2Icon,
  square: Square,
};

function renderIcon(node: IconNode): string {
  // Lucide IconNode is an array of [tag, attrs] tuples
  let svg = '';
  for (const element of node) {
    if (Array.isArray(element)) {
      const [tag, attrs] = element as [string, Record<string, string>];
      const attrStr = Object.entries(attrs || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      svg += `<${tag} ${attrStr} />`;
    }
  }
  return svg;
}

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [innerHTML]="svgContent()"
    ></svg>
  `,
  host: {
    class: 'inline-flex shrink-0',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class IconComponent {
  name = input.required<string>();
  size = input(16);
  strokeWidth = input(2);

  private readonly sanitizer = inject(DomSanitizer);

  svgContent = computed(() => {
    const iconNode = ICON_MAP[this.name()];
    if (!iconNode) return this.sanitizer.bypassSecurityTrustHtml('');
    return this.sanitizer.bypassSecurityTrustHtml(renderIcon(iconNode));
  });
}

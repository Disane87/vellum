import { Injectable } from '@angular/core';
import { EventManager } from '@angular/platform-browser';

@Injectable()
export class ZardDebounceEventManagerPlugin {
  manager!: EventManager;

  supports(eventName: string): boolean {
    return eventName.includes('.debounce');
  }

  addEventListener(element: HTMLElement, eventName: string, handler: Function): Function {
    const parts = eventName.split('.');
    const baseEvent = parts[0];
    const debounceIndex = parts.indexOf('debounce');
    const delay = debounceIndex < parts.length - 1 ? parseInt(parts[debounceIndex + 1], 10) : 300;

    let timeoutId: ReturnType<typeof setTimeout>;

    const wrappedHandler = (event: Event) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handler(event), isNaN(delay) ? 300 : delay);
    };

    element.addEventListener(baseEvent, wrappedHandler);
    return () => {
      clearTimeout(timeoutId);
      element.removeEventListener(baseEvent, wrappedHandler);
    };
  }
}

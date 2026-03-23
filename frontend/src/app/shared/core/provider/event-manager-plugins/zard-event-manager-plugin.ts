import { Injectable } from '@angular/core';
import { EventManager } from '@angular/platform-browser';

@Injectable()
export class ZardEventManagerPlugin {
  manager!: EventManager;

  supports(eventName: string): boolean {
    return eventName.includes('.prevent') || eventName.includes('.stop');
  }

  addEventListener(element: HTMLElement, eventName: string, handler: Function): Function {
    const [baseEvent, ...modifiers] = eventName.split('.');

    const wrappedHandler = (event: Event) => {
      if (modifiers.includes('prevent')) {
        event.preventDefault();
      }
      if (modifiers.includes('stop')) {
        event.stopPropagation();
      }
      handler(event);
    };

    element.addEventListener(baseEvent, wrappedHandler);
    return () => element.removeEventListener(baseEvent, wrappedHandler);
  }
}

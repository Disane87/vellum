import { EVENT_MANAGER_PLUGINS } from '@angular/platform-browser';
import { ZardEventManagerPlugin } from './event-manager-plugins/zard-event-manager-plugin';
import { ZardDebounceEventManagerPlugin } from './event-manager-plugins/zard-debounce-event-manager-plugin';

export function provideZard() {
  return [
    { provide: EVENT_MANAGER_PLUGINS, useClass: ZardEventManagerPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: ZardDebounceEventManagerPlugin, multi: true },
  ];
}

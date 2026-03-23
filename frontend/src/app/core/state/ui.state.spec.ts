import { TestBed } from '@angular/core/testing';
import { UiState } from './ui.state';

describe('UiState', () => {
  let state: UiState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(UiState);
  });

  it('should have dark theme by default', () => {
    expect(state.theme()).toBe('dark');
  });

  it('should toggle sidebar', () => {
    expect(state.sidebarCollapsed()).toBe(false);
    state.toggleSidebar();
    expect(state.sidebarCollapsed()).toBe(true);
  });

  it('should open composer with mode', () => {
    state.openComposer('reply');
    expect(state.composerOpen()).toBe(true);
    expect(state.composerMode()).toBe('reply');
  });

  it('should close composer', () => {
    state.openComposer();
    state.closeComposer();
    expect(state.composerOpen()).toBe(false);
  });

  it('should toggle theme', () => {
    state.toggleTheme();
    expect(state.theme()).toBe('light');
    state.toggleTheme();
    expect(state.theme()).toBe('dark');
  });

  it('should set search query', () => {
    state.setSearchQuery({ text: 'hello' });
    expect(state.searchQuery()?.text).toBe('hello');
    state.setSearchQuery(null);
    expect(state.searchQuery()).toBeNull();
  });
});

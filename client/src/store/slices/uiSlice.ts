import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  globalSearchOpen: boolean;
  commandPaletteOpen: boolean;
  activeModal: string | null;
  breadcrumbs: { label: string; href?: string }[];
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: (localStorage.getItem('workos-theme') as 'dark' | 'light') || 'dark',
  globalSearchOpen: false,
  commandPaletteOpen: false,
  activeModal: null,
  breadcrumbs: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
      localStorage.setItem('workos-theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('workos-theme', state.theme);
    },
    setGlobalSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.globalSearchOpen = action.payload;
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.commandPaletteOpen = action.payload;
    },
    setActiveModal: (state, action: PayloadAction<string | null>) => {
      state.activeModal = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<{ label: string; href?: string }[]>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  setTheme,
  toggleTheme,
  setGlobalSearchOpen,
  setCommandPaletteOpen,
  setActiveModal,
  setBreadcrumbs,
} = uiSlice.actions;

export default uiSlice.reducer;

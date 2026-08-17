import { create } from "zustand";

export const useAppStore = create((set) => ({
  theme: "system",
  isMaintenance: false,

  setTheme: (theme) => set({ theme }),
  setIsMaintenance: (isMaintenance) => set({ isMaintenance }),
}));

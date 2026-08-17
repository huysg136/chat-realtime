import { create } from "zustand";
import app, { rtdb } from "../firebase/config";
import { getAuth } from "firebase/auth";
import { ref, set as rtdbSet } from "firebase/database";

const auth = getAuth(app);

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  currentUserDocId: null,

  setUser: (userOrUpdater) =>
    set((state) => ({
      user: typeof userOrUpdater === "function" ? userOrUpdater(state.user) : userOrUpdater,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setCurrentUserDocId: (currentUserDocId) => set({ currentUserDocId }),

  updateStatus: async (isOnline) => {
    const userDocId = get().currentUserDocId;
    if (!userDocId) return;
    const statusRef = ref(rtdb, `userStatuses/${userDocId}`);
    const now = Date.now();
    try {
      await rtdbSet(statusRef, {
        lastOnline: now,
        lastHeartbeat: now,
        isOnline,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  },

  logout: async () => {
    try {
      const { updateStatus } = get();
      await updateStatus(false);
      await auth.signOut();
      set({ user: null, currentUserDocId: null, isLoading: false });
    } catch (err) {
      console.error("Logout error:", err);
    }
  },
}));

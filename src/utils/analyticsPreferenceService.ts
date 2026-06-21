import { SheetsSyncEngine } from "./sheetsSync";

export const AnalyticsPreferenceService = {
  getCurrentUsername(): string {
    try {
      const activeUser = SheetsSyncEngine.getCurrentUser();
      return activeUser?.username || "anonymous";
    } catch {
      return "anonymous";
    }
  },

  saveChartPreference(page: string, chartType: string): void {
    const username = this.getCurrentUsername();
    try {
      localStorage.setItem(`pref_${username}_${page}_chart`, chartType);
    } catch (e) {
      console.error("Failed to save chart preference", e);
    }
  },

  loadChartPreference(page: string, defaultVal: string = "Line"): string {
    const username = this.getCurrentUsername();
    try {
      return localStorage.getItem(`pref_${username}_${page}_chart`) || defaultVal;
    } catch (e) {
      return defaultVal;
    }
  },

  saveDateRangePreference(page: string, dateRange: string): void {
    const username = this.getCurrentUsername();
    try {
      localStorage.setItem(`pref_${username}_${page}_dateRange`, dateRange);
    } catch (e) {
      console.error("Failed to save date range preference", e);
    }
  },

  loadDateRangePreference(page: string, defaultVal: string = "This Month"): string {
    const username = this.getCurrentUsername();
    try {
      return localStorage.getItem(`pref_${username}_${page}_dateRange`) || defaultVal;
    } catch (e) {
      return defaultVal;
    }
  },

  saveGroupingPreference(page: string, grouping: string): void {
    const username = this.getCurrentUsername();
    try {
      localStorage.setItem(`pref_${username}_${page}_grouping`, grouping);
    } catch (e) {
      console.error("Failed to save grouping preference", e);
    }
  },

  loadGroupingPreference(page: string, defaultVal: string = "Monthly"): string {
    const username = this.getCurrentUsername();
    try {
      return localStorage.getItem(`pref_${username}_${page}_grouping`) || defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }
};

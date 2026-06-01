export const VIEW_TYPE_TRAVELLER_TOOLKIT = "traveller-toolkit-view";

export type ToolViewState = {
  activeTool?: string;
  loadActiveNote?: boolean;
  [key: string]: any;
};

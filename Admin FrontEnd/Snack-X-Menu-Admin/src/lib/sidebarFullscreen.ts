export const FULLSCREEN_BOARD_ROUTE = "/orders";

export function isFullscreenBoardRoute(path: string): boolean {
  return path === FULLSCREEN_BOARD_ROUTE;
}

export interface SidebarNavState {
  collapsed: boolean;
  saved: boolean | null;
}

export function transitionSidebarOnNav(
  prevPath: string,
  nextPath: string,
  state: SidebarNavState
): SidebarNavState {
  const wasInBoard = isFullscreenBoardRoute(prevPath);
  const nowInBoard = isFullscreenBoardRoute(nextPath);

  if (nowInBoard && !wasInBoard) {
    return { collapsed: true, saved: state.collapsed };
  }
  if (wasInBoard && !nowInBoard) {
    return { collapsed: state.saved ?? false, saved: null };
  }
  return state;
}
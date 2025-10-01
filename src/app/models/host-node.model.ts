export interface HostNode {
  uid?: string | number;
  comp?: {
    tagName?: string;
    componentType?: string;
    name?: string;
    isFreeze?: unknown;
  };
  props?: {
    display_picture?: { src?: string };
    display_text?: string;
    display_button?: { label?: string; link?: string; active?: boolean };
    children?: HostNode[];
  } | null;
  [key: string]: unknown;
}

export interface MoveEvent {
  path: number[];
  index: number;
}

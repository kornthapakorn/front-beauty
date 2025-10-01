export interface ComponentDto {
  componentId: number;
  name: string;
  tagName: string;
  [key: string]: string | number | boolean | undefined;
}


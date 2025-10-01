export interface FormComponentTemplateDto {
  id: number;
  formTemplateId: number;
  isDelete: boolean;
  componentType: string;

  singleSelection?: SingleSelectionDto;
  textField?: TextFieldDto;
  date?: DateDto;
  birthDate?: BirthDateDto;
  imageUpload?: ImageUploadDto;
  imageUploadWithImageContent?: ImageUploadWithImageContentDto;
  formButton?: FormButtonDto;
}

export interface SingleSelectionDto {
  value?: string;
}

export interface TextFieldDto {
  text?: string;
}

export interface DateDto {
  text?: string;
}

export interface BirthDateDto {
  label?: string;
}

export interface ImageUploadDto {
  text?: string;
}

export interface ImageUploadWithImageContentDto {
  textDesc?: string;
  image?: string;
}

export interface FormButtonDto {
  textOnButton?: string;
  isActive: boolean;
  url?: string;
}

// ==== Template ====
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

export interface SingleSelectionDto { value?: string }
export interface TextFieldDto { text?: string }
export interface DateDto { text?: string }
export interface BirthDateDto { label?: string }
export interface ImageUploadDto { text?: string }
export interface ImageUploadWithImageContentDto { textDesc?: string; image?: string }
export interface FormButtonDto { textOnButton?: string; isActive: boolean; url?: string }

// ==== Submit ====
export interface FormSubmitDto {
  formId: number;
  components: FormComponentSubmitDto[];
}

export interface FormComponentSubmitDto {
  formComponentId: number;
  value?: string;
  isActive?: boolean;
  filePath?: string;
}

export interface FormSubmitCreateDto {
  formTemplateId: number;
  components: FormComponentSubmitCreateDto[];
}

export interface FormComponentSubmitCreateDto {
  formComponentId?: number;
  formComponentTemplateId?: number;
  componentType: string;
  value?: string;
  isActive?: boolean;
  filePath?: string;
}

// ==== Result ====
export interface TextFieldResultCreateDto { value: string }
export interface DateResultCreateDto { value: string }
export interface BirthDateResultCreateDto { value: string }
export interface SingleSelectionResultCreateDto { isActive: boolean }
export interface ImageUploadResultCreateDto { filePath: string }
export interface ImageUploadWithImageContentResultCreateDto { filePath: string }

export interface TextFieldResultDto { id: number; value: string }
export interface DateResultDto { id: number; value: string }
export interface BirthDateResultDto { id: number; value: string }
export interface SingleSelectionResultDto { id: number; isActive: boolean }
export interface ImageUploadResultDto { id: number; filePath: string }
export interface ImageUploadWithImageContentResultDto { id: number; filePath: string }

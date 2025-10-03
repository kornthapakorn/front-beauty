export {
  FormComponentTemplateDto,
  SingleSelectionDto,
  TextFieldDto,
  DateDto,
  BirthDateDto,
  ImageUploadDto,
  ImageUploadWithImageContentDto,
  FormButtonDto
} from './form-component';

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

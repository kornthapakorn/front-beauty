export type FormComponentType =
  | 'singleSelection'
  | 'textField'
  | 'date'
  | 'birthDate'
  | 'imageUpload'
  | 'imageUploadWithImageContent'
  | 'formButton';

export interface FormComponentTemplateDto {
  id: number;
  formTemplateId: number;
  isDelete: boolean;
  componentType: FormComponentType;

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
  options?: string[];
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

export interface FormComponentPaletteItem {
  type: FormComponentType;
  label: string;
  description?: string;
  icon: string;
}

export const FORM_COMPONENT_PALETTE: ReadonlyArray<FormComponentPaletteItem> = [
  { type: 'singleSelection', label: 'Single selection', icon: 'assets/icons/singleselection.png' },
  { type: 'textField', label: 'Text field', icon: 'assets/icons/textfield.png' },
  { type: 'date', label: 'Date', icon: 'assets/icons/date.png' },
  { type: 'birthDate', label: 'Birth date', icon: 'assets/icons/birthdate.png' },
  { type: 'imageUpload', label: 'Image upload', icon: 'assets/icons/imageupload.png' },
  { type: 'imageUploadWithImageContent', label: 'Image upload with image content', icon: 'assets/icons/imageuploadwithimagecontent.png' },
  { type: 'formButton', label: 'Button', icon: 'assets/icons/buttonform.png' }
];

export function createDefaultFormComponent(templateId: number, type: FormComponentType): FormComponentTemplateDto {
  switch (type) {
    case 'singleSelection':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'singleSelection',
        singleSelection: { value: '', options: [] }
      };
    case 'textField':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'textField',
        textField: { text: '' }
      };
    case 'date':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'date',
        date: { text: '' }
      };
    case 'birthDate':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'birthDate',
        birthDate: { label: '' }
      };
    case 'imageUpload':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'imageUpload',
        imageUpload: { text: '' }
      };
    case 'imageUploadWithImageContent':
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'imageUploadWithImageContent',
        imageUploadWithImageContent: { textDesc: '', image: '' }
      };
    case 'formButton':
    default:
      return {
        id: 0,
        formTemplateId: templateId,
        isDelete: false,
        componentType: 'formButton',
        formButton: { textOnButton: 'Button', isActive: true, url: '' }
      };
  }
}






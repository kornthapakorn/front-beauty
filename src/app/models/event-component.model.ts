export interface EventComponentDto {
  id: number;
  componentType: string;
  sortOrder: number;
  isOutPage: boolean;

  aboutU?: AboutUDto;
  banner?: BannerDto;
  button?: ButtonDto;
  formTemplate?: FormTemplateDto;
  gridFourImage?: GridFourImageDto;
  gridTwoColumn?: GridTwoColumnDto;
  imageDesc?: ImageDescDto;
  imageWithCaption?: ImageWithCaptionDto;
  oneTopicImageCaptionButton?: OneTopicImageCaptionButtonDto;
  sale?: SaleDto;
  section?: SectionDto;
  tableWithTopicAndDesc?: TableWithTopicAndDescDto;
  textBox?: TextBoxDto;
  twoTopicImageCaptionButton?: TwoTopicImageCaptionButtonDto;
}

export interface AboutUDto {
  imageTopic?: string;
  textTopic?: string;
  textDesc?: string;
  leftImage?: string;
  leftText?: string;
  leftUrl?: string;
  rightImage?: string;
  rightText?: string;
  rightUrl?: string;
}

export interface BannerDto {
  image?: string;
  textDesc?: string;
  textOnButton?: string;
  isActive: boolean;
  urlButton?: string;
}

export interface ButtonDto {
  textOnButton?: string;
  isActive: boolean;
  url?: string;
}

export interface FormTemplateDto {
  topic: string;
  textOnButton?: string;
  popupImage?: string;
  popupText?: string;
}

export interface GridFourImageDto {
  image1?: string;
  image2?: string;
  image3?: string;
  image4?: string;
}

export interface GridTwoColumnDto {
  leftImage?: string;
  leftText?: string;
  leftUrl?: string;
  rightImage?: string;
  rightText?: string;
  rightUrl?: string;
}

export interface ImageDescDto {
  image?: string;
  text?: string;
}

export interface ImageWithCaptionDto {
  image?: string;
  text?: string;
}

export interface OneTopicImageCaptionButtonDto {
  title?: string;
  image?: string;
  textDesc?: string;
  textOnButton?: string;
  isActive: boolean;
  url?: string;
}

export interface SaleDto {
  title?: string;
  text?: string;
  promoPrice?: number;
  price?: number;
  endDate?: string;
  textDesc?: string;
  textOnButton?: string;
  textFooter?: string;
  leftImage?: string;
  leftText?: string;
  rightImage?: string;
  rightText?: string;
  isActive: boolean;
  url?: string;
}

export interface SectionDto {}

export interface TableWithTopicAndDescDto {
  title?: string;
  textDesc?: string;
}

export interface TextBoxDto {
  text?: string;
}

export interface TwoTopicImageCaptionButtonDto {
  leftTitle?: string;
  leftImage?: string;
  leftTextDesc?: string;
  leftTextOnButton?: string;
  leftIsActive: boolean;
  leftUrl?: string;
  rightTitle?: string;
  rightImage?: string;
  rightTextDesc?: string;
  rightTextOnButton?: string;
  rightIsActive: boolean;
  rightUrl?: string;
}

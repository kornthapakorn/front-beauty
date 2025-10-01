// models/contact.model.ts
export type ContactId = string | number;

export interface ContactPictureDto {
  id?: ContactId | null;
  imageId: string;
  url: string;
}

export interface ContactDto {
  id?: ContactId | null;
  title: string;
  pictures: ContactPictureDto[];
}

export interface ContactUserViewLink {
  id?: ContactId | null;
  image: string;
  url: string;
}

export interface ContactUserView {
  id?: ContactId | null;
  contactId?: ContactId | null;
  title: string;
  links: ContactUserViewLink[];
}

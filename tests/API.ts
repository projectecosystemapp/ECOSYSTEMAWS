/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Booking = {
  __typename: "Booking",
  createdAt: string,
  customerEmail: string,
  id: string,
  notes?: string | null,
  owner?: string | null,
  providerEmail: string,
  scheduledDate: string,
  scheduledTime: string,
  serviceId: string,
  status?: BookingStatus | null,
  totalAmount: number,
  updatedAt: string,
};

export enum BookingStatus {
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  CONFIRMED = "CONFIRMED",
  PENDING = "PENDING",
}


export type Message = {
  __typename: "Message",
  bookingId?: string | null,
  content: string,
  conversationId: string,
  createdAt: string,
  id: string,
  owner?: string | null,
  read?: boolean | null,
  recipientEmail: string,
  senderEmail: string,
  serviceId?: string | null,
  updatedAt: string,
};

export type Provider = {
  __typename: "Provider",
  active?: boolean | null,
  address?: string | null,
  businessName?: string | null,
  city?: string | null,
  createdAt: string,
  email: string,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  owner?: string | null,
  phone?: string | null,
  state?: string | null,
  stripeAccountId?: string | null,
  stripeOnboardingComplete?: boolean | null,
  updatedAt: string,
  verificationStatus?: ProviderVerificationStatus | null,
  zipCode?: string | null,
};

export enum ProviderVerificationStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
}


export type Review = {
  __typename: "Review",
  bookingId: string,
  comment?: string | null,
  createdAt?: string | null,
  customerEmail: string,
  id: string,
  owner?: string | null,
  providerEmail: string,
  providerResponse?: string | null,
  rating: number,
  serviceId: string,
  updatedAt: string,
};

export type Service = {
  __typename: "Service",
  active?: boolean | null,
  category?: string | null,
  createdAt: string,
  description: string,
  duration?: number | null,
  id: string,
  owner?: string | null,
  price: number,
  providerEmail?: string | null,
  providerName?: string | null,
  title: string,
  updatedAt: string,
};

export type UserProfile = {
  __typename: "UserProfile",
  city?: string | null,
  createdAt: string,
  email: string,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  owner?: string | null,
  phone?: string | null,
  profilePicture?: string | null,
  role?: UserProfileRole | null,
  state?: string | null,
  updatedAt: string,
};

export enum UserProfileRole {
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
  PROVIDER = "PROVIDER",
}


export type ModelBookingFilterInput = {
  and?: Array< ModelBookingFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  customerEmail?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelBookingFilterInput | null,
  notes?: ModelStringInput | null,
  or?: Array< ModelBookingFilterInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelStringInput | null,
  scheduledDate?: ModelStringInput | null,
  scheduledTime?: ModelStringInput | null,
  serviceId?: ModelIDInput | null,
  status?: ModelBookingStatusInput | null,
  totalAmount?: ModelFloatInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelBookingStatusInput = {
  eq?: BookingStatus | null,
  ne?: BookingStatus | null,
};

export type ModelFloatInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelBookingConnection = {
  __typename: "ModelBookingConnection",
  items:  Array<Booking | null >,
  nextToken?: string | null,
};

export type ModelMessageFilterInput = {
  and?: Array< ModelMessageFilterInput | null > | null,
  bookingId?: ModelIDInput | null,
  content?: ModelStringInput | null,
  conversationId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelMessageFilterInput | null,
  or?: Array< ModelMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  read?: ModelBooleanInput | null,
  recipientEmail?: ModelStringInput | null,
  senderEmail?: ModelStringInput | null,
  serviceId?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelMessageConnection = {
  __typename: "ModelMessageConnection",
  items:  Array<Message | null >,
  nextToken?: string | null,
};

export type ModelProviderFilterInput = {
  active?: ModelBooleanInput | null,
  address?: ModelStringInput | null,
  and?: Array< ModelProviderFilterInput | null > | null,
  businessName?: ModelStringInput | null,
  city?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  id?: ModelIDInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelProviderFilterInput | null,
  or?: Array< ModelProviderFilterInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelStringInput | null,
  state?: ModelStringInput | null,
  stripeAccountId?: ModelStringInput | null,
  stripeOnboardingComplete?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  verificationStatus?: ModelProviderVerificationStatusInput | null,
  zipCode?: ModelStringInput | null,
};

export type ModelProviderVerificationStatusInput = {
  eq?: ProviderVerificationStatus | null,
  ne?: ProviderVerificationStatus | null,
};

export type ModelProviderConnection = {
  __typename: "ModelProviderConnection",
  items:  Array<Provider | null >,
  nextToken?: string | null,
};

export type ModelReviewFilterInput = {
  and?: Array< ModelReviewFilterInput | null > | null,
  bookingId?: ModelIDInput | null,
  comment?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  customerEmail?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelReviewFilterInput | null,
  or?: Array< ModelReviewFilterInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelStringInput | null,
  providerResponse?: ModelStringInput | null,
  rating?: ModelIntInput | null,
  serviceId?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIntInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelReviewConnection = {
  __typename: "ModelReviewConnection",
  items:  Array<Review | null >,
  nextToken?: string | null,
};

export type ModelServiceFilterInput = {
  active?: ModelBooleanInput | null,
  and?: Array< ModelServiceFilterInput | null > | null,
  category?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  duration?: ModelIntInput | null,
  id?: ModelIDInput | null,
  not?: ModelServiceFilterInput | null,
  or?: Array< ModelServiceFilterInput | null > | null,
  owner?: ModelStringInput | null,
  price?: ModelFloatInput | null,
  providerEmail?: ModelStringInput | null,
  providerName?: ModelStringInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelServiceConnection = {
  __typename: "ModelServiceConnection",
  items:  Array<Service | null >,
  nextToken?: string | null,
};

export type ModelUserProfileFilterInput = {
  and?: Array< ModelUserProfileFilterInput | null > | null,
  city?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  id?: ModelIDInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelUserProfileFilterInput | null,
  or?: Array< ModelUserProfileFilterInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelStringInput | null,
  profilePicture?: ModelStringInput | null,
  role?: ModelUserProfileRoleInput | null,
  state?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelUserProfileRoleInput = {
  eq?: UserProfileRole | null,
  ne?: UserProfileRole | null,
};

export type ModelUserProfileConnection = {
  __typename: "ModelUserProfileConnection",
  items:  Array<UserProfile | null >,
  nextToken?: string | null,
};

export type ModelBookingConditionInput = {
  and?: Array< ModelBookingConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  customerEmail?: ModelStringInput | null,
  not?: ModelBookingConditionInput | null,
  notes?: ModelStringInput | null,
  or?: Array< ModelBookingConditionInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelStringInput | null,
  scheduledDate?: ModelStringInput | null,
  scheduledTime?: ModelStringInput | null,
  serviceId?: ModelIDInput | null,
  status?: ModelBookingStatusInput | null,
  totalAmount?: ModelFloatInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateBookingInput = {
  customerEmail: string,
  id?: string | null,
  notes?: string | null,
  providerEmail: string,
  scheduledDate: string,
  scheduledTime: string,
  serviceId: string,
  status?: BookingStatus | null,
  totalAmount: number,
};

export type ModelMessageConditionInput = {
  and?: Array< ModelMessageConditionInput | null > | null,
  bookingId?: ModelIDInput | null,
  content?: ModelStringInput | null,
  conversationId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  not?: ModelMessageConditionInput | null,
  or?: Array< ModelMessageConditionInput | null > | null,
  owner?: ModelStringInput | null,
  read?: ModelBooleanInput | null,
  recipientEmail?: ModelStringInput | null,
  senderEmail?: ModelStringInput | null,
  serviceId?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateMessageInput = {
  bookingId?: string | null,
  content: string,
  conversationId: string,
  id?: string | null,
  read?: boolean | null,
  recipientEmail: string,
  senderEmail: string,
  serviceId?: string | null,
};

export type ModelProviderConditionInput = {
  active?: ModelBooleanInput | null,
  address?: ModelStringInput | null,
  and?: Array< ModelProviderConditionInput | null > | null,
  businessName?: ModelStringInput | null,
  city?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelProviderConditionInput | null,
  or?: Array< ModelProviderConditionInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelStringInput | null,
  state?: ModelStringInput | null,
  stripeAccountId?: ModelStringInput | null,
  stripeOnboardingComplete?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  verificationStatus?: ModelProviderVerificationStatusInput | null,
  zipCode?: ModelStringInput | null,
};

export type CreateProviderInput = {
  active?: boolean | null,
  address?: string | null,
  businessName?: string | null,
  city?: string | null,
  email: string,
  firstName?: string | null,
  id?: string | null,
  lastName?: string | null,
  phone?: string | null,
  state?: string | null,
  stripeAccountId?: string | null,
  stripeOnboardingComplete?: boolean | null,
  verificationStatus?: ProviderVerificationStatus | null,
  zipCode?: string | null,
};

export type ModelReviewConditionInput = {
  and?: Array< ModelReviewConditionInput | null > | null,
  bookingId?: ModelIDInput | null,
  comment?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  customerEmail?: ModelStringInput | null,
  not?: ModelReviewConditionInput | null,
  or?: Array< ModelReviewConditionInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelStringInput | null,
  providerResponse?: ModelStringInput | null,
  rating?: ModelIntInput | null,
  serviceId?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateReviewInput = {
  bookingId: string,
  comment?: string | null,
  createdAt?: string | null,
  customerEmail: string,
  id?: string | null,
  providerEmail: string,
  providerResponse?: string | null,
  rating: number,
  serviceId: string,
};

export type ModelServiceConditionInput = {
  active?: ModelBooleanInput | null,
  and?: Array< ModelServiceConditionInput | null > | null,
  category?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  duration?: ModelIntInput | null,
  not?: ModelServiceConditionInput | null,
  or?: Array< ModelServiceConditionInput | null > | null,
  owner?: ModelStringInput | null,
  price?: ModelFloatInput | null,
  providerEmail?: ModelStringInput | null,
  providerName?: ModelStringInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateServiceInput = {
  active?: boolean | null,
  category?: string | null,
  description: string,
  duration?: number | null,
  id?: string | null,
  price: number,
  providerEmail?: string | null,
  providerName?: string | null,
  title: string,
};

export type ModelUserProfileConditionInput = {
  and?: Array< ModelUserProfileConditionInput | null > | null,
  city?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelUserProfileConditionInput | null,
  or?: Array< ModelUserProfileConditionInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelStringInput | null,
  profilePicture?: ModelStringInput | null,
  role?: ModelUserProfileRoleInput | null,
  state?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateUserProfileInput = {
  city?: string | null,
  email: string,
  firstName?: string | null,
  id?: string | null,
  lastName?: string | null,
  phone?: string | null,
  profilePicture?: string | null,
  role?: UserProfileRole | null,
  state?: string | null,
};

export type DeleteBookingInput = {
  id: string,
};

export type DeleteMessageInput = {
  id: string,
};

export type DeleteProviderInput = {
  id: string,
};

export type DeleteReviewInput = {
  id: string,
};

export type DeleteServiceInput = {
  id: string,
};

export type DeleteUserProfileInput = {
  id: string,
};

export type UpdateBookingInput = {
  customerEmail?: string | null,
  id: string,
  notes?: string | null,
  providerEmail?: string | null,
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  serviceId?: string | null,
  status?: BookingStatus | null,
  totalAmount?: number | null,
};

export type UpdateMessageInput = {
  bookingId?: string | null,
  content?: string | null,
  conversationId?: string | null,
  id: string,
  read?: boolean | null,
  recipientEmail?: string | null,
  senderEmail?: string | null,
  serviceId?: string | null,
};

export type UpdateProviderInput = {
  active?: boolean | null,
  address?: string | null,
  businessName?: string | null,
  city?: string | null,
  email?: string | null,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  phone?: string | null,
  state?: string | null,
  stripeAccountId?: string | null,
  stripeOnboardingComplete?: boolean | null,
  verificationStatus?: ProviderVerificationStatus | null,
  zipCode?: string | null,
};

export type UpdateReviewInput = {
  bookingId?: string | null,
  comment?: string | null,
  createdAt?: string | null,
  customerEmail?: string | null,
  id: string,
  providerEmail?: string | null,
  providerResponse?: string | null,
  rating?: number | null,
  serviceId?: string | null,
};

export type UpdateServiceInput = {
  active?: boolean | null,
  category?: string | null,
  description?: string | null,
  duration?: number | null,
  id: string,
  price?: number | null,
  providerEmail?: string | null,
  providerName?: string | null,
  title?: string | null,
};

export type UpdateUserProfileInput = {
  city?: string | null,
  email?: string | null,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  phone?: string | null,
  profilePicture?: string | null,
  role?: UserProfileRole | null,
  state?: string | null,
};

export type ModelSubscriptionBookingFilterInput = {
  and?: Array< ModelSubscriptionBookingFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  customerEmail?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  notes?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionBookingFilterInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelSubscriptionStringInput | null,
  scheduledDate?: ModelSubscriptionStringInput | null,
  scheduledTime?: ModelSubscriptionStringInput | null,
  serviceId?: ModelSubscriptionIDInput | null,
  status?: ModelSubscriptionStringInput | null,
  totalAmount?: ModelSubscriptionFloatInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionFloatInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionMessageFilterInput = {
  and?: Array< ModelSubscriptionMessageFilterInput | null > | null,
  bookingId?: ModelSubscriptionIDInput | null,
  content?: ModelSubscriptionStringInput | null,
  conversationId?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  read?: ModelSubscriptionBooleanInput | null,
  recipientEmail?: ModelSubscriptionStringInput | null,
  senderEmail?: ModelSubscriptionStringInput | null,
  serviceId?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionProviderFilterInput = {
  active?: ModelSubscriptionBooleanInput | null,
  address?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionProviderFilterInput | null > | null,
  businessName?: ModelSubscriptionStringInput | null,
  city?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  email?: ModelSubscriptionStringInput | null,
  firstName?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  lastName?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionProviderFilterInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelSubscriptionStringInput | null,
  state?: ModelSubscriptionStringInput | null,
  stripeAccountId?: ModelSubscriptionStringInput | null,
  stripeOnboardingComplete?: ModelSubscriptionBooleanInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  verificationStatus?: ModelSubscriptionStringInput | null,
  zipCode?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionReviewFilterInput = {
  and?: Array< ModelSubscriptionReviewFilterInput | null > | null,
  bookingId?: ModelSubscriptionIDInput | null,
  comment?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  customerEmail?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionReviewFilterInput | null > | null,
  owner?: ModelStringInput | null,
  providerEmail?: ModelSubscriptionStringInput | null,
  providerResponse?: ModelSubscriptionStringInput | null,
  rating?: ModelSubscriptionIntInput | null,
  serviceId?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionIntInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionServiceFilterInput = {
  active?: ModelSubscriptionBooleanInput | null,
  and?: Array< ModelSubscriptionServiceFilterInput | null > | null,
  category?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  duration?: ModelSubscriptionIntInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionServiceFilterInput | null > | null,
  owner?: ModelStringInput | null,
  price?: ModelSubscriptionFloatInput | null,
  providerEmail?: ModelSubscriptionStringInput | null,
  providerName?: ModelSubscriptionStringInput | null,
  title?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionUserProfileFilterInput = {
  and?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  city?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  email?: ModelSubscriptionStringInput | null,
  firstName?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  lastName?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  owner?: ModelStringInput | null,
  phone?: ModelSubscriptionStringInput | null,
  profilePicture?: ModelSubscriptionStringInput | null,
  role?: ModelSubscriptionStringInput | null,
  state?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type GetBookingQueryVariables = {
  id: string,
};

export type GetBookingQuery = {
  getBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type GetMessageQueryVariables = {
  id: string,
};

export type GetMessageQuery = {
  getMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type GetProviderQueryVariables = {
  id: string,
};

export type GetProviderQuery = {
  getProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type GetReviewQueryVariables = {
  id: string,
};

export type GetReviewQuery = {
  getReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type GetServiceQueryVariables = {
  id: string,
};

export type GetServiceQuery = {
  getService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type GetUserProfileQueryVariables = {
  id: string,
};

export type GetUserProfileQuery = {
  getUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type ListBookingsQueryVariables = {
  filter?: ModelBookingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListBookingsQuery = {
  listBookings?:  {
    __typename: "ModelBookingConnection",
    items:  Array< {
      __typename: "Booking",
      createdAt: string,
      customerEmail: string,
      id: string,
      notes?: string | null,
      owner?: string | null,
      providerEmail: string,
      scheduledDate: string,
      scheduledTime: string,
      serviceId: string,
      status?: BookingStatus | null,
      totalAmount: number,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListMessagesQueryVariables = {
  filter?: ModelMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListMessagesQuery = {
  listMessages?:  {
    __typename: "ModelMessageConnection",
    items:  Array< {
      __typename: "Message",
      bookingId?: string | null,
      content: string,
      conversationId: string,
      createdAt: string,
      id: string,
      owner?: string | null,
      read?: boolean | null,
      recipientEmail: string,
      senderEmail: string,
      serviceId?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListProvidersQueryVariables = {
  filter?: ModelProviderFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProvidersQuery = {
  listProviders?:  {
    __typename: "ModelProviderConnection",
    items:  Array< {
      __typename: "Provider",
      active?: boolean | null,
      address?: string | null,
      businessName?: string | null,
      city?: string | null,
      createdAt: string,
      email: string,
      firstName?: string | null,
      id: string,
      lastName?: string | null,
      owner?: string | null,
      phone?: string | null,
      state?: string | null,
      stripeAccountId?: string | null,
      stripeOnboardingComplete?: boolean | null,
      updatedAt: string,
      verificationStatus?: ProviderVerificationStatus | null,
      zipCode?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListReviewsQueryVariables = {
  filter?: ModelReviewFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListReviewsQuery = {
  listReviews?:  {
    __typename: "ModelReviewConnection",
    items:  Array< {
      __typename: "Review",
      bookingId: string,
      comment?: string | null,
      createdAt?: string | null,
      customerEmail: string,
      id: string,
      owner?: string | null,
      providerEmail: string,
      providerResponse?: string | null,
      rating: number,
      serviceId: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListServicesQueryVariables = {
  filter?: ModelServiceFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListServicesQuery = {
  listServices?:  {
    __typename: "ModelServiceConnection",
    items:  Array< {
      __typename: "Service",
      active?: boolean | null,
      category?: string | null,
      createdAt: string,
      description: string,
      duration?: number | null,
      id: string,
      owner?: string | null,
      price: number,
      providerEmail?: string | null,
      providerName?: string | null,
      title: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListUserProfilesQueryVariables = {
  filter?: ModelUserProfileFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUserProfilesQuery = {
  listUserProfiles?:  {
    __typename: "ModelUserProfileConnection",
    items:  Array< {
      __typename: "UserProfile",
      city?: string | null,
      createdAt: string,
      email: string,
      firstName?: string | null,
      id: string,
      lastName?: string | null,
      owner?: string | null,
      phone?: string | null,
      profilePicture?: string | null,
      role?: UserProfileRole | null,
      state?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateBookingMutationVariables = {
  condition?: ModelBookingConditionInput | null,
  input: CreateBookingInput,
};

export type CreateBookingMutation = {
  createBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type CreateMessageMutationVariables = {
  condition?: ModelMessageConditionInput | null,
  input: CreateMessageInput,
};

export type CreateMessageMutation = {
  createMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateProviderMutationVariables = {
  condition?: ModelProviderConditionInput | null,
  input: CreateProviderInput,
};

export type CreateProviderMutation = {
  createProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type CreateReviewMutationVariables = {
  condition?: ModelReviewConditionInput | null,
  input: CreateReviewInput,
};

export type CreateReviewMutation = {
  createReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type CreateServiceMutationVariables = {
  condition?: ModelServiceConditionInput | null,
  input: CreateServiceInput,
};

export type CreateServiceMutation = {
  createService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type CreateUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: CreateUserProfileInput,
};

export type CreateUserProfileMutation = {
  createUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteBookingMutationVariables = {
  condition?: ModelBookingConditionInput | null,
  input: DeleteBookingInput,
};

export type DeleteBookingMutation = {
  deleteBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type DeleteMessageMutationVariables = {
  condition?: ModelMessageConditionInput | null,
  input: DeleteMessageInput,
};

export type DeleteMessageMutation = {
  deleteMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteProviderMutationVariables = {
  condition?: ModelProviderConditionInput | null,
  input: DeleteProviderInput,
};

export type DeleteProviderMutation = {
  deleteProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type DeleteReviewMutationVariables = {
  condition?: ModelReviewConditionInput | null,
  input: DeleteReviewInput,
};

export type DeleteReviewMutation = {
  deleteReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type DeleteServiceMutationVariables = {
  condition?: ModelServiceConditionInput | null,
  input: DeleteServiceInput,
};

export type DeleteServiceMutation = {
  deleteService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type DeleteUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: DeleteUserProfileInput,
};

export type DeleteUserProfileMutation = {
  deleteUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateBookingMutationVariables = {
  condition?: ModelBookingConditionInput | null,
  input: UpdateBookingInput,
};

export type UpdateBookingMutation = {
  updateBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type UpdateMessageMutationVariables = {
  condition?: ModelMessageConditionInput | null,
  input: UpdateMessageInput,
};

export type UpdateMessageMutation = {
  updateMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateProviderMutationVariables = {
  condition?: ModelProviderConditionInput | null,
  input: UpdateProviderInput,
};

export type UpdateProviderMutation = {
  updateProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type UpdateReviewMutationVariables = {
  condition?: ModelReviewConditionInput | null,
  input: UpdateReviewInput,
};

export type UpdateReviewMutation = {
  updateReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type UpdateServiceMutationVariables = {
  condition?: ModelServiceConditionInput | null,
  input: UpdateServiceInput,
};

export type UpdateServiceMutation = {
  updateService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type UpdateUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: UpdateUserProfileInput,
};

export type UpdateUserProfileMutation = {
  updateUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateBookingSubscriptionVariables = {
  filter?: ModelSubscriptionBookingFilterInput | null,
  owner?: string | null,
};

export type OnCreateBookingSubscription = {
  onCreateBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type OnCreateMessageSubscriptionVariables = {
  filter?: ModelSubscriptionMessageFilterInput | null,
  owner?: string | null,
};

export type OnCreateMessageSubscription = {
  onCreateMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnCreateProviderSubscription = {
  onCreateProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type OnCreateReviewSubscriptionVariables = {
  filter?: ModelSubscriptionReviewFilterInput | null,
  owner?: string | null,
};

export type OnCreateReviewSubscription = {
  onCreateReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type OnCreateServiceSubscriptionVariables = {
  filter?: ModelSubscriptionServiceFilterInput | null,
  owner?: string | null,
};

export type OnCreateServiceSubscription = {
  onCreateService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type OnCreateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnCreateUserProfileSubscription = {
  onCreateUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteBookingSubscriptionVariables = {
  filter?: ModelSubscriptionBookingFilterInput | null,
  owner?: string | null,
};

export type OnDeleteBookingSubscription = {
  onDeleteBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type OnDeleteMessageSubscriptionVariables = {
  filter?: ModelSubscriptionMessageFilterInput | null,
  owner?: string | null,
};

export type OnDeleteMessageSubscription = {
  onDeleteMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnDeleteProviderSubscription = {
  onDeleteProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type OnDeleteReviewSubscriptionVariables = {
  filter?: ModelSubscriptionReviewFilterInput | null,
  owner?: string | null,
};

export type OnDeleteReviewSubscription = {
  onDeleteReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteServiceSubscriptionVariables = {
  filter?: ModelSubscriptionServiceFilterInput | null,
  owner?: string | null,
};

export type OnDeleteServiceSubscription = {
  onDeleteService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnDeleteUserProfileSubscription = {
  onDeleteUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateBookingSubscriptionVariables = {
  filter?: ModelSubscriptionBookingFilterInput | null,
  owner?: string | null,
};

export type OnUpdateBookingSubscription = {
  onUpdateBooking?:  {
    __typename: "Booking",
    createdAt: string,
    customerEmail: string,
    id: string,
    notes?: string | null,
    owner?: string | null,
    providerEmail: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceId: string,
    status?: BookingStatus | null,
    totalAmount: number,
    updatedAt: string,
  } | null,
};

export type OnUpdateMessageSubscriptionVariables = {
  filter?: ModelSubscriptionMessageFilterInput | null,
  owner?: string | null,
};

export type OnUpdateMessageSubscription = {
  onUpdateMessage?:  {
    __typename: "Message",
    bookingId?: string | null,
    content: string,
    conversationId: string,
    createdAt: string,
    id: string,
    owner?: string | null,
    read?: boolean | null,
    recipientEmail: string,
    senderEmail: string,
    serviceId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnUpdateProviderSubscription = {
  onUpdateProvider?:  {
    __typename: "Provider",
    active?: boolean | null,
    address?: string | null,
    businessName?: string | null,
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    state?: string | null,
    stripeAccountId?: string | null,
    stripeOnboardingComplete?: boolean | null,
    updatedAt: string,
    verificationStatus?: ProviderVerificationStatus | null,
    zipCode?: string | null,
  } | null,
};

export type OnUpdateReviewSubscriptionVariables = {
  filter?: ModelSubscriptionReviewFilterInput | null,
  owner?: string | null,
};

export type OnUpdateReviewSubscription = {
  onUpdateReview?:  {
    __typename: "Review",
    bookingId: string,
    comment?: string | null,
    createdAt?: string | null,
    customerEmail: string,
    id: string,
    owner?: string | null,
    providerEmail: string,
    providerResponse?: string | null,
    rating: number,
    serviceId: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateServiceSubscriptionVariables = {
  filter?: ModelSubscriptionServiceFilterInput | null,
  owner?: string | null,
};

export type OnUpdateServiceSubscription = {
  onUpdateService?:  {
    __typename: "Service",
    active?: boolean | null,
    category?: string | null,
    createdAt: string,
    description: string,
    duration?: number | null,
    id: string,
    owner?: string | null,
    price: number,
    providerEmail?: string | null,
    providerName?: string | null,
    title: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnUpdateUserProfileSubscription = {
  onUpdateUserProfile?:  {
    __typename: "UserProfile",
    city?: string | null,
    createdAt: string,
    email: string,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    phone?: string | null,
    profilePicture?: string | null,
    role?: UserProfileRole | null,
    state?: string | null,
    updatedAt: string,
  } | null,
};

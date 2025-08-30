/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createBooking = /* GraphQL */ `mutation CreateBooking(
  $condition: ModelBookingConditionInput
  $input: CreateBookingInput!
) {
  createBooking(condition: $condition, input: $input) {
    createdAt
    customerEmail
    id
    notes
    owner
    providerEmail
    scheduledDate
    scheduledTime
    serviceId
    status
    totalAmount
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateBookingMutationVariables,
  APITypes.CreateBookingMutation
>;
export const createMessage = /* GraphQL */ `mutation CreateMessage(
  $condition: ModelMessageConditionInput
  $input: CreateMessageInput!
) {
  createMessage(condition: $condition, input: $input) {
    bookingId
    content
    conversationId
    createdAt
    id
    owner
    read
    recipientEmail
    senderEmail
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateMessageMutationVariables,
  APITypes.CreateMessageMutation
>;
export const createProvider = /* GraphQL */ `mutation CreateProvider(
  $condition: ModelProviderConditionInput
  $input: CreateProviderInput!
) {
  createProvider(condition: $condition, input: $input) {
    active
    address
    businessName
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    state
    stripeAccountId
    stripeOnboardingComplete
    updatedAt
    verificationStatus
    zipCode
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateProviderMutationVariables,
  APITypes.CreateProviderMutation
>;
export const createReview = /* GraphQL */ `mutation CreateReview(
  $condition: ModelReviewConditionInput
  $input: CreateReviewInput!
) {
  createReview(condition: $condition, input: $input) {
    bookingId
    comment
    createdAt
    customerEmail
    id
    owner
    providerEmail
    providerResponse
    rating
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateReviewMutationVariables,
  APITypes.CreateReviewMutation
>;
export const createService = /* GraphQL */ `mutation CreateService(
  $condition: ModelServiceConditionInput
  $input: CreateServiceInput!
) {
  createService(condition: $condition, input: $input) {
    active
    category
    createdAt
    description
    duration
    id
    owner
    price
    providerEmail
    providerName
    title
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateServiceMutationVariables,
  APITypes.CreateServiceMutation
>;
export const createUserProfile = /* GraphQL */ `mutation CreateUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: CreateUserProfileInput!
) {
  createUserProfile(condition: $condition, input: $input) {
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    profilePicture
    role
    state
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUserProfileMutationVariables,
  APITypes.CreateUserProfileMutation
>;
export const deleteBooking = /* GraphQL */ `mutation DeleteBooking(
  $condition: ModelBookingConditionInput
  $input: DeleteBookingInput!
) {
  deleteBooking(condition: $condition, input: $input) {
    createdAt
    customerEmail
    id
    notes
    owner
    providerEmail
    scheduledDate
    scheduledTime
    serviceId
    status
    totalAmount
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteBookingMutationVariables,
  APITypes.DeleteBookingMutation
>;
export const deleteMessage = /* GraphQL */ `mutation DeleteMessage(
  $condition: ModelMessageConditionInput
  $input: DeleteMessageInput!
) {
  deleteMessage(condition: $condition, input: $input) {
    bookingId
    content
    conversationId
    createdAt
    id
    owner
    read
    recipientEmail
    senderEmail
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteMessageMutationVariables,
  APITypes.DeleteMessageMutation
>;
export const deleteProvider = /* GraphQL */ `mutation DeleteProvider(
  $condition: ModelProviderConditionInput
  $input: DeleteProviderInput!
) {
  deleteProvider(condition: $condition, input: $input) {
    active
    address
    businessName
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    state
    stripeAccountId
    stripeOnboardingComplete
    updatedAt
    verificationStatus
    zipCode
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteProviderMutationVariables,
  APITypes.DeleteProviderMutation
>;
export const deleteReview = /* GraphQL */ `mutation DeleteReview(
  $condition: ModelReviewConditionInput
  $input: DeleteReviewInput!
) {
  deleteReview(condition: $condition, input: $input) {
    bookingId
    comment
    createdAt
    customerEmail
    id
    owner
    providerEmail
    providerResponse
    rating
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteReviewMutationVariables,
  APITypes.DeleteReviewMutation
>;
export const deleteService = /* GraphQL */ `mutation DeleteService(
  $condition: ModelServiceConditionInput
  $input: DeleteServiceInput!
) {
  deleteService(condition: $condition, input: $input) {
    active
    category
    createdAt
    description
    duration
    id
    owner
    price
    providerEmail
    providerName
    title
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteServiceMutationVariables,
  APITypes.DeleteServiceMutation
>;
export const deleteUserProfile = /* GraphQL */ `mutation DeleteUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: DeleteUserProfileInput!
) {
  deleteUserProfile(condition: $condition, input: $input) {
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    profilePicture
    role
    state
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUserProfileMutationVariables,
  APITypes.DeleteUserProfileMutation
>;
export const updateBooking = /* GraphQL */ `mutation UpdateBooking(
  $condition: ModelBookingConditionInput
  $input: UpdateBookingInput!
) {
  updateBooking(condition: $condition, input: $input) {
    createdAt
    customerEmail
    id
    notes
    owner
    providerEmail
    scheduledDate
    scheduledTime
    serviceId
    status
    totalAmount
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateBookingMutationVariables,
  APITypes.UpdateBookingMutation
>;
export const updateMessage = /* GraphQL */ `mutation UpdateMessage(
  $condition: ModelMessageConditionInput
  $input: UpdateMessageInput!
) {
  updateMessage(condition: $condition, input: $input) {
    bookingId
    content
    conversationId
    createdAt
    id
    owner
    read
    recipientEmail
    senderEmail
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateMessageMutationVariables,
  APITypes.UpdateMessageMutation
>;
export const updateProvider = /* GraphQL */ `mutation UpdateProvider(
  $condition: ModelProviderConditionInput
  $input: UpdateProviderInput!
) {
  updateProvider(condition: $condition, input: $input) {
    active
    address
    businessName
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    state
    stripeAccountId
    stripeOnboardingComplete
    updatedAt
    verificationStatus
    zipCode
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateProviderMutationVariables,
  APITypes.UpdateProviderMutation
>;
export const updateReview = /* GraphQL */ `mutation UpdateReview(
  $condition: ModelReviewConditionInput
  $input: UpdateReviewInput!
) {
  updateReview(condition: $condition, input: $input) {
    bookingId
    comment
    createdAt
    customerEmail
    id
    owner
    providerEmail
    providerResponse
    rating
    serviceId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateReviewMutationVariables,
  APITypes.UpdateReviewMutation
>;
export const updateService = /* GraphQL */ `mutation UpdateService(
  $condition: ModelServiceConditionInput
  $input: UpdateServiceInput!
) {
  updateService(condition: $condition, input: $input) {
    active
    category
    createdAt
    description
    duration
    id
    owner
    price
    providerEmail
    providerName
    title
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateServiceMutationVariables,
  APITypes.UpdateServiceMutation
>;
export const updateUserProfile = /* GraphQL */ `mutation UpdateUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: UpdateUserProfileInput!
) {
  updateUserProfile(condition: $condition, input: $input) {
    city
    createdAt
    email
    firstName
    id
    lastName
    owner
    phone
    profilePicture
    role
    state
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUserProfileMutationVariables,
  APITypes.UpdateUserProfileMutation
>;

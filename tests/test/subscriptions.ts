/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateBooking = /* GraphQL */ `subscription OnCreateBooking(
  $filter: ModelSubscriptionBookingFilterInput
  $owner: String
) {
  onCreateBooking(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateBookingSubscriptionVariables,
  APITypes.OnCreateBookingSubscription
>;
export const onCreateMessage = /* GraphQL */ `subscription OnCreateMessage(
  $filter: ModelSubscriptionMessageFilterInput
  $owner: String
) {
  onCreateMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateMessageSubscriptionVariables,
  APITypes.OnCreateMessageSubscription
>;
export const onCreateProvider = /* GraphQL */ `subscription OnCreateProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onCreateProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProviderSubscriptionVariables,
  APITypes.OnCreateProviderSubscription
>;
export const onCreateReview = /* GraphQL */ `subscription OnCreateReview(
  $filter: ModelSubscriptionReviewFilterInput
  $owner: String
) {
  onCreateReview(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateReviewSubscriptionVariables,
  APITypes.OnCreateReviewSubscription
>;
export const onCreateService = /* GraphQL */ `subscription OnCreateService(
  $filter: ModelSubscriptionServiceFilterInput
  $owner: String
) {
  onCreateService(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateServiceSubscriptionVariables,
  APITypes.OnCreateServiceSubscription
>;
export const onCreateUserProfile = /* GraphQL */ `subscription OnCreateUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
  $owner: String
) {
  onCreateUserProfile(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserProfileSubscriptionVariables,
  APITypes.OnCreateUserProfileSubscription
>;
export const onDeleteBooking = /* GraphQL */ `subscription OnDeleteBooking(
  $filter: ModelSubscriptionBookingFilterInput
  $owner: String
) {
  onDeleteBooking(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteBookingSubscriptionVariables,
  APITypes.OnDeleteBookingSubscription
>;
export const onDeleteMessage = /* GraphQL */ `subscription OnDeleteMessage(
  $filter: ModelSubscriptionMessageFilterInput
  $owner: String
) {
  onDeleteMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteMessageSubscriptionVariables,
  APITypes.OnDeleteMessageSubscription
>;
export const onDeleteProvider = /* GraphQL */ `subscription OnDeleteProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onDeleteProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProviderSubscriptionVariables,
  APITypes.OnDeleteProviderSubscription
>;
export const onDeleteReview = /* GraphQL */ `subscription OnDeleteReview(
  $filter: ModelSubscriptionReviewFilterInput
  $owner: String
) {
  onDeleteReview(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteReviewSubscriptionVariables,
  APITypes.OnDeleteReviewSubscription
>;
export const onDeleteService = /* GraphQL */ `subscription OnDeleteService(
  $filter: ModelSubscriptionServiceFilterInput
  $owner: String
) {
  onDeleteService(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteServiceSubscriptionVariables,
  APITypes.OnDeleteServiceSubscription
>;
export const onDeleteUserProfile = /* GraphQL */ `subscription OnDeleteUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
  $owner: String
) {
  onDeleteUserProfile(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserProfileSubscriptionVariables,
  APITypes.OnDeleteUserProfileSubscription
>;
export const onUpdateBooking = /* GraphQL */ `subscription OnUpdateBooking(
  $filter: ModelSubscriptionBookingFilterInput
  $owner: String
) {
  onUpdateBooking(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateBookingSubscriptionVariables,
  APITypes.OnUpdateBookingSubscription
>;
export const onUpdateMessage = /* GraphQL */ `subscription OnUpdateMessage(
  $filter: ModelSubscriptionMessageFilterInput
  $owner: String
) {
  onUpdateMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateMessageSubscriptionVariables,
  APITypes.OnUpdateMessageSubscription
>;
export const onUpdateProvider = /* GraphQL */ `subscription OnUpdateProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onUpdateProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProviderSubscriptionVariables,
  APITypes.OnUpdateProviderSubscription
>;
export const onUpdateReview = /* GraphQL */ `subscription OnUpdateReview(
  $filter: ModelSubscriptionReviewFilterInput
  $owner: String
) {
  onUpdateReview(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateReviewSubscriptionVariables,
  APITypes.OnUpdateReviewSubscription
>;
export const onUpdateService = /* GraphQL */ `subscription OnUpdateService(
  $filter: ModelSubscriptionServiceFilterInput
  $owner: String
) {
  onUpdateService(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateServiceSubscriptionVariables,
  APITypes.OnUpdateServiceSubscription
>;
export const onUpdateUserProfile = /* GraphQL */ `subscription OnUpdateUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
  $owner: String
) {
  onUpdateUserProfile(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserProfileSubscriptionVariables,
  APITypes.OnUpdateUserProfileSubscription
>;

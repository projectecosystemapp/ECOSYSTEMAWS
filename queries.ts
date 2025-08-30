/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getBooking = /* GraphQL */ `query GetBooking($id: ID!) {
  getBooking(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetBookingQueryVariables,
  APITypes.GetBookingQuery
>;
export const getMessage = /* GraphQL */ `query GetMessage($id: ID!) {
  getMessage(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetMessageQueryVariables,
  APITypes.GetMessageQuery
>;
export const getProvider = /* GraphQL */ `query GetProvider($id: ID!) {
  getProvider(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetProviderQueryVariables,
  APITypes.GetProviderQuery
>;
export const getReview = /* GraphQL */ `query GetReview($id: ID!) {
  getReview(id: $id) {
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
` as GeneratedQuery<APITypes.GetReviewQueryVariables, APITypes.GetReviewQuery>;
export const getService = /* GraphQL */ `query GetService($id: ID!) {
  getService(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetServiceQueryVariables,
  APITypes.GetServiceQuery
>;
export const getUserProfile = /* GraphQL */ `query GetUserProfile($id: ID!) {
  getUserProfile(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetUserProfileQueryVariables,
  APITypes.GetUserProfileQuery
>;
export const listBookings = /* GraphQL */ `query ListBookings(
  $filter: ModelBookingFilterInput
  $limit: Int
  $nextToken: String
) {
  listBookings(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListBookingsQueryVariables,
  APITypes.ListBookingsQuery
>;
export const listMessages = /* GraphQL */ `query ListMessages(
  $filter: ModelMessageFilterInput
  $limit: Int
  $nextToken: String
) {
  listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMessagesQueryVariables,
  APITypes.ListMessagesQuery
>;
export const listProviders = /* GraphQL */ `query ListProviders(
  $filter: ModelProviderFilterInput
  $limit: Int
  $nextToken: String
) {
  listProviders(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProvidersQueryVariables,
  APITypes.ListProvidersQuery
>;
export const listReviews = /* GraphQL */ `query ListReviews(
  $filter: ModelReviewFilterInput
  $limit: Int
  $nextToken: String
) {
  listReviews(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListReviewsQueryVariables,
  APITypes.ListReviewsQuery
>;
export const listServices = /* GraphQL */ `query ListServices(
  $filter: ModelServiceFilterInput
  $limit: Int
  $nextToken: String
) {
  listServices(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListServicesQueryVariables,
  APITypes.ListServicesQuery
>;
export const listUserProfiles = /* GraphQL */ `query ListUserProfiles(
  $filter: ModelUserProfileFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserProfilesQueryVariables,
  APITypes.ListUserProfilesQuery
>;

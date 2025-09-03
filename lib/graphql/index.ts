import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";
import { initSchema } from "@aws-amplify/datastore";

import { schema } from "./schema";

export enum EcosystemMarketplaceRole {
  CUSTOMER = "customer",
  PROVIDER = "provider"
}

type EagerEcosystemMarketplaceModel = {
  readonly [__modelMeta__]: {
    identifier: CompositeIdentifier<EcosystemMarketplace, ['pk', 'sk']>;
  };
  readonly pk: string;
  readonly sk: string;
  readonly entityType: string;
  readonly gsi1pk?: string | null;
  readonly gsi1sk?: string | null;
  readonly gsi2pk?: string | null;
  readonly gsi2sk?: string | null;
  readonly gsi3pk?: string | null;
  readonly gsi3sk?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly slug?: string | null;
  readonly status?: string | null;
  readonly role?: EcosystemMarketplaceRole | keyof typeof EcosystemMarketplaceRole | null;
  readonly stripeAccountId?: string | null;
  readonly stripeAccountStatus?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly price?: number | null;
  readonly duration?: number | null;
  readonly category?: string | null;
  readonly providerId?: string | null;
  readonly serviceId?: string | null;
  readonly customerId?: string | null;
  readonly customerEmail?: string | null;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly amount?: number | null;
  readonly platformFee?: number | null;
  readonly guestSurcharge?: number | null;
  readonly paymentIntentId?: string | null;
  readonly refundAmount?: number | null;
  readonly metadata?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyEcosystemMarketplaceModel = {
  readonly [__modelMeta__]: {
    identifier: CompositeIdentifier<EcosystemMarketplace, ['pk', 'sk']>;
  };
  readonly pk: string;
  readonly sk: string;
  readonly entityType: string;
  readonly gsi1pk?: string | null;
  readonly gsi1sk?: string | null;
  readonly gsi2pk?: string | null;
  readonly gsi2sk?: string | null;
  readonly gsi3pk?: string | null;
  readonly gsi3sk?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly slug?: string | null;
  readonly status?: string | null;
  readonly role?: EcosystemMarketplaceRole | keyof typeof EcosystemMarketplaceRole | null;
  readonly stripeAccountId?: string | null;
  readonly stripeAccountStatus?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly price?: number | null;
  readonly duration?: number | null;
  readonly category?: string | null;
  readonly providerId?: string | null;
  readonly serviceId?: string | null;
  readonly customerId?: string | null;
  readonly customerEmail?: string | null;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly amount?: number | null;
  readonly platformFee?: number | null;
  readonly guestSurcharge?: number | null;
  readonly paymentIntentId?: string | null;
  readonly refundAmount?: number | null;
  readonly metadata?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type EcosystemMarketplaceModel = LazyLoading extends LazyLoadingDisabled ? EagerEcosystemMarketplaceModel : LazyEcosystemMarketplaceModel

export declare const EcosystemMarketplaceModel: (new (init: ModelInit<EcosystemMarketplaceModel>) => EcosystemMarketplaceModel) & {
  copyOf(source: EcosystemMarketplaceModel, mutator: (draft: MutableModel<EcosystemMarketplaceModel>) => MutableModel<EcosystemMarketplaceModel> | void): EcosystemMarketplaceModel;
}



const { EcosystemMarketplace } = initSchema(schema) as {
  EcosystemMarketplace: PersistentModelConstructor<EcosystemMarketplaceModel>;
};

export {
  EcosystemMarketplace
};
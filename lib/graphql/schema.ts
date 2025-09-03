import { Schema } from "@aws-amplify/datastore";

export const schema: Schema = {
    "models": {
        "EcosystemMarketplace": {
            "name": "EcosystemMarketplace",
            "fields": {
                "pk": {
                    "name": "pk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "sk": {
                    "name": "sk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "entityType": {
                    "name": "entityType",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "gsi1pk": {
                    "name": "gsi1pk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "gsi1sk": {
                    "name": "gsi1sk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "gsi2pk": {
                    "name": "gsi2pk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "gsi2sk": {
                    "name": "gsi2sk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "gsi3pk": {
                    "name": "gsi3pk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "gsi3sk": {
                    "name": "gsi3sk",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "name": {
                    "name": "name",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "email": {
                    "name": "email",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "slug": {
                    "name": "slug",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "status": {
                    "name": "status",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "role": {
                    "name": "role",
                    "isArray": false,
                    "type": {
                        "enum": "EcosystemMarketplaceRole"
                    },
                    "isRequired": false,
                    "attributes": []
                },
                "stripeAccountId": {
                    "name": "stripeAccountId",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "stripeAccountStatus": {
                    "name": "stripeAccountStatus",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "title": {
                    "name": "title",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "description": {
                    "name": "description",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "price": {
                    "name": "price",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "duration": {
                    "name": "duration",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "category": {
                    "name": "category",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "providerId": {
                    "name": "providerId",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "serviceId": {
                    "name": "serviceId",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "customerId": {
                    "name": "customerId",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "customerEmail": {
                    "name": "customerEmail",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "startAt": {
                    "name": "startAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": false,
                    "attributes": []
                },
                "endAt": {
                    "name": "endAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": false,
                    "attributes": []
                },
                "amount": {
                    "name": "amount",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "platformFee": {
                    "name": "platformFee",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "guestSurcharge": {
                    "name": "guestSurcharge",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "paymentIntentId": {
                    "name": "paymentIntentId",
                    "isArray": false,
                    "type": "String",
                    "isRequired": false,
                    "attributes": []
                },
                "refundAmount": {
                    "name": "refundAmount",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": false,
                    "attributes": []
                },
                "metadata": {
                    "name": "metadata",
                    "isArray": false,
                    "type": "AWSJSON",
                    "isRequired": false,
                    "attributes": []
                },
                "createdAt": {
                    "name": "createdAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": false,
                    "attributes": []
                },
                "updatedAt": {
                    "name": "updatedAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": false,
                    "attributes": []
                }
            },
            "syncable": true,
            "pluralName": "EcosystemMarketplaces",
            "attributes": [
                {
                    "type": "model",
                    "properties": {}
                },
                {
                    "type": "key",
                    "properties": {
                        "fields": [
                            "pk",
                            "sk"
                        ]
                    }
                },
                {
                    "type": "key",
                    "properties": {
                        "name": "GSI1",
                        "queryField": "listEcosystemMarketplaceByGsi1pkAndGsi1sk",
                        "fields": [
                            "gsi1pk",
                            "gsi1sk"
                        ]
                    }
                },
                {
                    "type": "key",
                    "properties": {
                        "name": "GSI2",
                        "queryField": "listEcosystemMarketplaceByGsi2pkAndGsi2sk",
                        "fields": [
                            "gsi2pk",
                            "gsi2sk"
                        ]
                    }
                },
                {
                    "type": "key",
                    "properties": {
                        "name": "GSI3",
                        "queryField": "listEcosystemMarketplaceByGsi3pkAndGsi3sk",
                        "fields": [
                            "gsi3pk",
                            "gsi3sk"
                        ]
                    }
                },
                {
                    "type": "auth",
                    "properties": {
                        "rules": [
                            {
                                "allow": "private",
                                "operations": [
                                    "create",
                                    "update",
                                    "delete",
                                    "read"
                                ]
                            },
                            {
                                "allow": "public",
                                "provider": "iam",
                                "operations": [
                                    "read"
                                ]
                            }
                        ]
                    }
                }
            ]
        }
    },
    "enums": {
        "EcosystemMarketplaceRole": {
            "name": "EcosystemMarketplaceRole",
            "values": [
                "customer",
                "provider"
            ]
        }
    },
    "nonModels": {},
    "codegenVersion": "3.4.4",
    "version": "fb7df755b32ad102b7b11d8f3ea0a2e6"
};
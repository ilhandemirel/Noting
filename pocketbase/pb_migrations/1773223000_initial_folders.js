/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_1868868837",
    "name": "folders",
    "type": "base",
    "system": false,
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "system": true,
        "required": true,
        "presentable": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}"
      },
      {
        "id": "text1579384326",
        "name": "name",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": false
      },
      {
        "id": "relation2809058197",
        "name": "user_id",
        "type": "relation",
        "system": false,
        "required": true,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "maxSelect": 1
      },
      {
        "id": "autodate2341372968",
        "name": "created_at",
        "type": "autodate",
        "system": false,
        "required": false,
        "presentable": false,
        "onCreate": true,
        "onUpdate": false
      },
      {
        "id": "autodate1130519967",
        "name": "updated_at",
        "type": "autodate",
        "system": false,
        "required": false,
        "presentable": false,
        "onCreate": true,
        "onUpdate": true
      }
    ],
    "listRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id = user_id",
    "deleteRule": "@request.auth.id = user_id",
    "indexes": []
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1868868837");
  return app.delete(collection);
})

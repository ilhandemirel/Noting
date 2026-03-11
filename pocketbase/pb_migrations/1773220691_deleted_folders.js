/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1868868837");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id = user_id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation2809058197",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "autodate2341372968",
        "name": "created_at",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate1130519967",
        "name": "updated_at",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1868868837",
    "indexes": [],
    "listRule": "@request.auth.id = user_id",
    "name": "folders",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id"
  });

  return app.save(collection);
})

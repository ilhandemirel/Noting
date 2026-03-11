/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_3395098727",
    "name": "notes",
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
        "id": "text724990059",
        "name": "title",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": false
      },
      {
        "id": "json4274335913",
        "name": "content",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false
      },
      {
        "id": "date3177376595",
        "name": "reminder_date",
        "type": "date",
        "system": false,
        "required": false,
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
  const collection = app.findCollectionByNameOrId("pbc_3395098727");
  return app.delete(collection);
})

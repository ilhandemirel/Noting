const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

async function setup() {
    try {
        console.log('Creating admin account...');
        try {
            await pb.collection('_superusers').create({
                email: 'admin@noting.com',
                password: 'admin-password-1234',
                passwordConfirm: 'admin-password-1234',
            });
        } catch (e) {
            console.log('Admin may already exist.');
        }

        console.log('Authenticating as admin...');
        await pb.collection('_superusers').authWithPassword('admin@noting.com', 'admin-password-1234');

        console.log('Fetching users collection to set default API rules...');
        const usersCollection = await pb.collections.getOne('users');
        usersCollection.listRule = 'id = @request.auth.id';
        usersCollection.viewRule = 'id = @request.auth.id';
        usersCollection.createRule = ''; // anyone can register
        usersCollection.updateRule = 'id = @request.auth.id';
        usersCollection.deleteRule = 'id = @request.auth.id';
        await pb.collections.update('users', usersCollection);

        console.log('Creating folders collection...');
        try {
            await pb.collections.create({
                name: 'folders',
                type: 'base',
                schema: [
                    { name: 'name', type: 'text', required: true }
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
            });
            console.log('Folders collection created.');
        } catch (e) {
            console.log('Folders collection may already exist.', e.message);
        }

        console.log('Creating notes collection...');
        try {
            await pb.collections.create({
                name: 'notes',
                type: 'base',
                schema: [
                    { name: 'title', type: 'text' },
                    { name: 'content', type: 'json' },
                    { name: 'folder_id', type: 'text' }
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
            });
            console.log('Notes collection created.');
        } catch (e) {
            console.log('Notes collection may already exist.', e.message);
        }

        console.log('Setup finished successfully!');
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setup();
